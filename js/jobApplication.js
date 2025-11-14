
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
        document.querySelectorAll(".input-error").forEach((el) => el.remove());
    };

    const validateForm = (formData) => {
        clearErrors();
        const required = [
            "position",
            "fullName",
            "fatherName",
            "dob",
            "phone",
            "email",
            "address",
            "state",
            "district",
            "block",
            "education",
            "percentage",
            "passYear",
            "aadhaar",
            "experience",
            "industry",
        ];
        let hasError = false;

        required.forEach((id) => {
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

        ["photo", "aadhaarFront", "aadhaarBack"].forEach((fileId) => {
            const fileInput = document.getElementById(fileId);
            if (!fileInput.files[0]) {
                showError(fileId, "यह फ़ाइल आवश्यक है");
                hasError = true;
            } else if (fileInput.files[0].size > 100 * 1024) {
                showError(fileId, "फ़ाइल का आकार 100KB से अधिक नहीं होना चाहिए");
                hasError = true;
            }
        });

        return !hasError;
    };

    const uploadFile = async (file) => {
        const signResponse = await fetch(`https://test-api.pasuseva.in/api/job/sign-upload?v=${Date.now()}`);
        const signData = await signResponse.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signData.api_key);
        formData.append("timestamp", signData.timestamp);
        formData.append("signature", signData.signature);
        formData.append("folder", "pasuseva/gaushala");

        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload?v=${Date.now()}`,
            {
                method: "POST",
                body: formData,
            }
        );

        const uploadData = await uploadResponse.json();
        return uploadData.secure_url;
    };

    submitBtn.addEventListener("click", async () => {
        if (loading) return;
        const formData = new FormData(form);
        if (!validateForm(formData)) return;

        toggleLoading(true);

        try {
            // Upload required files to Cloudinary
            const photoUrl = await uploadFile(document.getElementById("photo").files[0]);
            const aadhaarFrontUrl = await uploadFile(document.getElementById("aadhaarFront").files[0]);
            const aadhaarBackUrl = await uploadFile(document.getElementById("aadhaarBack").files[0]);

            formData.append("photo", photoUrl);
            formData.append("aadhaarFront", aadhaarFrontUrl);
            formData.append("aadhaarBack", aadhaarBackUrl);

            // Step 1: Create job/application
            const jobRes = await fetch(`https://test-api.pasuseva.in/api/job?v=${Date.now()}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(formData.entries())),
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
                reg,
            };

            const orderRes = await fetch(`https://test-api.pasuseva.in/api/payment/create-order?v=${Date.now()}`, {
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

            const amountPaise = orderData.order.amount || 50000; // fallback 500.00
            const amountINR = (amountPaise / 100).toFixed(2);

            // Step 3: Razorpay Payment Gateway
            const options = {
                key: "rzp_test_gF2PIyUYGRsN6q",
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: "Pasuseva",
                description: "Join Us Application Fee",
                order_id: orderData.order.id,
                prefill: {
                    name: formData.get("fullName"),
                    email: formData.get("email"),
                    contact: formData.get("phone"),
                },
                notes: {
                    block: formData.get("block"),
                    state: formData.get("state"),
                },
                theme: { color: "#4CAF50" },
                handler: async function (response) {
                    // Open popup window immediately to avoid popup blockers
                    const popup = openReceiptWindowLoading();

                    try {
                        // Step 4: Verify payment on backend
                        const verifyRes = await fetch(`https://test-api.pasuseva.in/api/payment/verify-payment?v=${Date.now()}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                from_where: "job",
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok || !verifyData.success) {
                            if (popup) writeFailureToWindow(popup, "भुगतान सत्यापन विफल रहा।");
                            alert("भुगतान सत्यापन विफल रहा।");
                            return;
                        }

                        // Prepare receipt data
                        const logoDataUrl = await toDataURL("./assets/Logo-02.png", 110, 110);
                        const receiptData = {
                            reg,
                            position: formData.get("position"),
                            date: new Date().toLocaleDateString("en-IN"),
                            amountINR: amountINR,
                            amountWords: amountToWords(Math.round(amountPaise / 100)),
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            fullName: formData.get("fullName"),
                            fatherName: formData.get("fatherName"),
                            phone: formData.get("phone"),
                            email: formData.get("email"),
                            address: formData.get("address"),
                            state: formData.get("state"),
                            district: formData.get("district"),
                            block: formData.get("block"),
                            logo: logoDataUrl,
                        };

                        const html = generateReceiptHTML(receiptData);
                        if (popup) {
                            writeReceiptToWindow(popup, html);
                        } else {
                            // fallback (should rarely happen)
                            openReceiptWindow(html);
                        }

                        // Optional: redirect main window
                        window.location.replace("./payment_success.html");
                    } catch (error) {
                        console.error("Verification Error:", error);
                        if (popup) writeFailureToWindow(popup, "भुगतान सत्यापन में त्रुटि हुई।");
                        alert("भुगतान सत्यापन में त्रुटि हुई।");
                    } finally {
                        toggleLoading(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        alert("आपका भुगतान रद्द कर दिया गया है।");
                        toggleLoading(false);
                    },
                },
            };

            const rzp = new Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Unexpected Error:", err);
            alert("सर्वर से कनेक्ट नहीं हो सका। कृपया बाद में प्रयास करें।");
            toggleLoading(false);
        }
    });
});

/* ---------- OPTION 3 HELPERS: NEW WINDOW RECEIPT ---------- */

function openReceiptWindowLoading() {
    const popup = window.open("", "_blank", "popup=yes,width=900,height=900,scrollbars=yes");
    if (!popup) return null;
    popup.document.open();
    popup.document.write(`
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Receipt | Pasuseva</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet" />
        <style>
          :root{
            --primary:#f5d225;
            --secondary:#97bc62;
            --accent:#004b23;
            --light:#f8f9fa;
            --border:#e0e0e0;
          }
          *{ box-sizing: border-box; }
          html,body{ padding:0; margin:0; background:#fff; font-family:"Noto Sans Devanagari", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#222; }
          .container{ max-width:820px; margin:24px auto; padding:16px; }
          .card{ border:1px solid var(--border); overflow:hidden; position:relative; }
          .header{ background:var(--primary); padding:16px 12px 56px; position:relative; }
          .logo{ position:absolute; left:50%; top:16px; transform:translateX(-50%); height:72px; width:72px; object-fit:contain; }
          .title{ position:absolute; left:50%; top:100px; transform:translateX(-50%); font-weight:700; color:#2c5f2d; }
          .body{ padding:20px 16px 28px; position:relative; background:#fff; }
          .section-h{ background:var(--light); border-bottom:1px solid var(--border); padding:8px 10px; margin:10px 0 6px; color:var(--accent); font-weight:700; }
          .row{ display:flex; gap:12px; padding:8px 10px; align-items:flex-start; }
          .row.alt{ background:#fafafa; }
          .label{ min-width:180px; font-weight:700; color:#666; }
          .value{ flex:1; color:#333; word-break:break-word; }
          .paid-badge{ position:absolute; right:16px; bottom:100px; border:1px solid #81c784; background:#e8f5e9; color:#2e7d32; font-weight:700; padding:8px 18px; border-radius:8px; }
          .total{ position:absolute; right:16px; bottom:52px; text-align:right; }
          .total .label{ color:var(--accent); }
          .total .amount{ color:var(--accent); font-weight:700; }
          .footer{ border-top:1px solid var(--border); padding:10px; color:#666; font-size:13px; text-align:center; }
          .sign{ position:absolute; right:16px; bottom:18px; font-weight:700; font-size:13px; }
          .watermark{ position:absolute; inset:0; pointer-events:none; display:flex; align-items:center; justify-content:center; }
          .watermark span{ transform:rotate(-25deg); opacity:.08; font-size:120px; color:var(--accent); font-weight:700; }
          .toolbar{ display:flex; gap:8px; justify-content:flex-end; padding:10px 0 0; }
          .btn{ padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; }
          .btn.primary{ background:var(--accent); color:#fff; border-color:var(--accent); }
          @page{ size:A4; margin:12mm; }
          @media print{
            .toolbar{ display:none !important; }
            body{ background:#fff; }
          }
          /* Loading */
          .loading{ display:flex; gap:10px; align-items:center; justify-content:center; color:#2c5f2d; padding:42px 0; }
          .spinner{ width:18px; height:18px; border:3px solid #cfe0cf; border-top-color:#2c5f2d; border-radius:50%; animation:spin 1s linear infinite; }
          @keyframes spin{ to{ transform:rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="toolbar">
            <button class="btn" onclick="window.close()">Close</button>
            <button class="btn primary" onclick="window.print()">Download / Print</button>
          </div>
          <div class="card">
            <div class="header">
              <img class="logo" alt="Logo" />
              <div class="title">Join Us Application</div>
            </div>
            <div class="body">
              <div class="loading">
                <div class="spinner"></div>
                <div>रसीद तैयार हो रही है...</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
    popup.document.close();
    return popup;
}

function writeFailureToWindow(popup, msg) {
    try {
        popup.document.body.innerHTML = `
      <div style="max-width:720px;margin:60px auto;font-family:'Noto Sans Devanagari',sans-serif;text-align:center">
        <h2 style="color:#b00020;margin-bottom:12px">भुगतान विफल</h2>
        <p style="color:#444">${escapeHtml(msg || "कृपया पुनः प्रयास करें।")}</p>
        <button style="margin-top:16px;padding:8px 12px;border-radius:8px;border:1px solid #ddd" onclick="window.close()">Close</button>
      </div>`;
    } catch { /* ignore */ }
}

function writeReceiptToWindow(popup, html) {
    try {
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
    } catch (e) {
        console.error("Failed to write receipt window:", e);
        // Fallback open a new window
        openReceiptWindow(html);
    }
}

function openReceiptWindow(html) {
    const w = window.open("", "_blank", "popup=yes,width=900,height=900,scrollbars=yes");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
}

/**
 * Generate full HTML for receipt popup.
 * data = { reg, date, amountINR, amountWords, orderId, paymentId, fullName, fatherName, phone, email, address, state, district, block, logo }
 */

function detailRow(label, value, alt = false) {
    return `<div class="row ${alt ? "alt" : ""}">
    <div class="label">${escapeHtml(label || "")}</div>
    <div class="value">${escapeHtml(value || "")}</div>
  </div>`;
}

function generateReceiptHTML(data) {
    const esc = escapeHtml;

    // helpers
    const maskAadhaar = (a) => {
        const s = (a || "").replace(/\D/g, "");
        return s.length === 12 ? `XXXX-XXXX-${s.slice(8)}` : esc(a || "");
    };
    const amountINR = esc(data.amountINR || "0.00");
    const titleText = `${esc(data.position || "Join Us")} Application`;

    return `
  <html lang="hi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Receipt | Pasuseva</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet" />
      <style>
        :root{
          --primary:#f5d225; /* header bar */
          --secondary:#97bc62;
          --accent:#004b23;  /* headings / thank-you / watermark */
          --light:#f8f9fa;   /* section header bg */
          --border:#e0e0e0;
        }
        *{ box-sizing:border-box; }
        html,body{ margin:0; padding:0; background:#fff; color:#222;
          font-family:"Noto Sans Devanagari", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
        .wrap{ max-width:820px; margin:24px auto; padding:0 16px; }
        .toolbar{ display:flex; gap:8px; justify-content:flex-end; margin-bottom:8px; }
        .btn{ padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; }
        .btn.primary{ background:var(--accent); color:#fff; border-color:var(--accent); }
        .card{   overflow:hidden;  position:relative; }

        /* === EXACT HEADER MIMIC (jsPDF) === */
        .hdr{ background:var(--primary); height:90px; position:relative; }
        .hdr-logo{ position:absolute; left:50%; top:5px; transform:translateX(-50%); width:40px; height:40px; object-fit:contain; }
        .hdr-title{ position:absolute; left:50%; top:49px; transform:translateX(-50%);
          font-weight:700; font-size:14px; color:#2c5f2d; } /* same green as jsPDF */
        .application{  margin-left:15px; padding:10px; font-weight:700; font-size:12px; color:#2c5f2d; }

        .body{ padding:20px 15px 30px; position:relative; background:#fff; }

        /* SECTION HEADER STRIP (same as jsPDF's light fill + underline) */
        .sec-h{ background:var(--light); padding:6px 10px; color:var(--primary); font-weight:700; font-size:11px; margin-top:10px; }
        .sec-h + .underline{ height:8px; border-bottom:1px solid var(--border); margin-top:-8px; }

        /* rows mimic: alternating fill every second line like jsPDF code */
        .rows{ margin-top:6px; }
        .row{ display:flex; gap:12px; align-items:flex-start; padding:6px 10px; }
        .row.alt{ background:#f5f5f5; } /* #f5f5f5 ~ 245 grey like jsPDF setFill(245) */
        .label{ min-width:180px; font-weight:700; color:#666; font-size:10px; }
        .value{ flex:1; color:#333; font-size:10px; word-break:break-word; }

        /* PAID badge + total block at same placement */
        .paid{ position:absolute; right:15px; bottom:105px; border:1px solid #81c784;
          background:#e8f5e9; color:#2e7d32; font-weight:700; padding:8px 18px; border-radius:8px; font-size:10px; }
        .total-line{ position:absolute; left:calc(100% - 80px); right:15px; bottom:88px; height:1px; background:var(--border); }
        .total{ position:absolute; right:15px; bottom:58px; text-align:right; }
        .total .t1{ font-size:12px; color:var(--primary); font-weight:700; }
        .total .t2{ font-size:12px; color:#222; font-weight:700; }
        .total .t3{ font-size:8px; color:#666; }

        /* Thank-you line (bold italic mimic) */
        .thanks{ margin-top:20px; text-align:center; color:var(--accent); font-weight:700; font-style:italic; font-size:11px; }

        /* bottom divider + notes */
        .divider{ height:1px; background:var(--border); margin:10px 0 8px; }
        .note1, .note2{ text-align:center; font-size:9px; color:#777; margin:6px 0; }
        .sign{ position:absolute; right:15px; bottom:20px; font-weight:700; font-size:9px; color:#222; }

        /* diagonal watermark */
        .wm{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
        .wm span{ transform:rotate(45deg); opacity:.10; font-size:60px; color:var(--accent); font-weight:700; }

        @page{ size:A4; margin:12mm; }
        @media print{ .toolbar{ display:none !important; } body{ background:#fff; } }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="toolbar">
          <button class="btn" onclick="window.close()">Close</button>
          <button class="btn primary" onclick="window.print()">Download / Print</button>
        </div>

        <div class="card">
          <!-- HEADER exact mimic -->
          <div class="hdr">
            <img class="hdr-logo" src="https://pasuseva.in/assets/Logo-01.png" alt="Logo" />
            <div class="hdr-title">${titleText}</div>

          </div>
            <div class="application">Application: ${esc(data.reg || "")}</div>

          <div class="body">
            <!-- PERSONAL DETAILS -->
            <div class="sec-h">PERSONAL DETAILS</div>
            <div class="underline"></div>

            <div class="rows">
              ${detailRow("Full Name:", data.fullName, false)}
              ${detailRow("Father/Husband's Name:", data.fatherName, true)}
              ${detailRow("Date of Birth:", data.dob, false)}
              ${detailRow("Contact Number:", data.phone, true)}
              ${detailRow("Email Address:", data.email, false)}
              ${detailRow("Address:", data.address, true)}
              ${detailRow("State:", data.state, false)}
              ${detailRow("District:", data.district, true)}
              ${detailRow("Block:", data.block, false)}
              ${detailRow("Education:", data.education, true)}
              ${detailRow("Percentage:", data.percentage, false)}
              ${detailRow("Passing Year:", data.passYear, true)}
              ${detailRow("Aadhaar:", maskAadhaar(data.aadhaar), false)}
              ${detailRow("Experience:", data.experience, true)}
              ${detailRow("Industry:", data.industry, false)}
            </div>

            <!-- PAYMENT DETAILS -->
            <div class="sec-h" style="margin-top:12px;">PAYMENT DETAILS</div>
            <div class="underline"></div>

            <div class="rows">
              ${detailRow("Amount Paid:", "₹ " + amountINR, false)}
              ${detailRow("Amount in Words:", esc(data.amountWords || ""), true)}
              ${detailRow("Payment Date:", esc(data.date || ""), false)}
              ${detailRow("Payment Method:", "Online (Razorpay)", true)}
              ${detailRow("Order ID:", esc(data.orderId || ""), false)}
              ${detailRow("Transaction ID:", esc(data.paymentId || ""), true)}
            </div>

            <!-- PAID badge + summary (exact placement group) -->
            <div class="paid">PAID</div>
            <div class="total-line"></div>
            <div class="total">
              <div class="t1">Total Amount:</div>
              <div class="t2">₹ ${amountINR}</div>
              <div class="t3">${esc(data.amountWords || "")}</div>
            </div>
</br>
</br>
            <!-- Thank-you line -->
            <div class="thanks">Thank you for choosing pasuseva</div>

            <div class="divider"></div>
            <div class="note1">This is a computer-generated receipt and does not require a physical signature.</div>
            <div class="note1">Application Fees is non-refundable</div>
            <div class="sign">Authorized Signatory</div>

            <!-- diagonal watermark -->
            <div class="wm"><span>PAID</span></div>
          </div>

          <!-- Footer (single block like jsPDF bottom texts) -->
          <div style="border-top:1px solid var(--border); padding:10px; text-align:center;">
            <div style="font-size:9px; color:#777;">
              Pasuseva • support@pasuseva.in • www.pasuseva.in
            </div>
            <div style="font-size:9px; color:#777; margin-top:4px;">
            
            Shiksha Gravity Foundation Parent Company Of Pasuseva
</br>
              Registered under Section 8 of Companies Act, 2013
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}


// function detailRow(label, value, alt = false) {
//     return `<div class="row ${alt ? "alt" : ""}"><div class="label">${escapeHtml(label || "")}</div><div class="value">${escapeHtml(value || "")}</div></div>`;
// }

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function amountToWords(num) {
    // Very simple INR number-to-words for thousands range (sufficient for typical fees).
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    function toWords(n) {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
        if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
        return String(n); // fallback
    }
    return toWords(num) + " Rupees";
}

async function toDataURL(src, outputWidth = 100, outputHeight = 100) {
    return new Promise((resolve, reject) => {
        const image = document.createElement('img');
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = outputWidth;
                canvas.height = outputHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, outputWidth, outputHeight);
                resolve(canvas.toDataURL('image/png', 0.92));
            } catch (e) {
                resolve(""); // fail-soft
            }
        };
        image.onerror = () => resolve(""); // fail-soft
        image.src = src;
    });
}


// const dummyReceiptData = {
//     reg: "REG1234567890",
//     date: "08/09/2025",
//     amountPaise: 50000,
//     amountINR: "500.00",
//     amountWords: "Five Hundred Rupees",
//     orderId: "order_JU0001EXAMPLE",
//     paymentId: "pay_JU123456EXAMPLE",

//     // Personal details
//     position: "जिला समन्वयक",
//     fullName: "Aditya Verma",
//     fatherName: "Rajeev Verma",
//     dob: "1992-08-15",
//     phone: "9876543210",
//     email: "aditya.verma@example.com",
//     address: "123, Pasu Marg, Anisabad, Patna, Bihar",
//     state: "Bihar",
//     district: "Patna",
//     block: "Phulwari",

//     education: "B.Sc. Agriculture",
//     percentage: "72%",
//     passYear: "2015",
//     aadhaar: "123456789012",
//     experience: "5 years",
//     industry: "Dairy Farming",

//     logo: "https://dummyimage.com/200x200/004b23/ffffff.png&text=Pasuseva" // test logo
// };

// // फिर call करो:
// const html = generateReceiptHTML(dummyReceiptData);
// openReceiptWindow(html); // या सीधे document.write(html) टेस्ट करने को
