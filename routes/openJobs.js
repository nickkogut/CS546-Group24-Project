import { Router } from "express";
import { filterJobs, getDropdownOptions } from "../data/openJobs.js";

const router = Router();
const pageTitle = 'Jobs | CareerScope NYC';

router.get("/", async (req, res) => {
    try {
        const searchResponse = await filterJobs({ page: 1, numPerPage: 10 });
        const dropdownOptions = await getDropdownOptions();
        res.render('jobs', { title: pageTitle, jobs: searchResponse.jobs, pageInfo: searchResponse.pageInfo, dropdownOptions: dropdownOptions });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

router.post("/", async (req, res) => {
    const searchFields = req.body;

    try {
        const searchResponse = await filterJobs(searchFields);
        const dropdownOptions = await getDropdownOptions();
        res.render('jobs', { title: pageTitle, jobs: searchResponse.jobs, pageInfo: searchResponse.pageInfo, dropdownOptions: dropdownOptions });
    } catch (e) {
        // TODO: render error page / message
        res.status(500).json({ error: e.toString() }); // should this throw 404 if no jobs match?
    }
});



export default router;