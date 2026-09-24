const fs = require('node:fs');
const path = require('node:path');

const redirectFile = path.join(process.cwd(), 'dist', '_redirects');

if (fs.existsSync(redirectFile)) {
  fs.rmSync(redirectFile);
  console.log('Removed legacy dist/_redirects before Cloudflare deployment.');
}
