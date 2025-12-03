import { Router } from "express";
import { filterJobs, getDropdownOptions } from "../data/openJobs.js";
import { applyXSS } from "../helpers.js";

const router = Router();
const pageTitle = 'Jobs | CareerScope NYC';

router.get("/", async (req, res) => {
    try {
        const searchResponse = await filterJobs({ page: 1, numPerPage: 10 });
        const dropdownOptions = await getDropdownOptions();
        return res.render('jobs', { title: pageTitle, jobs: searchResponse.jobs, pageInfo: searchResponse.pageInfo, dropdownOptions: dropdownOptions });
    } catch (e) {
        // res.status(500).json({ error: e.toString() });
        // return res.json({ error: e.toString() }).status(404);
        return res.render('jobs', { title: pageTitle, error: e }).status(500);
    }
});


router.post("/search", async (req, res) => {
    let searchFields = req.body;
    searchFields = applyXSS(searchFields);

    try {
        const searchResponse = await filterJobs(searchFields);
        return res.json(searchResponse);
    } catch (e) {
        return res.json({ error: e.toString() }).status(404);
    }
});



export default router;