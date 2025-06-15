document.addEventListener("DOMContentLoaded", function () {
    const stateDropdown = document.getElementById("state");
    const districtDropdown = document.getElementById("district");
    const blockDropdown = document.getElementById("block");

    let biharData = {};

    // Load JSON data
    fetch("../data/bihar_data.json")
        .then((response) => response.json())
        .then((data) => {
            biharData = data;
        });

    // Populate district when Bihar is selected
    stateDropdown.addEventListener("change", function () {
        const selectedState = this.value;
        districtDropdown.innerHTML = '<option value="">जिला चुनें</option>';
        blockDropdown.innerHTML = '<option value="">ब्लॉक चुनें</option>';

        if (selectedState === "Bihar" && biharData["Bihar"]) {
            Object.keys(biharData["Bihar"]).forEach((district) => {
                const option = document.createElement("option");
                option.value = district;
                option.textContent = district;
                districtDropdown.appendChild(option);
            });
        }
    });

    // Populate blocks when district is selected
    districtDropdown.addEventListener("change", function () {
        const selectedDistrict = this.value;
        blockDropdown.innerHTML = '<option value="">ब्लॉक चुनें</option>';

        if (selectedDistrict && biharData["Bihar"][selectedDistrict]) {
            biharData["Bihar"][selectedDistrict].forEach((block) => {
                const option = document.createElement("option");
                option.value = block;
                option.textContent = block;
                blockDropdown.appendChild(option);
            });
        }
    });
});
