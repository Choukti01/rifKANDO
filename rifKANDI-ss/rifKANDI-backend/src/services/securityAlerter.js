// services/securityAlerter.js
const axios = require('axios');
const nodemailer = require('nodemailer');

class SecurityAlerter {
  constructor() {
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    this.adminEmail = process.env.ADMIN_EMAIL;
    
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    }
  }

  async sendTelegram(message) {
    if (!this.telegramToken || !this.telegramChatId) return;
    
    try {
      await axios.post(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
        chat_id: this.telegramChatId,
        text: message,
        parse_mode: 'HTML'
      });
      console.log('📱 Security alert sent to Telegram');
    } catch (error) {
      console.error('Telegram alert failed:', error.message);
    }
  }

  async sendEmail(subject, body) {
    if (!this.transporter || !this.adminEmail) return;
    
    try {
      await this.transporter.sendMail({
        from: `"rifKANDO Security" <${process.env.GMAIL_USER}>`,
        to: this.adminEmail,
        subject: `[SECURITY] ${subject}`,
        text: body
      });
      console.log('📧 Security alert sent to email');
    } catch (error) {
      console.error('Email alert failed:', error.message);
    }
  }

  async alert(attack) {
    const message = `
🚨 <b>rifKANDO SECURITY ALERT</b> 🚨

<b>Type:</b> ${attack.type}
<b>IP:</b> ${attack.ip}
<b>Severity:</b> ${attack.severity}
<b>URL:</b> ${attack.url || 'N/A'}
<b>Details:</b> ${attack.details}
<b>Action Taken:</b> ${attack.action}
<b>Time:</b> ${new Date().toLocaleString()}
    `;

    await this.sendTelegram(message);
    await this.sendEmail(`${attack.severity.toUpperCase()} - ${attack.type} from ${attack.ip}`, message);
    
    // Also log to console with colors
    const color = attack.severity === 'critical' ? '\x1b[31m' : attack.severity === 'high' ? '\x1b[33m' : '\x1b[36m';
    console.log(`${color}🚨 [${attack.severity.toUpperCase()}] ${attack.type} from ${attack.ip}\x1b[0m`);
  }

  async notifyStart() {
    await this.sendTelegram('🤖 <b>rifKANDO Security Bot ACTIVE</b>\nMonitoring for threats...');
    console.log('✅ Security alerter initialized');
  }
}

module.exports = SecurityAlerter;