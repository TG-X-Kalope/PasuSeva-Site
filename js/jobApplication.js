
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#application-form form");
    const submitBtn = document.getElementById("payButton");
    let loading = false;

    const toggleLoading = (state) => {
        loading = state;
        submitBtn.innerHTML = state ? "प्रोसेस हो रहा है..." : "आवेदन सबमिट करें (फॉर्म शुल्क: ₹500)";
        submitBtn.disabled = state;
        submitBtn.classList.toggle("opacity-50", state);
        submitBtn.classList.toggle("cursor-not-allowed", state);
    };

    const showError = (id, message) => {
        const input = document.getElementById(id);
        if (!input) return;
        let existingError = input.parentElement.querySelector(".input-error");
        if (!existingError) {
            const errorEl = document.createElement("p");
            errorEl.className = "input-error text-red-600 text-sm mt-1";
            errorEl.innerText = message;
            input.parentElement.appendChild(errorEl);
        } else {
            existingError.innerText = message;
        }
    };

    const clearErrors = () => {
        document.querySelectorAll(".input-error").forEach(el => el.remove());
    };

    const validateForm = (formData) => {
        clearErrors();
        const required = [
            "position", "fullName", "fatherName", "dob", "phone", "email", "address",
            "state", "district", "block", "education", "percentage", "passYear", "aadhaar", "experience", "industry"
        ];
        let hasError = false;

        required.forEach(id => {
            const value = formData.get(id)?.trim();
            if (!value) {
                showError(id, "यह फ़ील्ड आवश्यक है");
                hasError = true;
            }
        });

        const phone = formData.get("phone")?.trim();
        if (phone && !/^\d{10}$/.test(phone)) {
            showError("phone", "10 अंकों का वैध मोबाइल नंबर दर्ज करें");
            hasError = true;
        }

        const email = formData.get("email")?.trim();
        if (email && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            showError("email", "मान्य ईमेल आईडी दर्ज करें");
            hasError = true;
        }

        const aadhaar = formData.get("aadhaar")?.trim();
        if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
            showError("aadhaar", "12 अंकों का वैध आधार नंबर दर्ज करें");
            hasError = true;
        }

        ["photo", "aadhaarFront", "aadhaarBack"].forEach(fileId => {
            const file = formData.get(fileId);
            if (!file || file.size === 0) {
                showError(fileId, "यह फ़ाइल आवश्यक है");
                hasError = true;
            } else if (file.size > 100 * 1024) {
                showError(fileId, "फ़ाइल का आकार 100KB से अधिक नहीं होना चाहिए");
                hasError = true;
            }
        });

        return !hasError;
    };

    submitBtn.addEventListener("click", async () => {
        if (loading) return;
        const formData = new FormData(form);
        if (!validateForm(formData)) return;

        toggleLoading(true);

        try {
            // Step 1: Create Job Application
            const jobRes = await fetch("https://api.pasuseva.in/api/job", {
                method: "POST",
                body: formData,
            });
            const jobData = await jobRes.json();

            if (!jobRes.ok || !jobData.data?._id) {
                console.error("Job creation failed:", jobData);
                alert("आवेदन दर्ज नहीं हो सका। कृपया पुनः प्रयास करें।");
                toggleLoading(false);
                return;
            }

            const reg = jobData.data.reg;

            // Step 2: Create Razorpay Order
            const orderPayload = {
                currency: "INR",
                source: "job application",
                reg
            };

            const orderRes = await fetch("https://api.pasuseva.in/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderPayload),
            });

            const orderData = await orderRes.json();

            if (!orderRes.ok || !orderData.order?.id) {
                console.error("Order creation failed:", orderData);
                alert("पेमेंट ऑर्डर बनाने में त्रुटि हुई।");
                toggleLoading(false);
                return;
            }

            // Step 3: Razorpay Payment Gateway
            const options = {
                key: "rzp_test_kOfu7jn9tzGbj4",
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: "Pasuseva",
                description: "Join Us Application Fee",
                order_id: orderData.order.id,
                prefill: {
                    name: formData.get("fullName"),
                    email: formData.get("email"),
                    contact: formData.get("phone")
                },
                notes: {
                    block: formData.get("block"),
                    state: formData.get("state")
                },
                theme: { color: "#4CAF50" },
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch("https://api.pasuseva.in/api/payment/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                from_where: "job"
                            }),
                        });

                        const verifyData = await verifyRes.json();

                        if (!verifyRes.ok || !verifyData.success) {
                            alert("भुगतान सत्यापन विफल रहा।");
                            return;
                        }

                        await generateInvoicePDF(formData, response, verifyData.reg);
                        alert("आवेदन सफलतापूर्वक सबमिट किया गया है!");
                        window.location.replace("./payment_success.html");
                    } catch (error) {
                        console.error("Verification Error:", error);
                        alert("भुगतान सत्यापन में त्रुटि हुई।");
                    }
                },
                modal: {
                    ondismiss: function () {
                        alert("आपका भुगतान रद्द कर दिया गया है।");
                        toggleLoading(false);
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("Unexpected Error:", err);
            alert("सर्वर से कनेक्ट नहीं हो सका। कृपया बाद में प्रयास करें।");
        } finally {
            toggleLoading(false);
        }
    });

});

