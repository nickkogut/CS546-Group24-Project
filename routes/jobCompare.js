import { Router } from "express";
import { getAllPayrollTitles, getPayrollSalaries } from "../data/payrollJobs.js";

const router = Router();

// GET page
router.get("/", async (req, res) => {
  try {
    const titles = await getAllPayrollTitles();
    res.render("compare", { title: "Compare Salaries", jobs: titles });
  } catch (e) {
    console.error(e);
    res.render("compare", { title: "Compare Salaries", jobs: [], error: e.toString() });
  }
});

// POST salary data
router.post("/data", async (req, res) => {
  try {
    const { jobTitle } = req.body;
    if (!jobTitle) return res.status(400).json({ error: "Missing jobTitle" });

    const salaries = await getPayrollSalaries(jobTitle);
    res.json({ salaries });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

export default router;
