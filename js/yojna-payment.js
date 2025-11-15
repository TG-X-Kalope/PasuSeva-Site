async function logErrorToServer(source, errorMessage, stack) {
    const base_url = 'https://test-api.pasuseva.in';
    try {
        await fetch(`${base_url}/api/log-error`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source,
                errorMessage,
                stack,
                url: window.location.href,
                time: new Date().toISOString()
            })
        });
    } catch (loggingErr) {
        console.error("Error logging failed:", loggingErr);
    }
}

// ===============================
//  GLOBAL DYNAMIC ERROR POPUP
// ===============================

let popupCreated = false;

function createErrorPopup() {
    if (popupCreated) return;

    const overlay = document.createElement("div");
    overlay.id = "errorPopupOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "none";
    overlay.style.zIndex = "99999";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.width = "90%";
    box.style.maxWidth = "380px";
    box.style.borderRadius = "10px";
    box.style.padding = "20px";
    box.style.textAlign = "center";
    box.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";

    const title = document.createElement("h2");
    title.innerText = "त्रुटि";
    title.style.fontSize = "20px";
    title.style.marginBottom = "10px";
    title.style.color = "red";
    box.appendChild(title);

    const msg = document.createElement("p");
    msg.id = "errorPopupMessage";
    msg.style.fontSize = "16px";
    msg.style.marginBottom = "20px";
    msg.style.color = "#333";
    msg.style.lineHeight = "1.4";
    box.appendChild(msg);

    const btn = document.createElement("button");
    btn.innerText = "ठीक है";
    btn.style.background = "var(--pasuseva-orange, #f97316)";
    btn.style.color = "#fff";
    btn.style.padding = "10px 18px";
    btn.style.borderRadius = "6px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "16px";
    btn.onclick = () => {
        overlay.style.display = "none";
    };
    box.appendChild(btn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    popupCreated = true;
}

function showErrorPopup(message) {
    createErrorPopup();
    document.getElementById("errorPopupMessage").innerText = message;
    document.getElementById("errorPopupOverlay").style.display = "flex";
}

// ===============================
// YOJNA PAYMENT FUNCTION
// ===============================

async function yojnaPayment(e, yojna_name) {
    const base_url = 'https://test-api.pasuseva.in';

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
    let firstErrorMessage = "";

    for (const key in formData) {
        if (!formData[key]) {
            const msg = "यह फ़ील्ड अनिवार्य है";
            showError(key, msg);
            if (!firstErrorMessage) firstErrorMessage = `${key}: ${msg}`;
            hasError = true;
        }
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        const msg = "10 अंकों का वैध मोबाइल नंबर दर्ज करें";
        showError("phone", msg);
        if (!firstErrorMessage) firstErrorMessage = msg;
        hasError = true;
    }

    if (formData.email && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        const msg = "मान्य ईमेल आईडी दर्ज करें";
        showError("email", msg);
        if (!firstErrorMessage) firstErrorMessage = msg;
        hasError = true;
    }

    if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar)) {
        const msg = "12 अंकों का वैध आधार नंबर दर्ज करें";
        showError("aadhaar", msg);
        if (!firstErrorMessage) firstErrorMessage = msg;
        hasError = true;
    }

    for (const key in files) {
        const file = files[key];
        if (!file) {
            const msg = "फ़ाइल अपलोड करना अनिवार्य है";
            showError(key, msg);
            if (!firstErrorMessage) firstErrorMessage = `${key}: ${msg}`;
            hasError = true;
        } else if (file.size > 100 * 1024) {
            const msg = "फ़ाइल 100KB से अधिक नहीं होनी चाहिए";
            showError(key, msg);
            if (!firstErrorMessage) firstErrorMessage = `${key}: ${msg}`;
            hasError = true;
        }
    }

    if (hasError) {
        showErrorPopup(firstErrorMessage);
        return;
    }

    const uploadFile = async (file) => {
        const signResponse = await fetch(`${base_url}/api/yojna-registration/sign-upload?v=${Date.now()}`);
        const signData = await signResponse.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signData.api_key);
        formData.append("timestamp", signData.timestamp);
        formData.append("signature", signData.signature);
        formData.append("folder", "pasuseva/gaushala");

        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload?v=${Date.now()}`,
            { method: "POST", body: formData }
        );

        const uploadData = await uploadResponse.json();
        return uploadData.secure_url;
    };

    try {
        e.target.disabled = true;
        buttonText.textContent = 'आवेदन सबमिट किया जा रहा है...';
        spinner.classList.remove('hidden');

        const photoUrl = await uploadFile(files.photo);
        const aadhaarFrontUrl = await uploadFile(files.aadhaarFront);
        const aadhaarBackUrl = await uploadFile(files.aadhaarBack);
        const landDocsUrl = await uploadFile(files.landDocs);

        const regData = {
            ...formData,
            photo: photoUrl,
            aadhaarFront: aadhaarFrontUrl,
            aadhaarBack: aadhaarBackUrl,
            landDocs: landDocsUrl,
            yojna: yojna_name
        };

        const regRes = await fetch(`${base_url}/api/yojna-registration?v=${Date.now()}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(regData)
        });

        const regDataJson = await regRes.json();
        if (!regRes.ok || !regDataJson?.success) {
            throw new Error(JSON.stringify(regDataJson));
        }

        const reg = regDataJson?.data?.reg;
        if (!reg) throw new Error("Registration ID missing");

        const orderPayload = { currency: "INR", source: yojna_name, reg };

        const orderRes = await fetch(`${base_url}/api/payment/create-order?v=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const orderData = await orderRes.json();
        if (!orderData?.order?.id) {
            throw new Error(JSON.stringify(orderData));
        }

        const options = {
            key: "rzp_test_gF2PIyUYGRsN6q",
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
                    const verifyRes = await fetch(`${base_url}/api/payment/verify-payment?v=${Date.now()}`, {
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
                        throw new Error(JSON.stringify(verifyData));
                    }

                    await generateInvoicePDF(formData, verifyData);
                    window.location.replace("./payment_success.html");

                } catch (err) {
                    let msg = "";
                    let stack = "";

                    if (err instanceof Error) {
                        msg = err.message;
                        stack = err.stack || "";
                    } else if (typeof err === "string") {
                        msg = err;
                        stack = "String thrown";
                    } else {
                        try {
                            msg = JSON.stringify(err);
                        } catch {
                            msg = String(err);
                        }
                        stack = "Non-error object";
                    }

                    // LOG TO BACKEND
                    logErrorToServer("yojna-payment", msg, stack);

                    // SHOW POPUP
                    showErrorPopup(msg);
                }

            },

            modal: {
                ondismiss: function () {
                    showErrorPopup("आपका भुगतान रद्द कर दिया गया है।");
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

        rzp.on('payment.failed', function (response) {
            showErrorPopup(response.error.description);
        });

    } catch (err) {
        let msg = "";
        let stack = "";

        if (err instanceof Error) {
            msg = err.message;
            stack = err.stack || "";
        } else if (typeof err === "string") {
            msg = err;
            stack = "String thrown";
        } else {
            try {
                msg = JSON.stringify(err);
            } catch {
                msg = String(err);
            }
            stack = "Non-error object";
        }

        // LOG TO BACKEND
        logErrorToServer("yojna-payment", msg, stack);

        // SHOW POPUP
        showErrorPopup(msg);
    }
    finally {
        buttonText.textContent = 'आवेदन सबमिट करें (फॉर्म शुल्क: ₹1000)';
        spinner.classList.add('hidden');
        e.target.disabled = false;
    }
}
