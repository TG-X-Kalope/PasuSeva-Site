const restrictInput = () => {
    const phoneInput = document.getElementById("phone");
    const aadhaarInput = document.getElementById("aadhaar");
    const emailInput = document.getElementById("email");

    // ✅ मोबाइल नंबर — केवल 10 digit
    phoneInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        const errorEl = phoneInput.parentElement.querySelector('.input-error');
        if (e.target.value.length !== 10) {
            if (!errorEl) {
                const err = document.createElement('p');
                err.className = 'input-error text-red-600 text-sm mt-1';
                err.innerText = "केवल 10 अंकों का मोबाइल नंबर दर्ज करें";
                phoneInput.parentElement.appendChild(err);
            }
        } else {
            if (errorEl) errorEl.remove();
        }
    });

    // ✅ आधार नंबर — केवल 12 digit
    aadhaarInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
        const errorEl = aadhaarInput.parentElement.querySelector('.input-error');
        if (e.target.value.length < 12) {
            if (!errorEl) {
                const err = document.createElement('p');
                err.className = 'input-error text-red-600 text-sm mt-1';
                err.innerText = "12 अंकों का आधार नंबर दर्ज करें";
                aadhaarInput.parentElement.appendChild(err);
            }
        } else {
            if (errorEl) errorEl.remove();
        }
    });

    // ✅ ईमेल — सिंपल regex check
    emailInput.addEventListener("input", (e) => {
        const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
        const errorEl = emailInput.parentElement.querySelector('.input-error');
        if (!emailRegex.test(e.target.value)) {
            if (!errorEl) {
                const err = document.createElement('p');
                err.className = 'input-error text-red-600 text-sm mt-1';
                err.innerText = "मान्य ईमेल आईडी दर्ज करें";
                emailInput.parentElement.appendChild(err);
            }
        } else {
            if (errorEl) errorEl.remove();
        }
    });
};

restrictInput();
