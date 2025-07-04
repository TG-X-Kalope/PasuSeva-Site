
document.addEventListener("DOMContentLoaded", function () {
    const stateDropdown = document.getElementById("state");
    const districtDropdown = document.getElementById("district");
    const blockDropdown = document.getElementById("block");

    let locationData = {};

    // Load JSON data
    fetch("../data/bihar_data.json")
        .then((response) => response.json())
        .then((data) => {
            locationData = data;

            // Populate state dropdown dynamically
            stateDropdown.innerHTML = '<option value="">राज्य चुनें</option>';
            Object.keys(locationData).forEach((state) => {
                const option = document.createElement("option");
                option.value = state;
                option.textContent = state;
                stateDropdown.appendChild(option);
            });
        });

    // Populate district when state is selected
    stateDropdown.addEventListener("change", function () {
        const selectedState = this.value;
        districtDropdown.innerHTML = '<option value="">जिला चुनें</option>';
        blockDropdown.innerHTML = '<option value="">ब्लॉक चुनें</option>';

        if (selectedState && locationData[selectedState]) {
            Object.keys(locationData[selectedState]).forEach((district) => {
                const option = document.createElement("option");
                option.value = district;
                option.textContent = district;
                districtDropdown.appendChild(option);
            });
        }
    });

    // Populate blocks when district is selected
    districtDropdown.addEventListener("change", function () {
        const selectedState = stateDropdown.value;
        const selectedDistrict = this.value;
        blockDropdown.innerHTML = '<option value="">ब्लॉक चुनें</option>';

        if (
            selectedState &&
            selectedDistrict &&
            locationData[selectedState][selectedDistrict]
        ) {
            locationData[selectedState][selectedDistrict].forEach((block) => {
                const option = document.createElement("option");
                option.value = block;
                option.textContent = block;
                blockDropdown.appendChild(option);
            });
        }
    });
});

