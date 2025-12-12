import { Router } from "express";
import { applyXSS, checkString } from "../helpers.js";
import { getUserById, updateUserResume, addJobHistory } from "../data/user.js";
import { getDropdownOptions } from "../data/openJobs.js";

const router = Router();
const pageTitle = "My Info";
const boroughs = ["", "Manhattan", "Brooklyn", "Queens", "Bronx"];

async function buildAccountViewModel(userId, extras = {}) {
  const user = await getUserById(userId);
  const dropdownOptions = await getDropdownOptions();

  const resumeRaw = user.resume || "";
  const hasResume = resumeRaw.trim().length > 0;

  const heldJobsRaw = Array.isArray(user.heldJobs) ? user.heldJobs : [];
  const heldJobs = heldJobsRaw.map((j) => {
    let startDateValue = "";
    if (j.startDate instanceof Date) startDateValue = j.startDate.toISOString().slice(0, 10);
    else if (typeof j.startDate === "string" && j.startDate.length >= 10) startDateValue = j.startDate.slice(0, 10);

    return {
      _id: j._id?.toString?.() || "",
      title: j.title || "",
      salary: typeof j.salary === "number" ? j.salary : "",
      startDate: startDateValue,
      borough: j.borough || "",
      currentJob: !!j.currentJob
    };
  });

  heldJobs.sort((a, b) => (b.currentJob - a.currentJob));

  const jobBoroughValue = extras.jobBoroughValue || "";
  return {
    title: pageTitle,
    cssFile: "myinfo.css",

    resumeText: resumeRaw,
    hasResume,

    currentUser: {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      borough: user.borough,
      age: user.age,
      public: user.public
    },

    // Add-job form values (for re-render on error)
    jobTitleValue: extras.jobTitleValue || "",
    jobSalaryValue: extras.jobSalaryValue || "",
    jobStartDateValue: extras.jobStartDateValue || "",
    jobBoroughValue,
    jobBoroughIsManhattan: jobBoroughValue === "Manhattan",
    jobBoroughIsBrooklyn: jobBoroughValue === "Brooklyn",
    jobBoroughIsQueens: jobBoroughValue === "Queens",
    jobBoroughIsBronx: jobBoroughValue === "Bronx",
    jobIsCurrent: !!extras.jobIsCurrent,

    // Suggestions
    jobTitles: dropdownOptions.titles,

    // Job history list
    heldJobs,
    hasJobs: heldJobs.length > 0,

    resumeError: null,
    jobError: null,

    ...extras
  };
}

router.get("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");

  try {
    const viewModel = await buildAccountViewModel(req.session.user._id);
    viewModel.resumeText = applyXSS(viewModel.resumeText);
    return res.render("account", viewModel);
  } catch (e) {
    return res.status(500).render("account", {
      title: pageTitle,
      cssFile: "myinfo.css",
      resumeError: "Could not load your info."
    });
  }
});

router.post("/resume", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");

  req.body = applyXSS(req.body);
  let { resumeText } = req.body;

  try {
    resumeText = checkString(resumeText, "resume");
    await updateUserResume(req.session.user._id, resumeText);
    return res.redirect("/account");
  } catch (e) {
    const viewModel = await buildAccountViewModel(req.session.user._id, {
      resumeError: e.toString(),
      resumeText: applyXSS(resumeText),
      hasResume: resumeText && resumeText.trim().length > 0
    });
    return res.status(400).render("account", viewModel);
  }
});

// NEW: add job to history
router.post("/jobs", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");

  req.body = applyXSS(req.body);

  let { jobTitle, salary, startDate, borough, currentJob } = req.body;

  try {
    jobTitle = checkString(jobTitle, "job title").trim();
    if (jobTitle.length === 0) throw "Error: job title is required";
    if (jobTitle.length > 100) throw "Error: job title is too long";

    if (borough && !boroughs.includes(borough)) {
      throw "Error: invalid borough";
    }

    await addJobHistory(req.session.user._id, {
      title: jobTitle,
      salary,
      startDate,
      borough: borough || "",
      currentJob: !!currentJob
    });

    return res.redirect("/account");
  } catch (e) {
    const viewModel = await buildAccountViewModel(req.session.user._id, {
      jobError: e.toString(),
      jobTitleValue: jobTitle || "",
      jobSalaryValue: salary || "",
      jobStartDateValue: startDate || "",
      jobBoroughValue: borough || "",
      jobIsCurrent: !!currentJob
    });
    return res.status(400).render("account", viewModel);
  }
});

export default router;
