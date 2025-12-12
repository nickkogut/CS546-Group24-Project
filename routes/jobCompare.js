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
  getExperienceStats
} from "../data/payrollJobs.js";

import { payrollJobs } from "../config/mongoCollections.js";

const router = Router();

/* ===============================
   LOAD MAIN COMPARE PAGE
   =============================== */
router.get("/", async (req, res) => {
  try {
    const col = await payrollJobs();

    const titles = (await col.distinct("title"))
      .map(t => (t || "").trim())
      .filter(t => t.length > 0)
      .sort((a, b) => a.localeCompare(b));

    const boroughs = (await col.distinct("borough"))
      .filter(Boolean)
      .sort();

    const agencies = (await col.distinct("agency"))
      .filter(Boolean)
      .sort();

    const startYears = await col.distinct("startYear");
    const endYears   = await col.distinct("endYear");

    const years = [...new Set([...startYears, ...endYears])]
      .filter(y => Number.isFinite(y) && y > 1900 && y < 2100)
      .sort((a, b) => a - b);

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
    if (!fromTitle) return res.status(400).json({ error: "fromTitle required" });

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
   ADVANCED JOB LIST 
   =============================== */
router.post("/advancedJobs", async (req, res) => {
  try {
    let { agency, borough, yearFrom, yearTo, minAvgSalary, minCount, page } =
      req.body;

    agency = agency || "";
    borough = borough || "";
    yearFrom = yearFrom ? Number(yearFrom) : null;
    yearTo = yearTo ? Number(yearTo) : null;
    minAvgSalary = minAvgSalary ? Number(minAvgSalary) : null;
    minCount = minCount ? Number(minCount) : null;
    page = page ? Number(page) : 1;

    const filters = {
      agency,
      borough,
      yearFrom,
      yearTo,
      minAvgSalary,
      minCount
    };

    const allJobs = await getAdvancedJobList(filters);

    // Pagination (25 per page)
    const perPage = 25;
    const start = (page - 1) * perPage;
    const paginated = allJobs.slice(start, start + perPage);

    res.json({
      jobs: paginated,
      currentPage: page,
      totalPages: Math.ceil(allJobs.length / perPage),
      totalResults: allJobs.length
    });
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

    minYears = (minYears === "" || minYears == null) ? undefined : Number(minYears);
    maxYears = (maxYears === "" || maxYears == null) ? undefined : Number(maxYears);

    const stats = await getExperienceStats(title, minYears, maxYears, filters || {});
    res.json(stats);

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

export default router;
