// services/securityMonitor.js
const db = require('../config/database');
const patterns = require('../config/securityPatterns.json');

class SecurityMonitor {
  constructor() {
    this.attackLogs = [];
    this.setupMiddleware = this.setupMiddleware.bind(this);
  }

  // Middleware to attach to Express
  setupMiddleware(req, res, next) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const url = req.url;
    const body = JSON.stringify(req.body || {}).toLowerCase();
    const query = JSON.stringify(req.query || {}).toLowerCase();
    
    const fullText = `${url} ${body} ${query}`;
    const detectedAttacks = [];

    for (const pattern of patterns.attack_patterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(fullText)) {
        detectedAttacks.push({
          type: pattern.name,
          severity: pattern.severity,
          action: pattern.action,
          details: `Pattern matched: ${pattern.pattern.substring(0, 50)}...`
        });
      }
    }

    // Store attack info on request for later processing
    if (detectedAttacks.length > 0) {
      req.securityThreat = {
        ip: clientIp,
        url,
        attacks: detectedAttacks,
        timestamp: new Date().toISOString()
      };
    }
    
    next();
  }

  async logAttack(attackData) {
    return new Promise((resolve) => {
      db.run(`
        INSERT INTO security_events (event_type, details, ip_address, severity)
        VALUES (?, ?, ?, ?)
      `, [attackData.type, attackData.details, attackData.ip, attackData.severity], function(err) {
        if (err) {
          console.error('Failed to log attack:', err);
          resolve(null);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  getRecentAttacks(limit = 100) {
    return new Promise((resolve) => {
      db.all(`
        SELECT * FROM security_events 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        resolve(err ? [] : rows);
      });
    });
  }
}

module.exports = SecurityMonitor;