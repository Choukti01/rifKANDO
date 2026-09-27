const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dotenv = require('dotenv');
const { DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { getDatabaseEngine } = require('../src/config/postgresDatabase');
const storage = require('../src/services/storageService');

const BACKUP_PREFIX = 'private/database-backups/';
const BACKUP_NAME_PATTERN = /^private\/database-backups\/rifkando-postgres-\d{4}-\d{2}-\d{2}T.+\.dump$/;

const sha256File = (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const run = (command, args, options) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { ...options, windowsHide: true });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.on('error', (error) => {
    if (error.code === 'ENOENT') {
      reject(new Error('pg_dump is not installed or is not available on PATH. Install the PostgreSQL client tools, then rerun this backup.'));
      return;
    }
    reject(error);
  });
  child.on('close', (code) => {
    if (code === 0) return resolve();
    return reject(new Error(`pg_dump failed with exit code ${code}: ${stderr.trim().slice(-500)}`));
  });
});

function buildPgDumpOptions(connectionString, destination) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }

  const database = url.pathname.replace(/^\//, '');
  if (!url.hostname || !database || !url.username) {
    throw new Error('DATABASE_URL is incomplete for a PostgreSQL backup.');
  }

  const sslMode = url.searchParams.get('sslmode') || (process.env.POSTGRES_SSL === 'false' ? 'disable' : 'require');
  return {
    args: [
      '--host', url.hostname,
      '--port', url.port || '5432',
      '--username', decodeURIComponent(url.username),
      '--dbname', database,
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--file', destination,
    ],
    environment: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      WINDIR: process.env.WINDIR,
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: sslMode,
      PGCHANNELBINDING: url.searchParams.get('channel_binding') || undefined,
    },
  };
}

async function removeExpiredBackups(retentionDays) {
  let continuationToken;
  let removed = 0;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const bucket = storage.bucketForKey(BACKUP_PREFIX);

  do {
    const response = await storage.client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: BACKUP_PREFIX,
      ContinuationToken: continuationToken,
    }));
    for (const object of response.Contents || []) {
      if (!BACKUP_NAME_PATTERN.test(object.Key || '') || !object.LastModified || object.LastModified.getTime() >= cutoff) continue;
      await storage.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
      removed += 1;
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return removed;
}

async function backupPostgresToR2() {
  if (getDatabaseEngine() !== 'postgres') {
    throw new Error('PostgreSQL backup requires DATABASE_ENGINE=postgres.');
  }
  if (storage.isLocal() || !storage.client || !storage.privateBucket) {
    throw new Error('PostgreSQL backup requires configured private S3-compatible object storage.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for PostgreSQL backup.');
  }

  const retentionDays = Number(process.env.DB_BACKUP_RETENTION_DAYS || 14);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    throw new Error('DB_BACKUP_RETENTION_DAYS must be an integer from 1 to 3650.');
  }

  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rifkando-postgres-backup-'));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const temporaryBackupPath = path.join(tempDirectory, `rifkando-postgres-${timestamp}.dump`);
  const storageKey = `${BACKUP_PREFIX}rifkando-postgres-${timestamp}.dump`;

  try {
    const pgDump = process.env.PG_DUMP_PATH || 'pg_dump';
    const options = buildPgDumpOptions(process.env.DATABASE_URL, temporaryBackupPath);
    await run(pgDump, options.args, { env: options.environment });

    const [backup, sha256] = await Promise.all([
      fs.promises.readFile(temporaryBackupPath),
      sha256File(temporaryBackupPath),
    ]);
    if (backup.length === 0) throw new Error('pg_dump created an empty backup.');

    await storage.put(storageKey, backup, {
      contentType: 'application/octet-stream',
      cacheControl: 'no-store',
    });
    const expiredBackupsRemoved = await removeExpiredBackups(retentionDays);

    console.log(JSON.stringify({
      level: 'info',
      event: 'postgres_r2_backup_complete',
      storageKey,
      bytes: backup.length,
      sha256,
      expiredBackupsRemoved,
    }));
  } finally {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true });
  }
}

backupPostgresToR2().catch((error) => {
  console.error(JSON.stringify({ level: 'error', event: 'postgres_r2_backup_failed', error: error.message }));
  process.exitCode = 1;
});
