// app.js
import express from "express";
import Handlebars from 'handlebars';
import exphbs from 'express-handlebars';
import { mongoConfig } from "./config/settings.js";
import configRoutes from './routes/index.js';
import session from 'express-session';
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
dotenv.config();
const app = express();

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
          res.clearCookie("AuthCookie");
          return res.redirect("/auth/login?error=" + encodeURIComponent("Session expired. Please log in again."));
        });
        return;
      }
    }
    // Update last activity time
    req.session.lastActivity = now;
  }
  next();
});

const staticDir = express.static('public');

const handlebarsInstance = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    asJSON: (obj, spacing) => {
      if (typeof spacing === 'number') {
        return new Handlebars.SafeString(
          JSON.stringify(obj, null, spacing)
        );
      }

      return new Handlebars.SafeString(JSON.stringify(obj));
    },
    eq: (a, b) => String(a) === String(b)
  },
});

app.use('/public', staticDir);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', handlebarsInstance.engine);
app.set('view engine', 'handlebars');
app.use(express.static("public"));
configRoutes(app);

app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});