// routes/index.js

import userRoutes from "./user.js";
import openJobsRoutes from "./openJobs.js";
// import payrollRoutes from "./payroll.js";
// import analysisRoutes from "./analysis.js";
import authRoutes from "./auth.js";
import { requireAuth } from "../middleware/auth.js";
import jobCompareRoutes from './jobCompare.js';
import accountRoutes from './account.js';
import { vars} from '../middleware/auth.js';


const constructorMethod = (app) => {

  // login / register / forgot password do not require login
  app.use(vars);
  app.use("/auth", authRoutes);

  // The following routes require login
  // app.use("/users", requireAuth, usersRoutes);
  // app.use("/openJobs", requireAuth, openJobsRoutes);
  // app.use("/payroll", requireAuth, payrollRoutes);
  // app.use("/analysis", requireAuth, analysisRoutes);

  app.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
  });

  app.use('/jobs', openJobsRoutes);
  app.use('/compare', jobCompareRoutes);
  app.use('/user', userRoutes);

  app.use('/account', accountRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Route Not found' });
  });
};

export default constructorMethod;