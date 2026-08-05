const dotenv = require('dotenv');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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

const sha256File = (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const verifyBackupIntegrity = (backupPath) => new Promise((resolve, reject) => {
  const backup = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (openError) => {
    if (openError) return reject(openError);
    backup.get('PRAGMA integrity_check', (queryError, row) => {
      backup.close((closeError) => {
        if (queryError) return reject(queryError);
        if (closeError) return reject(closeError);
        if (row?.integrity_check !== 'ok') return reject(new Error(`SQLite integrity check failed: ${row?.integrity_check || 'unknown result'}`));
        return resolve();
      });
    });
  });
});

const removeExpiredBackups = async (backupDirectory, retentionDays) => {
  const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const entries = await fs.promises.readdir(backupDirectory, { withFileTypes: true });
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !/^rifkando-\d{4}-\d{2}-\d{2}T.+\.db$/.test(entry.name)) continue;
    const candidate = path.resolve(backupDirectory, entry.name);
    if (!candidate.startsWith(`${path.resolve(backupDirectory)}${path.sep}`)) continue;
    const stats = await fs.promises.stat(candidate);
    if (stats.mtimeMs < cutoff) {
      await fs.promises.unlink(candidate);
      removed += 1;
    }
  }
  return removed;
};

const backupDatabase = async () => {
  await db.ready;

  const databasePath = process.env.DATABASE_PATH || db.path;
  const backupDirectory = process.env.DB_BACKUP_DIR || path.join(path.dirname(databasePath), 'backups');
  if (process.env.NODE_ENV === 'production' && !backupDirectory.startsWith('/var/data/')) {
    throw new Error('DB_BACKUP_DIR must be on the mounted persistent disk in production.');
  }
  const retentionDays = Number(process.env.DB_BACKUP_RETENTION_DAYS || 14);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    throw new Error('DB_BACKUP_RETENTION_DAYS must be an integer from 1 to 3650.');
  }

  await fs.promises.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `rifkando-${timestamp}.db`);
  const escapedPath = backupPath.replace(/'/g, "''");

  // VACUUM INTO creates a consistent SQLite snapshot without copying a live
  // database file and its WAL file separately.
  await run(`VACUUM INTO '${escapedPath}'`);
  await verifyBackupIntegrity(backupPath);
  const stats = await fs.promises.stat(backupPath);
  const sha256 = await sha256File(backupPath);
  const expiredBackupsRemoved = await removeExpiredBackups(backupDirectory, retentionDays);
  console.log(JSON.stringify({
    level: 'info',
    event: 'database_backup_complete',
    backupPath,
    bytes: stats.size,
    sha256,
    integrityCheck: 'ok',
    expiredBackupsRemoved,
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
