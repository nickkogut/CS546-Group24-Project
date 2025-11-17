// app.js
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import constructorMethod from "./routes/index.js";
import { mongoConfig } from "./config/settings.js";

const app = express();

app.use(express.json());

app.use(
  session({
    name: "AuthCookie",
    secret: "super secret session key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoConfig.serverUrl + mongoConfig.database
    }),
    cookie: {
      maxAge: 20 * 60 * 1000 // 20 minutes
    }
  })
);

// Middleware: Detect 20 minutes of inactivity → Logout
app.use((req, res, next) => {
  const now = Date.now();

  if (req.session.user) {
    if (!req.session.lastActivity) {
      req.session.lastActivity = now;
    } else {
      const diff = now - req.session.lastActivity;
      if (diff > 20 * 60 * 1000) {
        // More than 20 minutes of inactivity
        req.session.destroy(() => {
          return res.status(440).json({ error: "Session expired. Please log in again." });
        });
        return;
      }
    }
    // Update last activity time
    req.session.lastActivity = now;
  }
  next();
});

constructorMethod(app);

const port = 3000;
app.listen(port, () => {
  console.log(`NYC Job Analyzer server running on http://localhost:${port}`);
});