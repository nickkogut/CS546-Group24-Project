(function () {
  const form = document.getElementById("register-form");
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

  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  form.addEventListener("submit", (e) => {
    clearError();

    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const ageStr = form.age.value.trim();

    if (!firstName || !lastName || !email || !password) {
      e.preventDefault();
      showError("First name, last name, email and password are required.");
      return;
    }

    if (!isValidEmail(email)) {
      e.preventDefault();
      showError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      e.preventDefault();
      showError("Password must be at least 8 characters.");
      return;
    }

    const complexity = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
    if (!complexity.test(password)) {
      e.preventDefault();
      showError(
        "Password must contain upper and lower case letters and a number."
      );
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
