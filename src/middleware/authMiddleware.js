const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'verxiel_secret';

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}; 

// Admin yetkisi kontrolü
module.exports.requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No token' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
};