'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { setTimeout: wait } = require('node:timers/promises');

const site = 'https://www.rifkando.com';
const api = 'https://api.rifkando.com';
const checks = {
  api: [api + '/health', 'Check Railway service logs and API routing.'],
  storefront: [site + '/', 'Check Cloudflare Worker deployment and security events for runner blocks.'],
  catalog: [api + '/api/products?limit=1', 'Check Railway catalog errors and Neon compute, usage and connections.'],
};
async function probe(kind, request = fetch) {
  const json = kind !== 'storefront';
  const r = await request(checks[kind][0], { headers: { Accept: json ? 'application/json' : 'text/html', ...(json && { Origin: site }) }, signal: AbortSignal.timeout(12000) });
  assert.equal(r.status, 200, 'HTTP ' + r.status);
  if (!json) {
    assert.match(r.headers.get('content-type') || '', /text\/html/i);
    assert.match(await r.text(), /<[^>]+\bid=["']root["']/i, 'Missing app shell');
    return;
  }
  assert.equal(r.headers.get('access-control-allow-origin'), site, 'Unexpected CORS origin');
  const data = await r.json();
  if (kind === 'api') assert.equal(data.status, 'ok', 'Unexpected API health');
  else assert.ok(Array.isArray(data.products) && data.products.length <= 1 &&
    data.products.every(p => p && Number(p.id) > 0 && typeof p.title === 'string' && p.title.trim()), 'Invalid catalog list');
}

async function sample(check, pause = () => wait(10000)) {
  for (let i = 0; i < 2; i++) {
    try { await check(); return null; }
    catch (e) { if (i) return e.message.slice(0,180); await pause(); }
  }
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', timeout: 20000 }).trim();
}
function reconcile(kind, failure, drill = false) {
  const repo = process.env.GITHUB_REPOSITORY;
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const url = 'https://github.com/' + repo + '/actions/runs/' + process.env.GITHUB_RUN_ID;
  const title = (drill ? '[TEST ONLY ' + process.env.GITHUB_RUN_ID + '] ' : '') + '[uptime] ' + kind;
  const issues = JSON.parse(gh(['api','--paginate','--slurp','repos/' + repo + '/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100'])).flat();
  const issue = issues.find(i => i.title === title);
  if (failure && !issue) {
    gh(['issue','create','--repo',repo,'--assignee',owner,'--title',title,'--body',
      (drill ? 'Test only. No production request failed.\n\n' : '') + 'Two consecutive checks failed: ' + failure + '\n\n' + checks[kind][1] + '\n\nRun: ' + url]);
    return 'opened';
  }
  if (!failure && issue) {
    gh(['issue','close',String(issue.number),'--repo',repo,'--comment',(drill ? 'Test recovery' : 'Recovered') + ': ' + kind + ' check passed. ' + url]);
    return 'closed';
  }
  return 'unchanged';
}
async function main() {
  const mode = process.env.MODE;
  if (mode === 'drill') {
    const reply = body => new Response(JSON.stringify(body), {headers:{'access-control-allow-origin':site}});
    const bad = () => probe('catalog', async () => reply({error:'simulated'}));
    const good = () => probe('catalog', async () => reply({products:[]}));
    const failure = await sample(bad, async () => {});
    assert.ok(failure);
    assert.equal(reconcile('catalog',failure,true),'opened');
    assert.equal(reconcile('catalog',failure,true),'unchanged');
    assert.equal(reconcile('catalog',await sample(good),true),'closed');
    console.log('Drill passed: one incident opened, duplicate suppressed, recovery posted.');
    return;
  }
  const kinds = {basic:['api','storefront'],catalog:['catalog'],all:Object.keys(checks)}[mode];
  assert.ok(kinds, 'Unknown monitor mode');
  for (const kind of kinds) {
    try {
      const failure = await sample(() => probe(kind));
      console.log(kind, failure || 'OK', reconcile(kind, failure));
      if (failure) process.exitCode = 1;
    } catch (e) { console.error(kind, e.message); process.exitCode = 1; }
  }
}
module.exports = {probe, sample};
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
