const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`SEO verification failed: ${message}`);
};

const robots = read('public/robots.txt');
const worker = read('src/cloudflareWorker.js');
const index = read('index.html');

assert(robots.includes('Sitemap: https://www.rifkando.com/sitemap.xml'), 'robots.txt must publish the canonical sitemap URL');
assert(robots.includes('Disallow: /checkout'), 'robots.txt must exclude checkout pages');
assert(!robots.includes('Crawl-delay:'), 'robots.txt must not publish an unsupported crawl delay');
assert(worker.includes("url.pathname === '/sitemap.xml'"), 'the Worker must serve sitemap.xml');
assert(worker.includes("url.hostname === 'rifkando.com'"), 'the Worker must permanently redirect the non-www host');
assert(worker.includes("'Product'"), 'the Worker must support Product structured data');
assert(index.includes('https://www.rifkando.com/'), 'the base document must use the canonical host');

console.log('SEO verification passed.');
