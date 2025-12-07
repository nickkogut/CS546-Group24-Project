(function ($) {
  $(function () {
    const $form = $("#resume-form");
    const $textarea = $("#resumeText");
    const $error = $("#resumeError");

    if ($form.length === 0) return;

    $form.on("submit", function (event) {
      $error.hide().text("");

      const text = $textarea.val().trim();
      const errors = [];

      if (!text) {
        errors.push("Resume cannot be empty or just spaces.");
      }

      if (text.length > 10000) {
        errors.push("Resume is too long (max 10,000 characters).");
      }

      if (errors.length > 0) {
        event.preventDefault();
        $error.html(errors.join("<br>")).show();
        return false;
      }

      return true;
    });
  });
})(window.jQuery);
