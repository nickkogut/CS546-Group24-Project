// routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { users, passwordResetTokens } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { checkString, applyXSS } from "../helpers.js";
import { sendResetEmail } from "../config/email.js";

const router = Router();
const SALT_ROUNDS = 10;

// login user should not see login / register
const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.user) {
    // You can change this to "/" or "/home" or something similar
    return res.redirect("/");
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect(
      "/auth/login?error=" + encodeURIComponent("Please log in first.")
    );
  }
  next();
};

// ---------------------------
// POST /auth/register
// ---------------------------
router.post("/register", async (req, res) => {
  try {
    let {
      firstName,
      lastName,
      email,
      password,
      age,
      borough,
      publicProfile
    } = req.body;

    firstName = checkString(firstName);
    lastName = checkString(lastName);
    email = checkString(email).toLowerCase();
    password = checkString(password);

    // borough optional
    if (borough && borough.trim() !== "") {
      borough = checkString(borough);
    } else {
      borough = "Unknown";
    }

    let ageNum = null;
    if (age && age.trim() !== "") {
      ageNum = parseInt(age);
      if (Number.isNaN(ageNum) || ageNum <= 0) {
        return res.redirect(
          "/auth/register?error=" +
            encodeURIComponent("Age must be a positive integer.")
        );
      }
    }

    const usersCol = await users();

    const existing = await usersCol.findOne({ email });
    if (existing) {
      return res.redirect(
        "/auth/register?error=" +
          encodeURIComponent("Email is already registered.")
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Determine if public profile is checked
    const isPublic = publicProfile === "on";

    const newUser = {
      firstName,
      lastName,
      email,
      age: ageNum,
      hashedPassword,
      public: isPublic,
      resume: "",
      heldJobs: [],
      taggedJobs: [],
    };

    const insertInfo = await usersCol.insertOne(newUser);
    if (!insertInfo.insertedId) {
      throw "Could not create user";
    }

    // Registration successful → redirect to login page
    return res.redirect(
      "/auth/login?msg=" +
        encodeURIComponent("Account created successfully. Please log in.")
    );
  } catch (e) {
    return res.redirect(
      "/auth/register?error=" + encodeURIComponent(e.toString())
    );
  }
});

// ---------------------------
// POST /auth/login
// ---------------------------
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    email = checkString(email).toLowerCase();
    password = checkString(password);

    const usersCol = await users();
    const user = await usersCol.findOne({ email });
    if (!user) {
      return res.redirect(
        "/auth/login?error=" +
          encodeURIComponent("Invalid email or password.")
      );
    }

    const match = await bcrypt.compare(password, user.hashedPassword);
    if (!match) {
      return res.redirect(
        "/auth/login?error=" +
          encodeURIComponent("Invalid email or password.")
      );
    }

    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Login successful → redirect to home page or dashboard
    return res.redirect("/");
  } catch (e) {
    return res.redirect(
      "/auth/login?error=" + encodeURIComponent(e.toString())
    );
  }
});

// ---------------------------
// GET /auth/logout
// ---------------------------
router.get("/logout", async (req, res) => {
  if (!req.session.user) {
    return res.redirect(
      "/auth/login?msg=" + encodeURIComponent("You are already logged out.")
    );
  }
  req.session.destroy(() => {
    res.clearCookie("AuthCookie");
    return res.redirect(
      "/auth/login?msg=" + encodeURIComponent("You have been logged out.")
    );
  });
});

