const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();
const Money = require('../src/services/moneyService');
const {
  normalizeFilters,
  signatureFor,
  matchesProduct,
  notifyMatchingProductSearches,
} = require('../src/services/savedProductSearchService');

const openDatabase = () => new sqlite3.Database(':memory:');
const execute = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(error) {
    if (error) reject(error);
    else resolve({ changes: this.changes, lastID: this.lastID });
  });
});

const main = async () => {
  const db = openDatabase();
  try {
    await execute(db, `
      CREATE TABLE saved_product_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filters TEXT NOT NULL,
        filter_signature TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT 1
      )
    `);
    await execute(db, `
      CREATE TABLE saved_product_search_notifications (
        saved_search_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        PRIMARY KEY (saved_search_id, product_id)
      )
    `);

    const filters = normalizeFilters({ search: ' olive oil ', city: 'Nador', minPrice: '50', condition: 'new' }, Money);
    assert.equal(matchesProduct(filters, {
      marketplace_section: 'products', condition: 'new', title: 'Local olive oil', description: 'Cold pressed',
      category: 'home', origin_city: 'Nador', price_minor: 7500, rating: 0,
    }), true);
    assert.equal(matchesProduct(filters, {
      marketplace_section: 'products', condition: 'new', title: 'Local olive oil', description: 'Cold pressed',
      category: 'home', origin_city: 'Rabat', price_minor: 7500, rating: 0,
    }), false);

    await execute(db, 'INSERT INTO saved_product_searches (user_id, filters, filter_signature) VALUES (?, ?, ?)', [7, JSON.stringify(filters), signatureFor(filters)]);
    const delivered = [];
    const NotificationService = { create: async (payload) => { delivered.push(payload); } };
    const product = {
      id: 44, seller_id: 2, marketplace_section: 'products', condition: 'new', title: 'Local olive oil',
      description: 'Cold pressed from the Rif', category: 'home', origin_city: 'Nador', price_minor: 7500, rating: 0,
    };

    assert.equal(await notifyMatchingProductSearches({ db, NotificationService, product }), 1);
    assert.equal(await notifyMatchingProductSearches({ db, NotificationService, product }), 0);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].userId, 7);
    assert.equal(delivered[0].href, '/product/44');
    console.log('Saved product search smoke test passed.');
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
