(function () {
  const form = document.getElementById("login-form");
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
    // Simple email format check
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  form.addEventListener("submit", (e) => {
    clearError();

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      e.preventDefault();
      showError("Email and password are required.");
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
  });
})();
