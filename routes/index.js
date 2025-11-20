const constructorMethod = (app) => {
  app.get('/', (req, res) => {
    res.render('home', {title: 'Home | CareerScope NYC'});
  });

  app.get('/jobs', (req, res) => {
    res.render('jobs', {title: 'Jobs | CareerScope NYC'});
  });

  app.get('/compare', (req, res) => {
    res.render('compare', {title: 'Compare | CareerScope NYC'});
  });

  app.get('/account', (req, res) => {
    res.render('account', {title: 'My Account | CareerScope NYC'});
  });

  app.use((req, res) => {
    res.status(404).json({error: 'Route Not found'});
  });
};

export default constructorMethod;
