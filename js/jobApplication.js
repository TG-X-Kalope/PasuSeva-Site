
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#application-form form");
    const submitBtn = document.getElementById("payButton");
    let loading = false;

    const toggleLoading = (state) => {
        loading = state;
        submitBtn.innerHTML = state ? "प्रोसेस हो रहा है..." : "आवेदन सबमिट करें (फॉर्म शुल्क: ₹199)";
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
            if (!formData.get(fileId)) {
                showError(fileId, "यह फ़ोटो आवश्यक है");
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
            const res = await fetch("https://api.pasuseva.in/api/job", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                const options = {
                    key: "rzp_test_kOfu7jn9tzGbj4",
                    amount: data.data.amount,
                    currency: data.data.currency,
                    name: "Pasuseva Foundation",
                    description: "Join Us Application Fee",
                    order_id: data.data.id,
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
                            await fetch('https://api.pasuseva.in/api/payment/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                })
                            });

                            await generateInvoicePDF(formData, response);
                            alert("आवेदन सफलतापूर्वक सबमिट किया गया है!");
                            window.location.replace("./payment_success.html");
                        } catch (error) {
                            alert("भुगतान के बाद सत्यापन विफल रहा। कृपया पुनः प्रयास करें।");
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
                form.reset();
            } else {
                alert(data?.message || "फॉर्म सबमिट करने में त्रुटि हुई");
            }
        } catch (err) {
            console.log(err)
            alert("सर्वर से कनेक्ट नहीं हो सका");
        } finally {
            toggleLoading(false);
        }
    });
});

async function generateInvoicePDF(formData, paymentResponse) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("en-IN");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Colors
    const primaryColor = '#2c5f2d';
    const secondaryColor = '#97bc62';
    const accentColor = '#004b23';
    const textColor = '#333333';
    const lightColor = '#f8f9fa';

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Pasuseva Foundation", pageWidth / 2, 20, { align: 'center' });

    // Title
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text("Join Us Application Invoice", pageWidth / 2, 35, { align: 'center' });

    // Date
    doc.setFontSize(11);
    doc.setTextColor(lightColor);
    doc.text(`Date: ${date}`, pageWidth - margin, 45, { align: 'right' });

    // Applicant Info
    const applicantYStart = 60;
    doc.setFillColor(lightColor);
    doc.rect(margin - 5, applicantYStart - 8, pageWidth - margin * 2, 10, 'F');
    doc.setFontSize(12);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("Applicant Information", margin, applicantYStart);

    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.setFont("helvetica", "normal");
    let yPos = applicantYStart + 10;

    const applicantDetails = [
        `Full Name: ${formData.get("fullName")}`,
        `Father's Name: ${formData.get("fatherName")}`,
        `Phone: ${formData.get("phone")}`,
        `Email: ${formData.get("email")}`,
        `Address: ${formData.get("address")}`
    ];

    applicantDetails.forEach(detail => {
        doc.text(detail, margin, yPos);
        yPos += 8;
    });

    // Payment Info
    const paymentYStart = yPos + 10;
    doc.setFillColor(lightColor);
    doc.rect(margin - 5, paymentYStart - 8, pageWidth - margin * 2, 10, 'F');
    doc.setFontSize(12);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Details", margin, paymentYStart);

    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.setFont("helvetica", "normal");
    yPos = paymentYStart + 10;

    const paymentDetails = [
        `Transaction ID: ${paymentResponse.razorpay_payment_id}`,
        `Order ID: ${paymentResponse.razorpay_order_id}`,
        `Amount Paid: ₹199`,
        `Payment Status: Paid`,
        `Payment Date: ${date}`
    ];

    paymentDetails.forEach(detail => {
        doc.text(detail, margin, yPos);
        yPos += 8;
    });

    // PAID badge
    doc.setFillColor(secondaryColor);
    doc.rect(pageWidth - 50, paymentYStart, 40, 15, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth - 30, paymentYStart + 8, { align: 'center' });

    // Thank you note
    const messageY = yPos + 15;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for joining as a coordinator with Pasuseva Foundation!", pageWidth / 2, messageY, { align: 'center' });

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text("This is a system-generated invoice. For queries: support@pasuseva.in", pageWidth / 2, footerY, { align: 'center' });

    // Decorative border
    doc.setDrawColor(200);
    doc.rect(margin - 5, 45, pageWidth - margin * 2, 230);

    // Save file
    const fileName = `join_us_invoice_${formData.get("fullName").replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
}

