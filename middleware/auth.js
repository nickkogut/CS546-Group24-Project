// middleware/auth.js
export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(403).json({ error: "You must be logged in to access this resource." });
  }
  next();
};

export const vars = (req, res, next) => {
  res.locals.isAuthenticated = !!req.session.user;
  res.locals.currentUser = req.session.user || null;
  next();
}