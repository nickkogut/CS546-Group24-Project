function showMessages() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const msg = params.get("msg");

  const errorDiv = document.getElementById("errorMsg");
  const successDiv = document.getElementById("successMsg");

  if (error && errorDiv) {
    errorDiv.textContent = error;
    errorDiv.style.display = "block";
  }

  if (msg && successDiv) {
    successDiv.textContent = msg;
    successDiv.style.display = "block";
  }
}

window.addEventListener("DOMContentLoaded", showMessages);