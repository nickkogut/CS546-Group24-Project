document.addEventListener("DOMContentLoaded", () => {
  // ===== RESUME =====
  const resumeForm = document.getElementById("resume-form");
  const resumeTextarea = document.getElementById("resumeText");
  const resumeError = document.getElementById("resumeError");
  const resumeHeading = document.getElementById("resumeHeading");

  const saveResumeBtn = document.getElementById("saveResumeBtn");
  const editResumeBtn = document.getElementById("editResumeBtn");
  const clearResumeBtn = document.getElementById("clearResumeBtn");

  const setResumeMode = (mode) => {
    if (!resumeTextarea || !saveResumeBtn || !editResumeBtn || !clearResumeBtn) return;

    if (mode === "view") {
      resumeTextarea.readOnly = true;
      saveResumeBtn.hidden = true;
      clearResumeBtn.hidden = true;
      editResumeBtn.hidden = false;
      if (resumeHeading) resumeHeading.textContent = "Your resume";
    } else {
      resumeTextarea.readOnly = false;
      saveResumeBtn.hidden = false;
      clearResumeBtn.hidden = false;
      editResumeBtn.hidden = true;
      if (resumeHeading) resumeHeading.textContent = "Paste your resume";
      resumeTextarea.focus();
    }
  };

  if (resumeTextarea) {
    const hasResume = resumeTextarea.value.trim().length > 0;
    setResumeMode(hasResume ? "view" : "edit");
  }

  if (resumeForm && resumeTextarea && resumeError) {
    resumeForm.addEventListener("submit", (event) => {
      resumeError.textContent = "";
      resumeError.style.display = "none";

      const text = resumeTextarea.value.trim();
      const errors = [];

      if (!text) errors.push("Resume cannot be empty or just spaces.");
      if (text.length > 10000) errors.push("Resume is too long (max 10,000 characters).");

      if (errors.length > 0) {
        event.preventDefault();
        resumeError.innerHTML = errors.join("<br>");
        resumeError.style.display = "block";
      }
    });
  }

  if (editResumeBtn) {
    editResumeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setResumeMode("edit");
    });
  }

  if (clearResumeBtn && resumeTextarea) {
    clearResumeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      resumeTextarea.value = "";
      resumeTextarea.focus();
    });
  }

  // ===== ADD JOB =====
  const jobForm = document.getElementById("add-job-form");
  const jobError = document.getElementById("jobError");

  const jobTitle = document.getElementById("jobTitle");
  const jobSalary = document.getElementById("jobSalary");
  const jobStartDate = document.getElementById("jobStartDate");
  const jobBorough = document.getElementById("jobBorough");
  const clearAddJobBtn = document.getElementById("clearAddJobBtn");

  const VALID_BOROUGHS = ["", "Manhattan", "Brooklyn", "Queens", "Bronx"];

  if (jobForm && jobError && jobTitle && jobSalary && jobStartDate && jobBorough) {
    jobForm.addEventListener("submit", (event) => {
      jobError.textContent = "";
      jobError.style.display = "none";

      const title = jobTitle.value.trim();
      const salaryStr = jobSalary.value.trim();
      const startDateStr = jobStartDate.value.trim();
      const borough = jobBorough.value;

      const errors = [];

      if (!title) errors.push("Job title is required.");
      else if (title.length > 100) errors.push("Job title is too long (max 100 characters).");

      if (salaryStr) {
        const n = Number(salaryStr);
        if (!Number.isFinite(n) || n < 0) errors.push("Salary must be a non-negative number.");
      }

      if (startDateStr) {
        const d = new Date(startDateStr);
        if (isNaN(d.getTime())) errors.push("Start date is invalid.");
        else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (d > today) errors.push("Start date cannot be in the future.");
        }
      }

      if (!VALID_BOROUGHS.includes(borough)) errors.push("Invalid borough selection.");

      if (errors.length > 0) {
        event.preventDefault();
        jobError.innerHTML = errors.join("<br>");
        jobError.style.display = "block";
      }
    });
  }

  if (clearAddJobBtn && jobTitle && jobSalary && jobStartDate && jobBorough) {
    clearAddJobBtn.addEventListener("click", (event) => {
      event.preventDefault();
      jobTitle.value = "";
      jobSalary.value = "";
      jobStartDate.value = "";
      jobBorough.value = "";
      jobTitle.focus();
    });
  }
});
