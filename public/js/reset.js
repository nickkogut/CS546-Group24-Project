function showMessagesAndSetAction() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const msg = params.get("msg");

  const errorDiv = document.getElementById("errorMsg");
  const successDiv = document.getElementById("successMsg");
  const form = document.getElementById("resetForm");

  if (error && errorDiv) {
    errorDiv.textContent = error;
    errorDiv.style.display = "block";
  }

  if (msg && successDiv) {
    successDiv.textContent = msg;
    successDiv.style.display = "block";
  }

  // 從 /auth/reset/<token> 抓 token，設定 form.action
  if (form) {
    const parts = window.location.pathname.split("/");
    const token = parts[parts.length - 1];
    if (token) {
      form.action = `/auth/reset/${token}`;
    }
  }
}

window.addEventListener("DOMContentLoaded", showMessagesAndSetAction);