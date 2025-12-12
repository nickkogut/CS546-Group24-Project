import { Router } from "express";
import { applyXSS, checkString } from "../helpers.js";
import { users } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { addTaggedJob, removeTaggedJob, getMatchingTaggedJobs } from "../data/user.js";

const router = Router();

router.post("/updateTag", async (req, res) => {
    try {
        if (!req.session.user) throw "Error: user is not logged in";
        let body = req.body;
        body = applyXSS(body);

        if (!body) throw "Error: no fields supplied";

        body.applicationStatus = body.applicationStatus || ""; // can be empty to indicate removal
        body.jobId = checkString(body.jobId);
        body.notes = body.notes || ""; // can be empty
        body.confidence = Number(body.confidence);

        if (!ObjectId.isValid(body.jobId)) throw "Error: invalid ObjectId";
        if (body.notes.length > 500) throw "Error: notes must be <= 500 chars";
        if (body.confidence < 1 | body.confidence > 10) throw "Error: confidence must be 1-10";

        if (body.applicationStatus === "") {
            await removeTaggedJob(req.session.user._id, body.jobId);
        } else {
            await addTaggedJob(req.session.user._id,
                {
                    jobId: body.jobId,
                    applicationStatus: body.applicationStatus,
                    notes: body.notes,
                    confidence: body.confidence
                }
            );
        }
        return res.json({ success: true }).status(200);

    } catch (e) {
        return res.json({ error: e.toString() }).status(404);
    }
});

router.post("/getTaggedJobs", async (req, res) => {
    try {
        let body = req.body;
        body = applyXSS(body);
        if (!req.session.user) throw "Error: user is not logged in";
        const userId = req.session.user._id;

        let jobIds = body.jobIds;
        if (!jobIds) throw "Error: no job Ids provided";
        jobIds.map((jobId) => {
            return checkString(jobId);
        });

        const result = await getMatchingTaggedJobs(userId, jobIds);
        if (!result) throw "Error: failed to get matching jobs";

        return res.json(result).status(200);
    } catch (e) {
        return res.json({ error: e.toString() }).status(404);
    }
});

export default router;