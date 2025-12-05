import { Router } from "express";
import { filterJobs, getDropdownOptions } from "../data/openJobs.js";
import { applyXSS } from "../helpers.js";

const router = Router();
const pageTitle = 'Jobs | CareerScope NYC';

router.get("/", async (req, res) => {
    try {
        const searchResponse = await filterJobs({ page: 1, numPerPage: 10 });
        const dropdownOptions = await getDropdownOptions();

        // If user is authenticated, include dropdown to search by tagged jobs
        let isAuthenticated = false;
        if (req.session.user) {
            isAuthenticated = true;
        }

        return res.render('jobs', { title: pageTitle, jobs: searchResponse.jobs, pageInfo: searchResponse.pageInfo, dropdownOptions: dropdownOptions, isAuthenticated });
    } catch (e) {
        return res.render('jobs', { title: pageTitle, error: e }).status(500);
    }
});


router.post("/search", async (req, res) => {
    let searchFields = req.body;
    searchFields = applyXSS(searchFields);

    if (Boolean(searchFields.useResume)) {
        if (!req.session.user) {
            // If an unauthenticated user clicks "search with my resume" redirect them to the login page
            return res.render('login');
        } else {
            // Find the user's resume
            const users = await users();
            const user = await users.find({ _id: req.session.user._id });
            if (!user) throw "Error: failed to find logged in user";
            if (!user.resume) throw "Error: you have not supplied a resume. Please enter one on your profile or search without it" // should this just redirect to the account page?

            searchFields.resume = user.resume;
        }
    }

    try {
        const searchResponse = await filterJobs(searchFields);
        return res.json(searchResponse);
    } catch (e) {
        return res.json({ error: e.toString() }).status(404);
    }
});

export default router;