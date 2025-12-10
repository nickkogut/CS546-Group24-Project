document.addEventListener("DOMContentLoaded", () => {
  const resumeForm = document.getElementById("resume-form");
  const resumeTextarea = document.getElementById("resumeText");
  const resumeError = document.getElementById("resumeError");
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
    } else {
      // edit mode
      resumeTextarea.readOnly = false;
      saveResumeBtn.hidden = false;
      clearResumeBtn.hidden = false;
      editResumeBtn.hidden = true;
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

      if (!text) {
        errors.push("Resume cannot be empty or just spaces.");
      }

      if (text.length > 10000) {
        errors.push("Resume is too long (max 10,000 characters).");
      }

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

  const jobForm = document.getElementById("current-job-form");
  const jobError = document.getElementById("jobError");
  const jobTitleInput = document.getElementById("currentJobTitle");
  const jobSalaryInput = document.getElementById("currentJobSalary");
  const jobStartDateInput = document.getElementById("currentJobStartDate");
  const jobBoroughSelect = document.getElementById("currentJobBorough");

  const saveJobBtn = document.getElementById("saveJobBtn");
  const editJobBtn = document.getElementById("editJobBtn");
  const clearJobBtn = document.getElementById("clearJobBtn");

  const setJobMode = (mode) => {
    if (
      !jobTitleInput ||
      !jobSalaryInput ||
      !jobStartDateInput ||
      !jobBoroughSelect ||
      !saveJobBtn ||
      !editJobBtn ||
      !clearJobBtn
    ) {
      return;
    }

    const readonly = mode === "view";

    jobTitleInput.readOnly = readonly;
    jobSalaryInput.readOnly = readonly;
    jobStartDateInput.readOnly = readonly;
    jobBoroughSelect.disabled = readonly;

    if (readonly) {
      saveJobBtn.hidden = true;
      clearJobBtn.hidden = true;
      editJobBtn.hidden = false;
    } else {
      saveJobBtn.hidden = false;
      clearJobBtn.hidden = false;
      editJobBtn.hidden = true;
      jobTitleInput.focus();
    }
  };

  if (jobTitleInput) {
    const hasJob = jobTitleInput.value.trim().length > 0;
    setJobMode(hasJob ? "view" : "edit");
  }

  if (jobForm && jobError && jobTitleInput && jobSalaryInput && jobStartDateInput) {
    jobForm.addEventListener("submit", (event) => {
      jobError.textContent = "";
      jobError.style.display = "none";

      const title = jobTitleInput.value.trim();
      const salaryStr = jobSalaryInput.value.trim();
      const startDateStr = jobStartDateInput.value.trim();
      const errors = [];

      if (!title) {
        errors.push("Job title is required.");
      } else if (title.length > 100) {
        errors.push("Job title is too long (max 100 characters).");
      }

      if (salaryStr) {
        const salary = Number(salaryStr);
        if (!Number.isFinite(salary) || salary < 0) {
          errors.push("Salary must be a non-negative number.");
        }
      }

      if (startDateStr) {
        const d = new Date(startDateStr);
        if (isNaN(d.getTime())) {
          errors.push("Start date is invalid.");
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (d > today) {
            errors.push("Start date cannot be in the future.");
          }
        }
      }

      if (errors.length > 0) {
        event.preventDefault();
        jobError.innerHTML = errors.join("<br>");
        jobError.style.display = "block";
      }
    });
  }

  if (editJobBtn) {
    editJobBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setJobMode("edit");
    });
  }

  if (clearJobBtn && jobTitleInput && jobSalaryInput && jobStartDateInput && jobBoroughSelect) {
    clearJobBtn.addEventListener("click", (event) => {
      event.preventDefault();
      jobTitleInput.value = "";
      jobSalaryInput.value = "";
      jobStartDateInput.value = "";
      jobBoroughSelect.value = "";
      jobTitleInput.focus();
    });
  }
});
