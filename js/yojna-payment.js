async function yojnaPayment(e, amt, yojna_name, amt_word) {
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

    // Field validations
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

    // File validations: required + max size 100KB
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

        const orderPayload = new FormData();
        orderPayload.append("amount", amt); // Registration Fee
        orderPayload.append("currency", "INR");
        orderPayload.append("yojna", yojna_name);
        orderPayload.append("receipt", "gaushala_" + Date.now());

        for (const key in formData) orderPayload.append(key, formData[key]);
        for (const key in files) orderPayload.append(key, files[key]);

        const response = await fetch('https://api.pasuseva.in/api/payment/create-order', {
            method: 'POST',
            body: orderPayload
        });

        const data = await response.json();
        if (!data || !data.order) {
            alert("ऑर्डर बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
            throw new Error("Order creation failed");
        }

        const options = {
            key: "rzp_live_tTSBekr7vThQ9k", // ✅ Add your Razorpay key here
            amount: data.order.amount,
            currency: data.order.currency,
            name: "Pasuseva",
            description: `${yojna_name} Application`,
            order_id: data.order.id,
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
                        return window.location.reload();
                    }

                    await generateInvoicePDF(formData, verifyData, amt_word);
                    window.location.replace("./payment_success.html");

                } catch (error) {
                    alert("भुगतान के बाद सत्यापन में त्रुटि हुई। कृपया पुनः प्रयास करें।");
                    console.error("Payment verification error:", error);
                    window.location.reload();
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

        // Razorpay error handler
        rzp.on('payment.failed', function (response) {
            alert("भुगतान विफल रहा: " + response.error.description);
            window.location.reload();
        });

    } catch (err) {
        console.error("Error:", err);
        e.target.disabled = false;
        buttonText.textContent = 'आवेदन सबमिट करें (फॉर्म शुल्क: ₹1000)';
        spinner.classList.add('hidden');
        alert("भुगतान प्रक्रिया के दौरान त्रुटि हुई। कृपया पुनः प्रयास करें।");
        window.location.reload();
    }
}