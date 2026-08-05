const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/database');

const run = (sql) => new Promise((resolve, reject) => {
  db.run(sql, (error) => {
    if (error) reject(error);
    else resolve();
  });
});

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const backupDatabase = async () => {
  await db.ready;

  const databasePath = process.env.DATABASE_PATH || db.path;
  const backupDirectory = process.env.DB_BACKUP_DIR || path.join(path.dirname(databasePath), 'backups');
  if (process.env.NODE_ENV === 'production' && !backupDirectory.startsWith('/var/data/')) {
    throw new Error('DB_BACKUP_DIR must be on the mounted persistent disk in production.');
  }

  await fs.promises.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `rifkando-${timestamp}.db`);
  const escapedPath = backupPath.replace(/'/g, "''");

  // VACUUM INTO creates a consistent SQLite snapshot without copying a live
  // database file and its WAL file separately.
  await run(`VACUUM INTO '${escapedPath}'`);
  const stats = await fs.promises.stat(backupPath);
  console.log(JSON.stringify({
    level: 'info',
    event: 'database_backup_complete',
    backupPath,
    bytes: stats.size,
  }));
};

backupDatabase()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(JSON.stringify({ level: 'error', event: 'database_backup_failed', error: error.message }));
    try {
      await closeDatabase();
    } catch (_) {
      // Exit below with the original failure.
    }
    process.exitCode = 1;
  });
