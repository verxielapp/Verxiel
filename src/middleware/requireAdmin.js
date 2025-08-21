module.exports = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No token' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
};


