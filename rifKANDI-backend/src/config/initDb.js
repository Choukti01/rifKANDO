function initDb() {
  throw new Error(
    'src/config/initDb.js is retired. Use "npm run db:postgres:plan" and the reviewed migration runbook instead.'
  );
}

if (require.main === module) {
  try {
    initDb();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { initDb };
