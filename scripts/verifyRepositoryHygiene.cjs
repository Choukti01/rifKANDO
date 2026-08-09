const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const allowedEnvironmentTemplates = new Set([
  '.env.example',
  '.env.staging.example',
  'rifKANDI-backend/.env.example',
  'rifKANDI-backend/.env.staging.example',
]);

const textExtensions = new Set([
  '.cjs', '.css', '.env', '.example', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

const secretSignatures = [
  { name: 'private key', pattern: /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/ },
  { name: 'GitHub personal access token', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}/ },
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'SendGrid API key', pattern: /SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { name: 'AWS access key ID', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'payment provider secret key', pattern: /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/ },
];

const blockedPath = (relativePath) => {
  const normalized = relativePath.replace(/\\/g, '/');

  if (/^(?:\.env|.*\/\.env)(?:\..+)?$/i.test(normalized) && !allowedEnvironmentTemplates.has(normalized)) {
    return 'environment files must not be tracked';
  }

  if (/\.(?:db|sqlite|sqlite3|pem|key|p12|pfx)$/i.test(normalized)) {
    return 'database or credential files must not be tracked';
  }

  if (/(?:^|\/)(?:uploads|invoices|verification-documents|kyc-documents)(?:\/|$)/i.test(normalized)) {
    const allowedPlaceholder = /(?:^|\/)uploads\/\.gitkeep$/i.test(normalized);
    if (!allowedPlaceholder) return 'customer uploads and identity documents must not be tracked';
  }

  return null;
};

const isTextFile = (relativePath) => {
  const extension = path.extname(relativePath).toLowerCase();
  return textExtensions.has(extension) || allowedEnvironmentTemplates.has(relativePath);
};

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: repositoryRoot,
  encoding: 'buffer',
}).toString('utf8').split('\0').filter(Boolean);

const violations = [];

for (const relativePath of trackedFiles) {
  const pathViolation = blockedPath(relativePath);
  if (pathViolation) {
    violations.push(`${relativePath}: ${pathViolation}`);
    continue;
  }

  if (!isTextFile(relativePath)) continue;

  const absolutePath = path.join(repositoryRoot, relativePath);
  const contents = fs.readFileSync(absolutePath, 'utf8');
  for (const signature of secretSignatures) {
    if (signature.pattern.test(contents)) {
      violations.push(`${relativePath}: possible ${signature.name}`);
    }
  }
}

if (violations.length) {
  console.error('Repository hygiene check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('Remove the tracked file or credential, rotate any exposed secret, then rerun this check.');
  process.exitCode = 1;
} else {
  console.log(`Repository hygiene check passed for ${trackedFiles.length} tracked files.`);
}
