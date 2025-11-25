// routes/index.js
import usersRoutes from "./users.js";
import openJobsRoutes from "./openJobs.js";
import payrollRoutes from "./payroll.js";
import analysisRoutes from "./analysis.js";
import authRoutes from "./auth.js";
import { requireAuth } from "../middleware/auth.js";

const constructorMethod = (app) => {

  // login / register / forgot password do not require login
  app.use("/auth", authRoutes);

  // The following routes require login
  app.use("/users", requireAuth, usersRoutes);
  app.use("/openJobs", requireAuth, openJobsRoutes);
  app.use("/payroll", requireAuth, payrollRoutes);
  app.use("/analysis", requireAuth, analysisRoutes);
app.get('/', (req, res) => {
    res.render('home', {title: 'Home | CareerScope NYC'});
  });

  app.get('/jobs', (req, res) => {
    res.render('jobs', {title: 'Jobs | CareerScope NYC'});
  });

  //app.get('/compare', (req, res) => {
 // res.render('compare', {title: 'Compare | CareerScope NYC'});
  //});
   app.use('/compare', jobCompareRoutes);

  app.get('/account', (req, res) => {
    res.render('account', {title: 'My Account | CareerScope NYC'});
  });
  app.use("*", (req, res) => {
    res.status(404).json({ error: "Route Not Found" });
  });
};

export default constructorMethod;