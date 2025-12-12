import { Router } from "express";
import { applyXSS, checkString } from "../helpers.js";
import { ObjectId } from "mongodb";
import { addTaggedJob, removeTaggedJob, getUserById } from "../data/user.js";

const router = Router();

router.post("/updateTag", async (req, res) => {
  let body = req.body;
  body = applyXSS(body);

  if (!body) throw "Error: no fields supplied";
  body.applicationStatus = body.applicationStatus || "";
  body.jobId = checkString(body.jobId);
  body.notes = body.notes || "";
  body.confidence = Number(body.confidence);

  if (!ObjectId.isValid(body.jobId)) throw "Error: invalid ObjectId";
  if (body.notes.length > 500) throw "Error: notes must be <= 500 chars";
  if (body.confidence < 1 || body.confidence > 10) throw "Error: confidence must be 1-10";
  if (!req.session.user) throw "Error: user is not logged in";

  try {
    if (body.applicationStatus === "") {
      await removeTaggedJob(req.session.user._id, body.jobId);
    } else {
      await addTaggedJob(req.session.user._id, {
        jobId: body.jobId,
        applicationStatus: body.applicationStatus,
        notes: body.notes,
        confidence: body.confidence
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(404).json({ error: e.toString() });
  }
});

// NEW: public profile view
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(404).render("profile", { title: "Profile Not Found", notFound: true });
  }

  // if you hit your own public url, redirect to your editable page
  if (req.session.user && req.session.user._id === id) {
    return res.redirect("/account");
  }

  try {
    const user = await getUserById(id);

    if (!user.public) {
      return res.status(404).render("profile", { title: "Profile Not Found", notFound: true });
    }

    const heldJobsRaw = Array.isArray(user.heldJobs) ? user.heldJobs : [];
    const heldJobs = heldJobsRaw.map((j) => {
      let startDateValue = "";
      if (j.startDate instanceof Date) startDateValue = j.startDate.toISOString().slice(0, 10);
      else if (typeof j.startDate === "string" && j.startDate.length >= 10) startDateValue = j.startDate.slice(0, 10);

      return {
        title: applyXSS(j.title || ""),
        salary: typeof j.salary === "number" ? j.salary : "",
        startDate: startDateValue,
        borough: applyXSS(j.borough || ""),
        currentJob: !!j.currentJob
      };
    });

    heldJobs.sort((a, b) => (b.currentJob - a.currentJob));

    return res.render("profile", {
      title: `${user.firstName} ${user.lastName} | Profile`,
      notFound: false,
      profileUser: {
        firstName: applyXSS(user.firstName),
        lastName: applyXSS(user.lastName),
        borough: applyXSS(user.borough || "")
      },
      heldJobs,
      hasJobs: heldJobs.length > 0,
      isAuthenticated: !!req.session.user
    });
  } catch {
    return res.status(404).render("profile", { title: "Profile Not Found", notFound: true });
  }
});

export default router;
