// routes/jobCompare.js
import { Router } from "express";
import {
  getAllPayrollTitles,
  getPayrollSalaries,
  getCareerTransitions,
  getJobStats,
  getAllSalariesForJob,
  getJobListingUrl,
  getAdvancedJobList,
  getExperienceStats,
  payrollJobs
} from "../data/payrollJobs.js";

const router = Router();

/* ===============================
   LOAD MAIN COMPARE PAGE
   =============================== */
router.get("/", async (req, res) => {
  try {
    const titles = await getAllPayrollTitles();

    // Load dropdown data for Agency, Borough, and Years
    const col = await payrollJobs();
    const docs = await col
      .find({})
      .project({ borough: 1, agency: 1, startYear: 1, endYear: 1 })
      .toArray();

    const boroughs = [...new Set(docs.map(d => d.borough).filter(Boolean))].sort();
    const agencies = [...new Set(docs.map(d => d.agency).filter(Boolean))].sort();

    const years = [...new Set(
      docs.flatMap(d => [d.startYear, d.endYear])
        .filter(y => Number.isFinite(y) && y > 1900 && y < 2100)
    )].sort((a, b) => a - b);

    res.render("compare", {
      title: "Compare Salaries",
      jobs: titles,
      boroughs,
      agencies,
      years
    });

  } catch (e) {
    res.render("compare", {
      title: "Compare Salaries",
      jobs: [],
      error: e.toString()
    });
  }
});


/* ===============================
   BASIC GRAPH SALARY DATA
   =============================== */
router.post("/data", async (req, res) => {
  try {
    const { jobTitle } = req.body;
    if (!jobTitle) return res.status(400).json({ error: "Missing jobTitle" });

    const salaries = await getPayrollSalaries(jobTitle);
    res.json({ salaries });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});


/* ===============================
   CAREER TRANSITIONS
   =============================== */
router.post("/transitions", async (req, res) => {
  try {
    const { fromTitle } = req.body;
    if (!fromTitle) return res.status(400).json({ error: "fromTitle is required" });

    const transitions = await getCareerTransitions(fromTitle, 10);
    res.json({ transitions });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});


/* ===============================
   SIDE-BY-SIDE JOB COMPARISON
   =============================== */
router.post("/compareJobs", async (req, res) => {
  try {
    const { titleA, titleB, filters } = req.body;
    if (!titleA || !titleB)
      return res.status(400).json({ error: "titleA and titleB required" });

    const f = filters || {};

    const [aStats, bStats] = await Promise.all([
      getJobStats(titleA, f),
      getJobStats(titleB, f)
    ]);

    const pct = (a, b) => {
      if (!a || !b) return null;
      return ((b - a) / a) * 100;
    };

    res.json({
      a: aStats,
      b: bStats,
      diffs: {
        avgPct: pct(aStats.avg, bStats.avg),
        medianPct: pct(aStats.median, bStats.median),
        minPct: pct(aStats.min, bStats.min),
        maxPct: pct(aStats.max, bStats.max),
        countPct: pct(aStats.count, bStats.count)
      }
    });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});


/* ===============================
   GRAPH DATA WITH FILTERS
   =============================== */
router.post("/graphData", async (req, res) => {
  try {
    const { title, filters } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });

    const salaries = await getAllSalariesForJob(title, filters || {});
    const listingUrl = await getJobListingUrl(title);

    res.json({ salaries, listingUrl });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});


/* ===============================
   ADVANCED JOB LIST (fixed)
   =============================== */
router.post("/advancedJobs", async (req, res) => {
  try {
    const { filters } = req.body;

    const jobs = await getAdvancedJobList(filters || {});
    res.json({ jobs });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});


/* ===============================
   EXPERIENCE-BASED SALARY STATS
   =============================== */
router.post("/experienceStats", async (req, res) => {
  try {
    let { title, minYears, maxYears, filters } = req.body;

    if (!title) return res.status(400).json({ error: "title required" });

    // treat blank or null as no bound ("infinity")
    minYears = (minYears === "" || minYears === null || minYears === undefined)
      ? undefined
      : Number(minYears);

    maxYears = (maxYears === "" || maxYears === null || maxYears === undefined)
      ? undefined
      : Number(maxYears);

    const stats = await getExperienceStats(title, minYears, maxYears, filters || {});
    res.json(stats);

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

export default router;
