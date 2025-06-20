document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#application-form form");
    const submitBtn = document.getElementById("payButton");

    let loading = false;

    const toggleLoading = (state) => {
        loading = state;
        submitBtn.innerHTML = state ? "Processing..." : "आवेदन सबमिट करें (फॉर्म शुल्क: ₹2000)";
        submitBtn.classList.toggle("opacity-50", state);
        submitBtn.classList.toggle("cursor-not-allowed", state);
    };

    const validateForm = (formData) => {
        const requiredFields = [
            "position", "fullName", "fatherName", "dob", "phone", "email", "address",
            "state", "district", "block", "education", "percentage", "passYear", "aadhaar"
        ];

        for (const field of requiredFields) {
            if (!formData.get(field)) {
                alert(`कृपया ${field} फ़ील्ड भरें`);
                return false;
            }
        }

        if (!formData.get("photo") || !formData.get("aadhaarFront") || !formData.get("aadhaarBack")) {
            alert("कृपया सभी फोटो अपलोड करें");
            return false;
        }

        return true;
    };

    submitBtn.addEventListener("click", async () => {
        if (loading) return;

        const formData = new FormData(form);

        // if (!validateForm(formData)) return;
        console.log("Form Data:", Object.fromEntries(formData.entries()));
        toggleLoading(true);

        try {
            const res = await fetch("https://api.pasuseva.in/api/job", {
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
