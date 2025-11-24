import jobCompareRoutes from './jobCompare.js';
import openJobRoutes from './openJobs.js';


const constructorMethod = (app) => {
  app.get('/', (req, res) => {
    res.render('home', { title: 'Home | CareerScope NYC' });
  });

  app.use('/jobs', openJobRoutes);

  app.use('/compare', jobCompareRoutes);

  app.get('/account', (req, res) => {
    res.render('account', { title: 'My Account | CareerScope NYC' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route Not found' });
  });
};

export default constructorMethod;
