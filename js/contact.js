
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#contact form");
    const nameInput = document.getElementById("name");
    const mobileInput = document.getElementById("mobile");
    const messageInput = document.getElementById("message");
    const submitBtn = form.querySelector("button");
    const defaultBtnHTML = submitBtn.innerHTML;

    // Create loader element
    const loader = `<svg class="animate-spin mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>`;



    // Handle form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const mobile = mobileInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !mobile || !message) {
            alert("Please fill in all fields.");
            return;
        }



        // Show loader
        submitBtn.disabled = true;
        submitBtn.innerHTML = loader + "Sending...";

        try {
            const res = await fetch("https://api.pasuseva.in/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, mobile, message })
            });

            const data = await res.json();

            if (res.ok) {
                alert("✅ Message sent successfully!");
                form.reset();
            } else {
                alert(data.message || "❌ Something went wrong. Try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("❌ Failed to send message. Please try again later.");
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = defaultBtnHTML;
        }
    });
});