// PDF Generation Function
async function generateInvoicePDF(formData, paymentResponse, reg) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("en-IN");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    const primaryColor = '#f5d225';
    const secondaryColor = '#97bc62';
    const accentColor = '#004b23';
    const lightColor = '#f8f9fa';
    const borderColor = '#e0e0e0';

    const logoDataUrl = await toDataURL('./assets/Logo-02.png');

    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.addImage(logoDataUrl, 'JPEG', (pageWidth - 30) / 2, 5, 30, 30);

    doc.setFontSize(14);
    doc.setTextColor(44, 95, 45);
    doc.setFont("helvetica", "bold");
    doc.text("Join Us Application", pageWidth / 2, 39, { align: 'center' });
    doc.text(`Application: ${reg}`, margin, 50);

    let yPos = 60;
    const drawSectionHeader = (text, y) => {
        doc.setFillColor(lightColor);
        doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin + 5, y + 6);
        doc.setDrawColor(borderColor);
        doc.line(margin, y + 8, pageWidth - margin, y + 8);
    };

    drawSectionHeader("PERSONAL DETAILS", yPos);
    yPos += 12;

    const personalDetails = [
        { label: "Full Name:", value: formData.get("fullName") },
        { label: "Father/Husband's Name:", value: formData.get("fatherName") },
        { label: "Contact Number:", value: formData.get("phone") },
        { label: "Email Address:", value: formData.get("email") },
        { label: "Address:", value: formData.get("address") }
    ];

    drawSectionHeader("PAYMENT DETAILS", yPos + personalDetails.length * 10);
    const paymentYStart = yPos + personalDetails.length * 10 + 12;

    const paymentDetails = [
        { label: "Amount Paid:", value: "500.00" },
        { label: "Amount in Words:", value: "Five Hundred Only" },
        { label: "Payment Date:", value: date },
        { label: "Payment Method:", value: "Online (Razorpay)" },
        { label: "Order ID:", value: paymentResponse.razorpay_order_id },
        { label: "Transaction ID:", value: paymentResponse.razorpay_payment_id }
    ];

    const drawDetails = (data, yStart) => {
        let currentY = yStart;
        data.forEach((item, index) => {
            if (index % 2 === 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, currentY - 2, pageWidth - margin * 2, 10, 'F');
            }
            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.setFont("helvetica", "bold");
            doc.text(item.label, margin + 5, currentY + 3);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(50);
            doc.text(item.value, margin + 50, currentY + 3);

            currentY += 10;
        });
        return currentY;
    };

    yPos = drawDetails(personalDetails, yPos);
    yPos = drawDetails(paymentDetails, paymentYStart);

    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("500.00", pageWidth - margin - 5, paymentYStart + 3, { align: "right" });

    yPos += 15;
    doc.setFontSize(11);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bolditalic");
    doc.text("Thank you for joining Pasuseva Foundation as a coordinator!", pageWidth / 2, yPos, { align: 'center' });

    yPos += 20;
    doc.setDrawColor(borderColor);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    doc.setFillColor('#e8f5e9');
    doc.rect(pageWidth - 55, yPos + 27, 50, 12, 'F');
    doc.setFontSize(10);
    doc.setTextColor('#2e7d32');
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth - 30, yPos + 32, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text("This is a computer-generated receipt and does not require a physical signature.", pageWidth / 2, yPos + 8, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signatory", pageWidth - margin - 5, yPos + 20, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Pasuseva • support@pasuseva.in • www.pasuseva.in", pageWidth / 2, yPos + 30, { align: 'center' });
    doc.text("Registered under Section 8 of Companies Act, 2013", pageWidth / 2, yPos + 35, { align: 'center' });

    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFontSize(60);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center', angle: 45 });
    doc.setGState(new doc.GState({ opacity: 1 }));

    const fileName = `Pasuseva_Receipt_${formData.get("fullName").replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
}

async function toDataURL(src, outputWidth = 100, outputHeight = 100) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, outputWidth, outputHeight);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        image.onerror = reject;
        image.src = src;
    });
}

