const jwt = require('jsonwebtoken');
const db = require('../config/database');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'You are not logged in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { protect };