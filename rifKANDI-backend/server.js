const dotenv = require('dotenv');
const dns = require('node:dns');

dotenv.config();
// Prefer IPv4 when both records are available. The production host currently
// has no routed IPv6 path, while Neon exposes dual-stack endpoints.
dns.setDefaultResultOrder('ipv4first');

const { validateEnvironment } = require('./src/config/validateEnv');
validateEnvironment();

const db = require('./src/config/database');
const app = require('./src/app');
const CodFulfillmentService = require('./src/services/codFulfillmentService');

const PORT = Number(process.env.PORT || 5000);
let server;
let shuttingDown = false;
let codExpiryTimer;

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));

  const forceExitTimer = setTimeout(() => {
    console.error(JSON.stringify({ level: 'error', event: 'shutdown_forced', signal }));
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close((serverError) => {
    if (codExpiryTimer) clearInterval(codExpiryTimer);
    db.close((databaseError) => {
      if (serverError || databaseError) {
        console.error(JSON.stringify({
          level: 'error',
          event: 'shutdown_failed',
          serverError: serverError?.message,
          databaseError: databaseError?.message,
        }));
        process.exit(1);
      }
      console.log(JSON.stringify({ level: 'info', event: 'shutdown_complete', signal }));
      process.exit(0);
    });
  });
};

const start = async () => {
  try {
    await db.ready;
    server = app.listen(PORT, () => {
      console.log(JSON.stringify({
        level: 'info',
        event: 'server_started',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      }));
    });
    const expirePendingCodOrders = async () => {
      try {
        const expired = await CodFulfillmentService.expirePendingConfirmations();
        if (expired) console.log(JSON.stringify({ level: 'info', event: 'cod_confirmation_expired', count: expired }));
      } catch (error) {
        console.error(JSON.stringify({ level: 'error', event: 'cod_confirmation_expiry_failed', error: error.message }));
      }
    };
    void expirePendingCodOrders();
    codExpiryTimer = setInterval(() => { void expirePendingCodOrders(); }, 5 * 60 * 1000);
    codExpiryTimer.unref();
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'startup_failed', error: error.message }));
    process.exit(1);
  }
};

start();
