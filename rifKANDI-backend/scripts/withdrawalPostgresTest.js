// Only accepts an EMPTY disposable loopback database; never loads the app .env.
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { applyPostgresMigrations } = require('../src/database/postgresMigrationRunner');

async function main() {
  const url = new URL(process.env.WALLET_TEST_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/wallet_retry_test');
  assert.equal(url.search, '');
  Object.assign(process.env, { NODE_ENV: 'test', DATABASE_ENGINE: 'postgres', DATABASE_URL: url.href, POSTGRES_SSL: 'false' });
  const pool = new Pool({connectionString: url.href});
  try {
    assert.equal((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount, 0);
    await applyPostgresMigrations(pool);
    const db = require('../src/config/database');
    try {
      await db.ready;
      const wallet = require('../src/services/walletService');
      const {rows} = await pool.query("INSERT INTO users (name,email,password,role,seller_started_at) VALUES ('Seller','seller@example.test','x','seller',CURRENT_TIMESTAMP - INTERVAL '30 days'), ('Other','other@example.test','x','seller',CURRENT_TIMESTAMP - INTERVAL '30 days') RETURNING id");
      const id = rows[0].id;
      await pool.query('INSERT INTO wallets (user_id,available_balance,available_balance_minor) VALUES ($1,300,30000)',[id]);
      const bank = { bank:'Test', account_number:'test-account' };
      const submit = (key, amount=100, user=id, details=bank) => wallet.requestWithdrawal(user,amount,'bank_transfer',details,key);
      const key = 'retry-wallet-first';
      const pair = await Promise.all([submit(key),submit(key)]);
      assert.equal(pair[0].requestId,pair[1].requestId);
      assert.deepEqual(pair.map(r=>r.alreadyProcessed).sort(),[false,true]);
      assert.equal((await submit(key)).requestId,pair[0].requestId);
      for (const attempt of [()=>submit(key,101),()=>submit(key,100,rows[1].id),()=>submit(key,100,id,{...bank,bank:'Other'})])
        await assert.rejects(attempt, {statusCode:409});
      async function balances(n) {
        const w = await wallet.getWallet(id);
        assert.equal(w.available_balance_minor,30000-n*10000);
        assert.equal(w.pending_withdrawal_minor,n*10000);
        assert.equal((await pool.query('SELECT id FROM withdrawal_requests')).rowCount,n);
        assert.equal((await pool.query("SELECT id FROM wallet_ledger_entries WHERE reference_type='withdrawal'")).rowCount,2*n);
      }
      await balances(1);
      assert.notEqual((await submit('retry-wallet-second')).requestId,pair[0].requestId);
      await balances(2);
      console.log('PostgreSQL withdrawal retry, concurrency, conflict and balance checks passed.');
    } finally { await db.pool.end(); }
  } finally { await pool.end(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
