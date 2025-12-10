import { Router } from "express";
import {
  getAllPayrollTitles,
  getPayrollSalaries,
  getCareerTransitions,
  getJobStats,
  getAllSalariesForJob,
  getJobListingUrl,
} from "../data/payrollJobs.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const titles = await getAllPayrollTitles();
    res.render("compare", { title: "Compare Salaries", jobs: titles });
  } catch (e) {
    res.render("compare", {
      title: "Compare Salaries",
      jobs: [],
      error: e.toString(),
    });
  }
});

router.post("/data", async (req, res) => {
  try {
    const { jobTitle } = req.body;
    if (!jobTitle)
      return res.status(400).json({ error: "Missing jobTitle" });

    const salaries = await getPayrollSalaries(jobTitle);
    res.json({ salaries });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

router.post("/transitions", async (req, res) => {
  try {
    const { fromTitle } = req.body;
    if (!fromTitle)
      return res.status(400).json({ error: "fromTitle is required" });

    const transitions = await getCareerTransitions(fromTitle, 10);
    res.json({ transitions });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

router.post("/compareJobs", async (req, res) => {
  try {
    const { titleA, titleB, filters } = req.body;
    if (!titleA || !titleB)
      return res.status(400).json({ error: "titleA and titleB are required" });

    const f = filters || {};
    const [aStats, bStats] = await Promise.all([
      getJobStats(titleA, f),
      getJobStats(titleB, f),
    ]);

    function pctDiff(a, b) {
      if (!a || a === 0 || !b) return null;
      return ((b - a) / a) * 100;
    }

    const diffs = {
      avgPct: pctDiff(aStats.avg, bStats.avg),
      medianPct: pctDiff(aStats.median, bStats.median),
      minPct: pctDiff(aStats.min, bStats.min),
      maxPct: pctDiff(aStats.max, bStats.max),
      countPct: pctDiff(aStats.count, bStats.count),
    };

    res.json({ a: aStats, b: bStats, diffs });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

router.post("/graphData", async (req, res) => {
  try {
    const { title, filters } = req.body;
    if (!title)
      return res.status(400).json({ error: "title is required" });

    const salaries = await getAllSalariesForJob(title, filters || {});
    const listingUrl = await getJobListingUrl(title);

    res.json({ salaries, listingUrl });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

export default router;
