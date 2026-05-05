// routes/securityRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SecurityBot = require('../services/securityBot');
const db = require('../config/database');

let securityBot = null;

// Initialize security bot (call this from app.js)
function initSecurityBot() {
  if (!securityBot) {
    securityBot = new SecurityBot();
    securityBot.start();
  }
  return securityBot;
}

// Get security bot instance
function getSecurityBot() {
  return securityBot;
}

// Admin routes (protected)
router.get('/stats', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  if (!securityBot) {
    return res.status(503).json({ error: 'Security bot not initialized' });
  }
  
  const stats = await securityBot.getStats();
  res.json({ success: true, stats });
});

router.get('/events', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  const limit = parseInt(req.query.limit) || 50;
  
  db.all(`
    SELECT * FROM security_events 
    ORDER BY created_at DESC 
    LIMIT ?
  `, [limit], (err, events) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, events });
  });
});

router.get('/blocked-ips', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  db.all(`
    SELECT * FROM blocked_ips 
    WHERE expires_at > datetime('now')
    ORDER BY created_at DESC
  `, [], (err, ips) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, blockedIPs: ips });
  });
});

router.delete('/unblock/:ip', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  const { ip } = req.params;
  
  db.run('DELETE FROM blocked_ips WHERE ip_address = ?', [ip], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: `IP ${ip} unblocked` });
  });
});

module.exports = { securityRoutes: router, initSecurityBot, getSecurityBot };