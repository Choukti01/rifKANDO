/*
 * Copies a Neon pooled connection string from the Windows clipboard into the
 * local .env file without printing its password. It is deliberately limited to
 * Neon hosts so an accidental clipboard value cannot replace DATABASE_URL.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function readClipboard() {
  return execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', 'Get-Clipboard -Raw'],
    { encoding: 'utf8', windowsHide: true }
  ).trim();
}

function normaliseNeonConnectionString(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The clipboard does not contain a valid PostgreSQL connection string.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('The clipboard value is not a PostgreSQL connection string.');
  }

  if (!url.hostname.endsWith('.neon.tech') || !url.username || !url.password || !url.pathname || url.pathname === '/') {
    throw new Error('The clipboard value is not a complete Neon database connection string.');
  }

  // node-postgres enforces TLS through POSTGRES_SSL. channel_binding is a
  // libpq-specific option, so remove it before passing the URL to node-postgres.
  // verify-full keeps hostname and certificate validation explicit across
  // node-postgres upgrades.
  url.searchParams.delete('channel_binding');
  url.searchParams.set('sslmode', 'verify-full');
  return url;
}

function upsertEnvValue(contents, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const entry = `${key}=${value}`;
  return pattern.test(contents)
    ? contents.replace(pattern, entry)
    : `${contents.replace(/\s*$/, '')}\n${entry}\n`;
}

const connection = normaliseNeonConnectionString(readClipboard());
const envPath = path.resolve(__dirname, '..', '.env');
const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const updated = [
  ['DATABASE_ENGINE', 'postgres'],
  ['DATABASE_URL', connection.toString()],
  ['POSTGRES_SSL', 'true']
].reduce((contents, [key, value]) => upsertEnvValue(contents, key, value), current);

fs.writeFileSync(envPath, updated, 'utf8');
console.log(`Configured local PostgreSQL settings for ${connection.hostname}. The password was not printed.`);
