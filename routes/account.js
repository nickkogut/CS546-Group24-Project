import { Router } from "express";
import { applyXSS, checkString } from "../helpers.js";
import { getUserById, updateUserResume, updateCurrentJob } from "../data/user.js";
import { getDropdownOptions } from "../data/openJobs.js";

const router = Router();
const pageTitle = "My Info | CareerScope NYC";

async function buildAccountViewModel(userId, extras = {}) {
  const user = await getUserById(userId);
  const dropdownOptions = await getDropdownOptions();

  const currentJob = user.currentJob || {};
  const borough = currentJob.borough || "";

  let startDateValue = "";
  if (currentJob.startDate instanceof Date) {
    startDateValue = currentJob.startDate.toISOString().slice(0, 10);
  } else if (
    typeof currentJob.startDate === "string" &&
    currentJob.startDate.length >= 10
  ) {
    startDateValue = currentJob.startDate.slice(0, 10);
  }

  const resumeRaw = user.resume || "";
  const hasResume = resumeRaw.trim().length > 0;

  let salary = currentJob.salary;
  if (typeof salary !== "number") {
    salary = "";
  }
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
    currentJobTitle: currentJob.title || "",
    currentJobSalary: salary,
    currentJobStartDate: startDateValue,
    currentJobBorough: borough,
    boroughIsManhattan: borough === "Manhattan",
    boroughIsBrooklyn: borough === "Brooklyn",
    boroughIsQueens: borough === "Queens",
    boroughIsBronx: borough === "Bronx",
    boroughIsStatenIsland: borough === "Staten Island",

    jobTitles: dropdownOptions.titles,

    resumeError: null,
    jobError: null,

    ...extras
  };
}

router.get("/", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

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
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  req.body = applyXSS(req.body);

  let { resumeText } = req.body;

  try {
    resumeText = checkString(resumeText, "resume");

    await updateUserResume(req.session.user._id, resumeText);
    return res.redirect("/account");
  } catch (e) {
    try {
      const viewModel = await buildAccountViewModel(req.session.user._id, {
        resumeError: e.toString(),
        resumeText: applyXSS(resumeText),
        hasResume: resumeText && resumeText.trim().length > 0
      });
      return res.status(400).render("account", viewModel);
    } catch {
      return res.status(500).render("account", {
        title: pageTitle,
        cssFile: "myinfo.css",
        resumeError: "Could not update resume."
      });
    }
  }
});

router.post("/current-job", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  req.body = applyXSS(req.body);

  let { jobTitle, salary, startDate, borough } = req.body;

  try {
    jobTitle = checkString(jobTitle, "job title");
    jobTitle = jobTitle.trim();
    if (jobTitle.length === 0) {
      throw "Error: job title is required";
    }
    if (jobTitle.length > 100) {
      throw "Error: job title is too long";
    }

    let salaryNum = null;
    if (salary && salary.trim() !== "") {
      const parsed = Number(salary);
      if (parsed < 0) {
        throw "Error: salary must be a non-negative number";
      }
      salaryNum = parsed;
    }

    let startDateVal = null;
    if (startDate && startDate.trim() !== "") {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) {
        throw "Error: invalid start date";
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d > today) {
        throw "Error: start date cannot be in the future";
      }
      startDateVal = d;
    }

    let boroughClean = "";
    if (borough && borough.trim() !== "") {
      boroughClean = checkString(borough, "borough");
    }

    await updateCurrentJob(req.session.user._id, {
      title: jobTitle,
      salary: salaryNum,
      startDate: startDateVal,
      borough: boroughClean
    });

    return res.redirect("/account");
  } catch (e) {
    try {
      const viewModel = await buildAccountViewModel(req.session.user._id, {
        jobError: e.toString(),
        currentJobTitle: jobTitle,
        currentJobSalary: salary,
        currentJobStartDate: startDate,
        currentJobBorough: borough
      });
      return res.status(400).render("account", viewModel);
    } catch {
      return res.status(500).render("account", {
        title: pageTitle,
        cssFile: "myinfo.css",
        jobError: "Could not update current job."
      });
    }
  }
});

export default router;
