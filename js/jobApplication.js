
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
            "state", "district", "block", "education", "percentage", "passYear", "aadhaar"
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
            const res = await fetch("http://localhost:4012/api/job", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                alert("आवेदन सफलतापूर्वक सबमिट किया गया है!");
                form.reset();
            } else {
                alert(data?.message || "फॉर्म सबमिट करने में त्रुटि हुई");
            }
        } catch (err) {
            alert("सर्वर से कनेक्ट नहीं हो सका");
        } finally {
            toggleLoading(false);
        }
    });
});

