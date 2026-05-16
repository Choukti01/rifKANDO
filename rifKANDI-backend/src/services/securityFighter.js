// services/securityFighter.js
const db = require('../config/database');

class SecurityFighter {
  constructor() {
    this.blockedIPs = new Map();
    this.blockDuration = 60 * 60 * 1000; // 1 hour
    this.loadBlockedIPs();
  }

  loadBlockedIPs() {
    db.all('SELECT ip_address, expires_at FROM blocked_ips WHERE expires_at > datetime("now")', [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(row => {
          this.blockedIPs.set(row.ip_address, new Date(row.expires_at).getTime());
        });
        console.log(`🔒 Loaded ${this.blockedIPs.size} blocked IPs`);
      }
    });
  }

  async blockIP(ip, reason) {
    if (this.isBlocked(ip)) return false;

    const expiresAt = new Date(Date.now() + this.blockDuration);
    
    // Store in database
    db.run(`
      INSERT INTO blocked_ips (ip_address, reason, expires_at)
      VALUES (?, ?, ?)
    `, [ip, reason, expiresAt.toISOString()]);

    // Store in memory
    this.blockedIPs.set(ip, expiresAt.getTime());

    console.log(`🔒 IP BLOCKED: ${ip} (${reason})`);
    return true;
  }

  async rateLimitIP(ip) {
    // Store rate limit info in memory/db
    db.run(`
      INSERT INTO rate_limits (ip_address, request_count, last_request)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(ip_address) DO UPDATE SET
        request_count = request_count + 1,
        last_request = datetime('now')
    `, [ip]);
    
    console.log(`⏱️ RATE LIMITED: ${ip}`);
    return true;
  }

  isBlocked(ip) {
    const expiry = this.blockedIPs.get(ip);
    if (!expiry) return false;
    
    if (Date.now() > expiry) {
      this.unblockIP(ip);
      return false;
    }
    return true;
  }

  async unblockIP(ip) {
    this.blockedIPs.delete(ip);
    db.run('DELETE FROM blocked_ips WHERE ip_address = ?', [ip]);
    console.log(`🔓 IP UNBLOCKED: ${ip}`);
  }

  async takeAction(action, ip, attackType) {
    switch (action) {
      case 'block_ip':
        await this.blockIP(ip, attackType);
        return 'IP blocked for 1 hour';
      case 'rate_limit':
        await this.rateLimitIP(ip);
        return 'Rate limited';
      default:
        return 'Logged only';
    }
  }

  getBlockedIPs() {
    return Array.from(this.blockedIPs.keys());
  }
}

module.exports = SecurityFighter;