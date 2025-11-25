// app.js
import express from "express";
import { mongoConfig } from "./config/settings.js";
import Handlebars from 'handlebars';
import exphbs from 'express-handlebars';
const app = express();
import configRoutes from './routes/index.js';
import Handlebars from 'handlebars';
import exphbs from 'express-handlebars';
import jobCompareRouter from "./routes/jobCompare.js";
import Handlebars from 'handlebars';
import exphbs from 'express-handlebars';
app.use("/jobCompare", jobCompareRouter);

app.use(express.json());
import jobCompareRouter from "./routes/jobCompare.js";

app.use("/jobCompare", jobCompareRouter);
app.use('/public', staticDir);


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
    }
  },
});

app.use('/public', staticDir);
app.use(express.json());
constructorMethod(app);
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', handlebarsInstance.engine);
app.set('view engine', 'handlebars');

configRoutes(app);

app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});