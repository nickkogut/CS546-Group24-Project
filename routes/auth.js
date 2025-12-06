// routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { users, passwordResetTokens } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { checkString } from "../helpers.js";
import { sendResetEmail } from "../config/email.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const SALT_ROUNDS = 10;

// register
// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    let { firstName, lastName, email, password, borough, age } = req.body;

    firstName = checkString(firstName);
    lastName = checkString(lastName);
    email = checkString(email).toLowerCase();
    password = checkString(password);

    if (!borough) borough = "Unknown";

    const ageNum = parseInt(age);
    if (Number.isNaN(ageNum) || ageNum <= 0) {
      return res.status(400).json({ error: "Invalid age" });
    }

    const usersCol = await users();

    const existing = await usersCol.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      firstName,
      lastName,
      email,
      borough,
      age: ageNum,
      hashedPassword,
      public: true,
      resume: "",
      heldJobs: [],
      taggedJobs: []
    };

    const insertInfo = await usersCol.insertOne(newUser);
    if (!insertInfo.insertedId) {
      throw "Could not create user";
    }

    newUser._id = insertInfo.insertedId;

    // After registration, log in directly
    req.session.user = {
      _id: newUser._id.toString(),
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    };

    res.status(201).json({ message: "User registered and logged in", user: req.session.user });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// login
// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    email = checkString(email).toLowerCase();
    password = checkString(password);

    const usersCol = await users();
    const user = await usersCol.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.hashedPassword);
    if (!match) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    res.json({ message: "Logged in", user: req.session.user });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// logout
// POST /auth/logout
router.post("/logout", async (req, res) => {
  if (!req.session.user) {
    return res.status(200).json({ message: "Already logged out" });
  }
  req.session.destroy(() => {
    res.clearCookie("AuthCookie");
    return res.json({ message: "Logged out" });
  });
});

// forgot password: send email
// POST /auth/forgot
router.post("/forgot", async (req, res) => {
  try {
    let { email } = req.body;
    email = checkString(email).toLowerCase();

    const usersCol = await users();
    const user = await usersCol.findOne({ email });
    if (!user) {
      // For security, do not reveal that the account does not exist
      return res.json({ message: "If this email is registered, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const tokensCol = await passwordResetTokens();
    await tokensCol.insertOne({
      userId: user._id,
      token,
      expiresAt,
      used: false
    });

    // Reset link (frontend should have a corresponding page)
    const resetLink = `http://localhost:3000/reset-password/${token}`;

    await sendResetEmail(email, resetLink);

    res.json({ message: "If this email is registered, a reset link has been sent." });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// Verify if token is valid (optional, can be used by frontend to display form)
// GET /auth/reset/:token
router.get("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const tokensCol = await passwordResetTokens();
    const record = await tokensCol.findOne({ token });

    if (!record || record.used) {
      return res.status(400).json({ error: "Invalid or used token" });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    res.json({ message: "Token valid" });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// Actually reset password
// POST /auth/reset/:token  body: { password }
router.post("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    let { password } = req.body;
    password = checkString(password);

    const tokensCol = await passwordResetTokens();
    const record = await tokensCol.findOne({ token });

    if (!record || record.used) {
      return res.status(400).json({ error: "Invalid or used token" });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    const usersCol = await users();
    const user = await usersCol.findOne({ _id: new ObjectId(record.userId) });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { hashedPassword } }
    );

    // Mark token as used
    await tokensCol.updateOne({ _id: record._id }, { $set: { used: true } });

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// GET /login
router.get("/login", (req, res) => {
  res.render("login", {
    title: "Login",
    cssFile: "login.css",
    jsFile: "login.js",
    error: req.query.error,
    msg: req.query.msg
  });
});


// GET /register
router.get("/register", (req, res) => {
  res.render("register", {
    title: "Register",
    cssFile: "register.css",
    jsFile: "register.js",
    error: req.query.error,
    msg: req.query.msg
  });
});

// GET /forgot
router.get("/forgot", (req, res) => {
  res.render("forgot", {
    title: "Forgot Password",
    cssFile: "forgot.css",
    jsFile: "forgot.js",
    error: req.query.error,
    msg: req.query.msg
  });
});

// GET /reset/:token
router.get("/reset/:token", (req, res) => {
  res.render("reset", {
    title: "Reset Password",
    cssFile: "reset.css",
    jsFile: "reset.js",
    token: req.params.token,
    error: req.query.error,
    msg: req.query.msg
  });
});

export default router;