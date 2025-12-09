import { Router } from "express";
import { filterJobs, getDropdownOptions } from "../data/openJobs.js";
import { applyXSS } from "../helpers.js";
import { users } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";

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
        return res.render('jobs', { title: pageTitle, error: e, isAuthenticated });
    }
});


router.post("/search", async (req, res) => {
    let searchFields = req.body;
    searchFields = applyXSS(searchFields);

    let isAuthenticated = false;
    let usersCollection;
    let user;
    if (req.session.user) {
        isAuthenticated = true;
        usersCollection = await users();
        user = await usersCollection.findOne({ _id: new ObjectId(req.session.user._id) });
        if (!user) throw "Error: failed to find logged in user";
        searchFields.userId = user._id.toString();
    }

    if (Boolean(searchFields.useResume)) {
        if (!isAuthenticated) {
            // If an unauthenticated user clicks "search with my resume" redirect them to the login page
            return res.json({ redirect: '/auth/login' }).status(401);
        } else {
            // Find the user's resume
            if (!user.resume) throw "Error: you have not supplied a resume. Please enter one on your profile or click 'Search' to search without it" // should this just redirect to the account page?
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