// ---------------------------
// POST /auth/forgot  send reset email
// ---------------------------
router.post("/forgot", async (req, res) => {
  try {
    let { email } = req.body;
    email = checkString(email).toLowerCase();

    const usersCol = await users();
    const user = await usersCol.findOne({ email });
    if (!user) {
      // Do not reveal whether the account exists
      return res.redirect(
        "/auth/forgot?msg=" +
          encodeURIComponent(
            "If this email is registered, a reset link has been sent."
          )
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const tokensCol = await passwordResetTokens();
    await tokensCol.insertOne({
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    // Reset link: change to actual route /auth/reset/:token
    const resetLink = `http://localhost:3000/auth/reset/${token}`;

    await sendResetEmail(email, resetLink);

    return res.redirect(
      "/auth/forgot?msg=" +
        encodeURIComponent(
          "If this email is registered, a reset link has been sent."
        )
    );
  } catch (e) {
    return res.redirect(
      "/auth/forgot?error=" + encodeURIComponent(e.toString())
    );
  }
});

// ---------------------------
// GET /auth/reset/:token  show reset page
// ---------------------------
router.get("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const tokensCol = await passwordResetTokens();
    const record = await tokensCol.findOne({ token });

    if (!record || record.used || record.expiresAt < new Date()) {
      return res.render("reset", {
        title: "Reset Password",
        cssFile: "reset.css",
        jsFile: "reset.js",
        error: "This reset link is invalid or has expired.",
      });
    }

    return res.render("reset", {
      title: "Reset Password",
      cssFile: "reset.css",
      jsFile: "reset.js",
      token,
      error: req.query.error,
      msg: req.query.msg,
    });
  } catch (e) {
    return res.render("reset", {
      title: "Reset Password",
      cssFile: "reset.css",
      jsFile: "reset.js",
      error: e.toString(),
    });
  }
});

// ---------------------------
// POST /auth/reset/:token
// ---------------------------
router.post("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    let { password } = req.body;
    password = checkString(password);

    const tokensCol = await passwordResetTokens();
    const record = await tokensCol.findOne({ token });

    if (!record || record.used || record.expiresAt < new Date()) {
      return res.redirect(
        "/auth/reset/" +
          token +
          "?error=" +
          encodeURIComponent("This reset link is invalid or has expired.")
      );
    }

    const usersCol = await users();
    const user = await usersCol.findOne({
      _id: new ObjectId(record.userId),
    });
    if (!user) {
      return res.redirect(
        "/auth/reset/" +
          token +
          "?error=" +
          encodeURIComponent("User not found.")
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { hashedPassword } }
    );

    await tokensCol.updateOne(
      { _id: record._id },
      { $set: { used: true } }
    );

    return res.redirect(
      "/auth/login?msg=" +
        encodeURIComponent("Password reset successful. Please log in.")
    );
  } catch (e) {
    return res.redirect(
      `/auth/reset/${req.params.token}?error=` +
        encodeURIComponent(e.toString())
    );
  }
});


// ---------------------------
// POST /auth/profile  update profile
// ---------------------------
router.post("/profile", requireAuth, async (req, res) => {
  try {
    let body = applyXSS(req.body);

    let { firstName, lastName, borough, age, publicProfile } = body;

    firstName = checkString(firstName);
    lastName = checkString(lastName);

    if (borough && borough.trim() !== "") {
      borough = checkString(borough);
    } else {
      borough = "Unknown";
    }

    let ageNum = null;
    if (age && age.toString().trim() !== "") {
      ageNum = parseInt(age, 10);
      if (Number.isNaN(ageNum) || ageNum <= 0) {
        return res.redirect("/auth/profile?error=" + encodeURIComponent("Age must be a positive integer."));
      }
    }

    const isPublic = publicProfile === "on";

    const usersCol = await users();
    const userId = new ObjectId(req.session.user._id);

    await usersCol.updateOne(
      { _id: userId },
      { $set: { firstName, lastName, borough, age: ageNum, public: isPublic } }
    );

    // sync session display
    req.session.user.firstName = firstName;
    req.session.user.lastName = lastName;

    return res.redirect("/auth/profile?msg=" + encodeURIComponent("Profile updated successfully."));
  } catch (e) {
    return res.redirect("/auth/profile?error=" + encodeURIComponent(e.toString()));
  }
});


// ---------------------------
// GET Pages (Handlebars)
// ---------------------------

// GET /auth/login
router.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login", {
    title: "Login",
    cssFile: "login.css",
    jsFile: "login.js",
    error: req.query.error,
    msg: req.query.msg,
  });
});

// GET /auth/register
router.get("/register", redirectIfLoggedIn, (req, res) => {
  res.render("register", {
    title: "Register",
    cssFile: "register.css",
    jsFile: "register.js",
    error: req.query.error,
    msg: req.query.msg,
  });
});

// GET /auth/forgot
router.get("/forgot", (req, res) => {
  res.render("forgot", {
    title: "Forgot Password",
    cssFile: "forgot.css",
    jsFile: "forgot.js",
    error: req.query.error,
    msg: req.query.msg,
  });
});

// GET /auth/profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const usersCol = await users();

    const user = await usersCol.findOne({
      _id: new ObjectId(req.session.user._id),
    });

    if (!user) {
      return res.redirect(
        "/auth/login?error=" +
          encodeURIComponent("User not found. Please log in again.")
      );
    }

    return res.render("profile", {
      title: "My Profile",
      cssFile: "register.css", // reuse register.css
      jsFile: "profile.js",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        borough: user.borough,
        age: user.age,
        public: user.public,
      },
      error: req.query.error,
      msg: req.query.msg,
    });
  } catch (e) {
    return res.render("error", {
      title: "Error",
      statusCode: 500,
      error: e.toString(),
    });
  }
});


export default router;
