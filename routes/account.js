// routes/account.js
import { Router } from "express";
import { users as usersCollection } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { checkString } from "../helpers.js";
import { updateUserResume } from "../data/user.js"; 

const router = Router();

router.get("/", async (req, res) => {
  if (!req.session.user) {
    return res.render("account", {
      title: "My Info",
      showAuthPrompt: true
    });
  }

  try {
    const users = await usersCollection();
    const userDoc = await users.findOne({
      _id: new ObjectId(req.session.user._id)
    });

    const resumeText = userDoc?.resume || "";

    return res.render("account", {
      title: "My Info",
      resumeText
    });
  } catch (e) {
    return res.status(500).render("account", {
      title: "My Info",
      error: "Could not load your info. Please try again."
    });
  }
});

router.post("/resume", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  let { resumeText } = req.body;

  try {
    resumeText = checkString(resumeText, "resume");

    await updateUserResume(req.session.user._id, resumeText);
    return res.redirect("/account");
  } catch (e) {
    return res.status(400).render("account", {
      title: "My Info",
      error: e.toString(),
      resumeText
    });
  }
});

export default router;

