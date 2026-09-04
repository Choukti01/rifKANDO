/*
 * Establishes the production-safe local environment used by the Cloudflare
 * Tunnel host. It never prints secret values and only replaces a secret when
 * it is missing, weak, or clearly a placeholder.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SECRET_NAMES = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'AUDIT_LOG_SECRET',
  'PHONE_OTP_SECRET',
  'METRICS_TOKEN',
];

const isStrongSecret = (value) => (
  typeof value === 'string'
  && value.length >= 48
  && !/(replace-with|change[-_ ]?me|your[-_ ]|example|default[-_ ]?secret)/i.test(value)
);

const createSecret = () => crypto.randomBytes(48).toString('base64url');

function upsertEnvValue(contents, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const entry = `${key}=${value}`;
  return pattern.test(contents)
    ? contents.replace(pattern, entry)
    : `${contents.replace(/\s*$/, '')}\n${entry}\n`;
}

function removeEnvValue(contents, key) {
  return contents.replace(new RegExp(`^${key}=.*(?:\r?\n|$)`, 'm'), '');
}

const envPath = path.resolve(__dirname, '..', '.env');
let contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const existing = Object.fromEntries(
  contents.split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    })
);

const generated = [];
for (const name of SECRET_NAMES) {
  if (!isStrongSecret(existing[name])) {
    contents = upsertEnvValue(contents, name, createSecret());
    generated.push(name);
  }
}

const productionValues = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  CLIENT_URL: 'https://www.rifkando.com',
  ALLOWED_ORIGINS: 'https://www.rifkando.com,https://rifkando.com',
  DATABASE_ENGINE: 'postgres',
  POSTGRES_SSL: 'true',
  POSTGRES_CONNECT_TIMEOUT_MS: '45000',
  PERSISTENT_STORAGE_ROOT: 'C:\\rifkando-data',
  UPLOADS_DIR: 'C:\\rifkando-data\\uploads',
  OBJECT_STORAGE_DRIVER: 'local',
  FEATURE_FLAGS: 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=false,courses=false,services=false,digital=false',
};

for (const [name, value] of Object.entries(productionValues)) {
  contents = upsertEnvValue(contents, name, value);
}

// CMI is deliberately parked for the COD-only launch. Leaving test gateway
// credentials in the runtime would enlarge the payment attack surface.
for (const name of ['CMI_STORE_KEY', 'CMI_CLIENT_ID', 'BACKEND_URL']) {
  contents = removeEnvValue(contents, name);
}

fs.writeFileSync(envPath, contents.replace(/\n{3,}/g, '\n\n'), 'utf8');
console.log(`Configured local production environment. Generated ${generated.length} secret value(s); CMI remains disabled for the COD-only launch.`);
