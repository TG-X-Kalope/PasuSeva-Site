async function yojnaPayment(e, yojna_name) {
    e.preventDefault();

    const buttonText = document.querySelector('.button-text');
    const spinner = document.getElementById('loadingSpinner');
    const getValue = id => document.getElementById(id)?.value?.trim() || "";
    const getFile = id => document.getElementById(id)?.files?.[0] || null;

    const showError = (id, message) => {
        const input = document.getElementById(id);
        if (!input) return;
        let existingError = input.parentElement.querySelector('.input-error');
        if (!existingError) {
            const errorEl = document.createElement('p');
            errorEl.className = "input-error text-red-600 text-sm mt-1";
            errorEl.innerText = message;
            input.parentElement.appendChild(errorEl);
        } else {
            existingError.innerText = message;
        }
    };

    const clearErrors = () => {
        document.querySelectorAll('.input-error').forEach(el => el.remove());
    };

    clearErrors();

    const formData = {
        fullName: getValue('fullName'),
        fatherName: getValue('fatherName'),
        dob: getValue('dob'),
        phone: getValue('phone'),
        email: getValue('email'),
        address: getValue('address'),
        state: getValue('state'),
        district: getValue('district'),
        block: getValue('block'),
        aadhaar: getValue('aadhaar'),
    };

    const files = {
        photo: getFile('photo'),
        aadhaarFront: getFile('aadhaarFront'),
        aadhaarBack: getFile('aadhaarBack'),
        landDocs: getFile('landDocs')
    };

    let hasError = false;

    for (const key in formData) {
        if (!formData[key]) {
            showError(key, "यह फ़ील्ड अनिवार्य है");
            hasError = true;
        }
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        showError("phone", "10 अंकों का वैध मोबाइल नंबर दर्ज करें");
        hasError = true;
    }

    if (formData.email && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        showError("email", "मान्य ईमेल आईडी दर्ज करें");
        hasError = true;
    }

    if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar)) {
        showError("aadhaar", "12 अंकों का वैध आधार नंबर दर्ज करें");
        hasError = true;
    }


    for (const key in files) {
        const file = files[key];
        if (!file) {
            showError(key, "फ़ाइल अपलोड करना अनिवार्य है");
            hasError = true;
        } else if (file.size > 100 * 1024) {
            showError(key, "फ़ाइल 100KB से अधिक नहीं होनी चाहिए");
            hasError = true;
        }
    }

    if (hasError) return;

    try {
        e.target.disabled = true;
        buttonText.textContent = 'आवेदन सबमिट किया जा रहा है...';
        spinner.classList.remove('hidden');

        // 🔹 Step 1: Register Yojna Application
        const regForm = new FormData();
        for (const key in formData) regForm.append(key, formData[key]);
        for (const key in files) regForm.append(key, files[key]);
        regForm.append("yojna", yojna_name);

        const regRes = await fetch("https://api.pasuseva.in/api/yojna-registration", {
            method: "POST",
            body: regForm
        });

        const regData = await regRes.json();
        if (!regRes.ok || !regData?.success) {
            alert("पंजीकरण विफल रहा। कृपया पुनः प्रयास करें।");
            console.error("Registration error:", regData);
            throw new Error("Yojna registration failed");
        }

        const reg = regData?.data?.reg;
        if (!reg) throw new Error("Registration ID missing");

        // 🔹 Step 2: Create Razorpay Order
        const orderPayload = {

            currency: "INR",
            source: yojna_name,
            reg

        };

        const orderRes = await fetch('https://api.pasuseva.in/api/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const orderData = await orderRes.json();
        if (!orderData?.order?.id) {
            alert("ऑर्डर बनाने में त्रुटि हुई। कृपया बाद में प्रयास करें।");
            console.error("Order response:", orderData);
            throw new Error("Order creation failed");
        }

        // 🔹 Step 3: Razorpay Checkout
        const options = {
            key: "rzp_test_kOfu7jn9tzGbj4",
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: "Pasuseva",
            description: `${yojna_name} Application`,
            order_id: orderData.order.id,
            prefill: {
                name: formData.fullName,
                email: formData.email,
                contact: formData.phone
            },
            notes: {
                block: formData.block,
                state: formData.state
            },
            theme: { color: "#4CAF50" },
            handler: async function (response) {
                try {
                    const verifyRes = await fetch('https://api.pasuseva.in/api/payment/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        })
                    });

                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok || !verifyData.success) {
                        alert("भुगतान सत्यापन विफल रहा। कृपया सहायता टीम से संपर्क करें।");
                        return;
                    }

                    await generateInvoicePDF(formData, verifyData);
                    window.location.replace("./payment_success.html");
                } catch (error) {
                    alert("भुगतान के बाद सत्यापन में त्रुटि हुई।");
                    console.error("Payment verify error:", error);
                }
            },
            modal: {
                ondismiss: function () {
                    alert("आपका भुगतान रद्द कर दिया गया है।");
                    window.location.reload();
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

        rzp.on('payment.failed', function (response) {
            alert("भुगतान विफल रहा: " + response.error.description);
            console.error("Razorpay failed:", response.error);
            window.location.reload();
        });

    } catch (err) {
        console.error("Unexpected error:", err);
        alert("कुछ गलत हो गया। कृपया बाद में प्रयास करें।");
    } finally {
        buttonText.textContent = 'आवेदन सबमिट करें (फॉर्म शुल्क: ₹1000)';
        spinner.classList.add('hidden');
        e.target.disabled = false;
    }
}
