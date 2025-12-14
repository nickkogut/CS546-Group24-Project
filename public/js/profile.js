(function () {
  const form = document.getElementById("profile-form");
  const errorDiv = document.getElementById("client-error");
  if (!form) return;

  function showError(msg) {
    if (!errorDiv) return;
    errorDiv.textContent = msg;
    errorDiv.style.display = "block";
  }

  function clearError() {
    if (!errorDiv) return;
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
  }

  form.addEventListener("submit", (e) => {
    clearError();

    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const ageStr = (form.age.value || "").trim();

    if (!firstName || !lastName) {
      e.preventDefault();
      showError("First name and last name are required.");
      return;
    }

    if (ageStr) {
      const age = Number(ageStr);
      if (!Number.isInteger(age) || age <= 0) {
        e.preventDefault();
        showError("Age must be a positive integer.");
        return;
      }
    }
  });
})();
