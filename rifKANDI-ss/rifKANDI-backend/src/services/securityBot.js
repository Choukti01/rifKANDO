// services/securityBot.js
const SecurityMonitor = require('./securityMonitor');
const SecurityFighter = require('./securityFighter');
const SecurityAlerter = require('./securityAlerter');
const db = require('../config/database');

class SecurityBot {
  constructor() {
    this.monitor = new SecurityMonitor();
    this.fighter = new SecurityFighter();
    this.alerter = new SecurityAlerter();
    this.isRunning = false;
    this.scanInterval = 10000; // 10 seconds
  }

  // Initialize database tables
  async initDatabase() {
    // Security events table
    db.run(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        severity TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blocked IPs table
    db.run(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL UNIQUE,
        reason TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Rate limits table
    db.run(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL UNIQUE,
        request_count INTEGER DEFAULT 0,
        last_request DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Security bot database tables ready');
  }

  // Process a detected threat
  async processThreat(threat) {
    console.log(`🚨 Threat detected: ${threat.attacks[0].type} from ${threat.ip}`);
    
    for (const attack of threat.attacks) {
      // Log the attack
      await this.monitor.logAttack({
        type: attack.type,
        details: `${attack.details} | URL: ${threat.url}`,
        ip: threat.ip,
        severity: attack.severity
      });

      // Take action
      const actionResult = await this.fighter.takeAction(attack.action, threat.ip, attack.type);

      // Send alert
      await this.alerter.alert({
        type: attack.type,
        ip: threat.ip,
        severity: attack.severity,
        url: threat.url,
        details: attack.details,
        action: actionResult
      });
    }
  }

  // Scan for threats in database (for existing logs)
  async scanDatabaseForThreats() {
    // Look for suspicious patterns in recent database entries
    const suspiciousQueries = [
      { pattern: "%' OR '1'='1%", type: "SQL Injection" },
      { pattern: "%<script>%", type: "XSS" },
      { pattern: "%../../%", type: "Path Traversal" }
    ];

    for (const sq of suspiciousQueries) {
      db.all(`
        SELECT * FROM request_logs 
        WHERE url LIKE ? OR body LIKE ?
        AND created_at > datetime('now', '-1 hour')
      `, [sq.pattern, sq.pattern], async (err, rows) => {
        if (!err && rows && rows.length > 0) {
          for (const row of rows) {
            await this.processThreat({
              ip: row.ip_address,
              url: row.url,
              attacks: [{ type: sq.type, severity: 'high', action: 'block_ip', details: 'Found in database scan' }]
            });
          }
        }
      });
    }
  }

  // Main monitoring loop
  async run() {
    while (this.isRunning) {
      try {
        // Scan for threats
        await this.scanDatabaseForThreats();
        
        // Wait before next scan
        await new Promise(resolve => setTimeout(resolve, this.scanInterval));
      } catch (error) {
        console.error('Security bot error:', error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Start the bot
  async start() {
    if (this.isRunning) return;
    
    await this.initDatabase();
    this.isRunning = true;
    await this.alerter.notifyStart();
    
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🤖 rifKANDO Security RPA Bot ACTIVE                  ║
║     Autonomous Security Response System                  ║
║                                                          ║
║     Status: RUNNING                                      ║
║     Mode: Auto-block + Alerts                            ║
║     Scan Interval: ${this.scanInterval / 1000}s                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
    
    this.run();
  }

  // Stop the bot
  stop() {
    this.isRunning = false;
    console.log('🛑 Security bot stopped');
  }

  // Get security stats
  async getStats() {
    return new Promise((resolve) => {
      const stats = {};
      let completed = 0;
      
      db.get('SELECT COUNT(*) as total FROM security_events', [], (err, row) => {
        stats.totalEvents = row?.total || 0;
        completed++;
        if (completed === 3) resolve(stats);
      });
      
      db.get('SELECT COUNT(*) as total FROM blocked_ips WHERE expires_at > datetime("now")', [], (err, row) => {
        stats.activeBlocks = row?.total || 0;
        completed++;
        if (completed === 3) resolve(stats);
      });
      
      db.get(`
        SELECT severity, COUNT(*) as count 
        FROM security_events 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY severity
      `, [], (err, rows) => {
        stats.last24h = rows || [];
        completed++;
        if (completed === 3) resolve(stats);
      });
    });
  }
}

module.exports = SecurityBot;