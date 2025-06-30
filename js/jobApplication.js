
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
                                    from_where: "job"
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

async function generateInvoicePDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("en-IN");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Professional Color Scheme
    const primaryColor = '#2c5f2d';      // Dark green
    const secondaryColor = '#97bc62';    // Light green
    const accentColor = '#004b23';       // Deep green
    const lightColor = '#f8f9fa';        // Off-white
    const borderColor = '#e0e0e0';

    // === Letterhead-style Header ===
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Organization name with white text
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Pasuseva Foundation", pageWidth / 2, 14, { align: 'center' });

    // Decorative line
    doc.setDrawColor(secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 26, pageWidth - margin, 26);

    // === Title Section ===
    doc.setFontSize(20);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Join Us Application Coordinator Program", pageWidth / 2, 47, { align: 'center' });

    // === Payment Status Badge ===
    doc.setFillColor('#e8f5e9'); // Light green background
    doc.rect(pageWidth - 55, 32, 50, 12, 'F');
    doc.setFontSize(10);
    doc.setTextColor('#2e7d32');
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth - 30, 39, { align: 'center' });

    // === Information Sections ===
    let yPos = 60;

    // Section Headers
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

    // Personal Details
    drawSectionHeader("PERSONAL DETAILS", yPos);
    yPos += 12;

    const personalDetails = [
        { label: "Full Name:", value: formData.get("fullName") },
        { label: "Father's Name:", value: formData.get("fatherName") },
        { label: "Contact Number:", value: formData.get("phone") },
        { label: "Email Address:", value: formData.get("email") },
        { label: "Address:", value: formData.get("address") }
    ];

    // Payment Details
    drawSectionHeader("PAYMENT DETAILS", yPos + personalDetails.length * 10);
    const paymentYStart = yPos + personalDetails.length * 10 + 12;

    const paymentDetails = [
        { label: "Amount Paid:", value: "199.00" },
        { label: "Amount in Words:", value: "One Hundred Ninety-Nine Only" },
        { label: "Payment Date:", value: date },
        { label: "Payment Method:", value: "Online (Razorpay)" },
        { label: "Order ID:", value: paymentResponse.razorpay_order_id },
        { label: "Transaction ID:", value: paymentResponse.razorpay_payment_id }
    ];

    // Draw details with alternating row colors
    const drawDetails = (data, yStart) => {
        let currentY = yStart;
        data.forEach((item, index) => {
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, currentY - 2, pageWidth - margin * 2, 10, 'F');
            }

            // Labels
            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.setFont("helvetica", "bold");
            doc.text(item.label, margin + 5, currentY + 3);

            // Values
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50);
            doc.text(item.value, margin + 50, currentY + 3);

            currentY += 10;
        });
        return currentY;
    };

    yPos = drawDetails(personalDetails, yPos);
    yPos = drawDetails(paymentDetails, paymentYStart);

    // === Amount Highlight ===
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("199.00", pageWidth - margin - 5, paymentYStart + 3, { align: "right" });

    // === Thank You Section ===
    yPos += 15;
    doc.setFontSize(11);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bolditalic");
    doc.text("Thank you for joining Pasuseva Foundation as a coordinator!", pageWidth / 2, yPos, { align: 'center' });

    // === Authorization & Footer ===
    yPos += 20;
    doc.setDrawColor(borderColor);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text("This is a computer-generated receipt and does not require a physical signature.", pageWidth / 2, yPos + 8, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signatory", pageWidth - margin - 5, yPos + 20, { align: "right" });

    // Organization info
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Pasuseva Foundation • support@pasuseva.in • www.pasuseva.in", pageWidth / 2, yPos + 30, { align: 'center' });
    doc.text("Registered NGO under Section 8 of Companies Act, 2013", pageWidth / 2, yPos + 35, { align: 'center' });

    // === Watermark ===
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFontSize(60);
    doc.setTextColor(accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth / 2, doc.internal.pageSize.getHeight() / 2, { align: 'center', angle: 45 });
    doc.setGState(new doc.GState({ opacity: 1 }));

    // === Save PDF ===
    const fileName = `Pasuseva_Receipt_${formData.get("fullName").replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
}

