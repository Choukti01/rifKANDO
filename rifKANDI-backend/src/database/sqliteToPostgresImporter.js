const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const {
  EXPECTED_POSTGRES_TABLES,
  REQUIRED_MINOR_UNIT_COLUMNS,
} = require('./postgresSchemaContract');
const { inspectSqliteSource } = require('../../scripts/postgresPreflight');
const {
  loadPostgresMigrations,
  validateMigrationHistory,
} = require('./postgresMigrationRunner');

const SQLITE_IMPORT_ORDER = Object.freeze([
  'users',
  'pending_registrations',
  'phone_verification_challenges',
  'google_verifications',
  'email_verifications',
  'password_resets',
  'auth_sessions',
  'products',
  'product_media',
  'product_reviews',
  'fraud_reports',
  'cart',
  'favorites',
  'findit_requests',
  'findit_request_media',
  'findit_offers',
  'orders',
  'order_items',
  'cod_fulfillments',
  'order_status_history',
  'order_invoices',
  'checkout_requests',
  'findit_orders',
  'findit_checkout_requests',
  'payment_transactions',
  'payment_splits',
  'refund_requests',
  'courses',
  'course_media',
  'course_lessons',
  'enrollments',
  'lesson_progress',
  'services',
  'service_media',
  'service_packages',
  'service_orders',
  'digital_products',
  'digital_media',
  'digital_files',
  'digital_purchases',
  'digital_requests',
  'bookings',
  'booking_media',
  'booking_slots',
  'booking_availability_windows',
  'booking_date_overrides',
  'appointments',
  'messages',
  'wallets',
  'escrow_transactions',
  'withdrawal_requests',
  'wallet_transactions',
  'wallet_ledger_entries',
  'financial_operations',
  'audit_logs',
  'email_logs',
  'product_offers',
]);

const TABLES_WITHOUT_NUMERIC_ID = new Set([
  'google_verifications',
  'pending_registrations',
  'phone_verification_challenges',
]);

const BOOLEAN_COLUMNS = new Set([
  'users.is_verified',
  'password_resets.used',
  'product_media.is_primary',
  'course_media.is_primary',
  'course_lessons.is_preview',
  'lesson_progress.completed',
  'service_media.is_primary',
  'digital_media.is_primary',
  'booking_media.is_primary',
  'booking_slots.is_available',
  'booking_date_overrides.is_available',
  'messages.is_read',
]);

const TIMESTAMPTZ_COLUMNS = new Set([
  'users.created_at',
  'pending_registrations.expires_at', 'pending_registrations.created_at',
  'phone_verification_challenges.expires_at', 'phone_verification_challenges.window_started_at', 'phone_verification_challenges.created_at',
  'google_verifications.expires_at', 'google_verifications.created_at',
  'email_verifications.expires_at', 'email_verifications.created_at',
  'password_resets.expires_at', 'password_resets.created_at',
  'auth_sessions.expires_at', 'auth_sessions.revoked_at', 'auth_sessions.last_used_at', 'auth_sessions.created_at',
  'products.created_at', 'product_media.created_at', 'product_reviews.created_at', 'fraud_reports.reviewed_at', 'fraud_reports.created_at',
  'cart.created_at', 'favorites.created_at',
  'cod_fulfillments.confirmed_at', 'cod_fulfillments.dispatched_at', 'cod_fulfillments.delivered_at',
  'cod_fulfillments.refused_at', 'cod_fulfillments.returned_at', 'cod_fulfillments.cancelled_at',
  'cod_fulfillments.settled_at', 'cod_fulfillments.created_at', 'cod_fulfillments.updated_at',
  'findit_requests.expires_at', 'findit_requests.created_at', 'findit_requests.updated_at',
  'findit_request_media.created_at', 'findit_offers.created_at', 'findit_offers.updated_at',
  'findit_orders.created_at', 'findit_checkout_requests.created_at',
  'orders.created_at', 'order_status_history.created_at', 'order_invoices.created_at', 'checkout_requests.created_at',
  'payment_transactions.completed_at', 'payment_transactions.created_at', 'payment_splits.created_at', 'payment_splits.completed_at',
  'refund_requests.processed_at', 'refund_requests.created_at',
  'courses.created_at', 'course_media.created_at', 'course_lessons.created_at', 'enrollments.completed_at', 'enrollments.created_at',
  'lesson_progress.created_at', 'lesson_progress.updated_at',
  'services.created_at', 'service_media.created_at', 'service_orders.delivered_at', 'service_orders.completed_at', 'service_orders.created_at',
  'digital_products.created_at', 'digital_media.created_at', 'digital_files.created_at', 'digital_purchases.last_downloaded_at', 'digital_purchases.granted_at', 'digital_purchases.created_at', 'digital_requests.created_at', 'digital_requests.updated_at',
  'bookings.created_at', 'booking_media.created_at', 'booking_slots.created_at', 'booking_availability_windows.created_at', 'booking_date_overrides.created_at',
  'appointments.starts_at', 'appointments.ends_at', 'appointments.cancelled_at', 'appointments.confirmed_at', 'appointments.completed_at', 'appointments.updated_at', 'appointments.created_at',
  'messages.created_at',
  'wallets.created_at', 'wallets.updated_at', 'escrow_transactions.release_date', 'escrow_transactions.created_at', 'escrow_transactions.updated_at',
  'withdrawal_requests.processed_at', 'withdrawal_requests.created_at', 'wallet_transactions.created_at', 'wallet_ledger_entries.created_at',
  'financial_operations.created_at', 'audit_logs.occurred_at', 'email_logs.created_at', 'product_offers.created_at', 'product_offers.updated_at',
]);

const FINANCIAL_RECONCILIATION_COLUMNS = Object.freeze([
  ...REQUIRED_MINOR_UNIT_COLUMNS,
  ['wallets', 'escrow_balance_minor'],
  ['wallets', 'pending_withdrawal_minor'],
  ['wallets', 'total_earned_minor'],
  ['escrow_transactions', 'commission_minor'],
  ['escrow_transactions', 'seller_amount_minor'],
  ['wallet_transactions', 'amount_minor'],
  ['payment_splits', 'amount_minor'],
  ['cod_fulfillments', 'gross_amount_minor'], ['cod_fulfillments', 'customer_delivery_fee_minor'],
  ['cod_fulfillments', 'expected_cod_amount_minor'], ['cod_fulfillments', 'commission_minor'],
  ['cod_fulfillments', 'seller_amount_minor'], ['cod_fulfillments', 'collected_amount_minor'],
  ['cod_fulfillments', 'carrier_delivery_fee_minor'], ['cod_fulfillments', 'carrier_return_fee_minor'],
  ['cod_fulfillments', 'remitted_amount_minor'],
  ['product_offers', 'amount_minor'],
  ['findit_requests', 'budget_max_minor'],
  ['findit_offers', 'price_minor'], ['findit_offers', 'delivery_fee_minor'],
  ['findit_orders', 'price_minor'], ['findit_orders', 'delivery_fee_minor'],
  ['findit_orders', 'commission_minor'], ['findit_orders', 'seller_amount_minor'],
]);

function assertImportOrder() {
  const ordered = new Set(SQLITE_IMPORT_ORDER);
  const expected = new Set(EXPECTED_POSTGRES_TABLES);

  if (ordered.size !== SQLITE_IMPORT_ORDER.length || ordered.size !== expected.size) {
    throw new Error('SQLite to PostgreSQL import order does not match the schema contract');
  }

  for (const table of expected) {
    if (!ordered.has(table)) {
      throw new Error(`SQLite to PostgreSQL import order is missing ${table}`);
    }
  }
}

assertImportOrder();

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function openReadOnlySqlite(databasePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (error) => {
      if (error) reject(error);
      else resolve(database);
    });
  });
}

function sqliteAll(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function closeSqlite(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function normalizeSourceValue(table, column, value) {
  if (value === null || value === undefined) return null;

  const key = `${table}.${column}`;
  if (BOOLEAN_COLUMNS.has(key)) {
    return value === true || value === 1 || value === '1';
  }

  if (TIMESTAMPTZ_COLUMNS.has(key) && typeof value === 'string') {
    const sqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
    if (sqliteTimestamp.test(value)) {
      return `${value.replace(' ', 'T')}Z`;
    }
  }

  return value;
}

function getSafeBatchSize(columnCount, requestedBatchSize = 200) {
  const requested = Number.parseInt(requestedBatchSize, 10);
  const boundedRequested = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 500) : 200;
  return Math.max(1, Math.min(boundedRequested, Math.floor(60_000 / Math.max(columnCount, 1))));
}

async function getSqliteTableColumns(database, table) {
  const rows = await sqliteAll(database, `PRAGMA table_info(${quoteIdentifier(table)})`);
  const columns = rows.map((row) => row.name);

  if (columns.length === 0) {
    throw new Error(`SQLite source table ${table} has no columns`);
  }

  return columns;
}

async function readSqliteTable(database, table, columns, offset, limit) {
  const projectedColumns = columns.map(quoteIdentifier).join(', ');
  return sqliteAll(
    database,
    `SELECT ${projectedColumns} FROM ${quoteIdentifier(table)} ORDER BY rowid LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

function buildInsertStatement(table, columns, rows) {
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((column, columnIndex) => {
      values.push(normalizeSourceValue(table, column, row[column]));
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${rowPlaceholders.join(', ')})`;
  });

  return {
    sql: `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES ${placeholders.join(', ')}`,
    values,
  };
}

async function validateEmptyPostgresTarget(client) {
  const migrationTableResult = await client.query(`
    SELECT to_regclass('public.schema_migrations') AS migration_table
  `);
  if (!migrationTableResult.rows[0].migration_table) {
    throw new Error('PostgreSQL target has no schema_migrations table. Apply the schema baseline first.');
  }

  const migrations = await loadPostgresMigrations();
  const appliedResult = await client.query(`
    SELECT version, name, checksum, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `);
  validateMigrationHistory(migrations, appliedResult.rows);

  const tableResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const targetTables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = EXPECTED_POSTGRES_TABLES.filter((table) => !targetTables.has(table));
  if (missingTables.length > 0) {
    throw new Error(`PostgreSQL target is missing required tables: ${missingTables.join(', ')}`);
  }

  const populatedTables = [];
  for (const table of EXPECTED_POSTGRES_TABLES) {
    const result = await client.query(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(table)}`);
    if (Number(result.rows[0].count) > 0) {
      populatedTables.push(table);
    }
  }

  if (populatedTables.length > 0) {
    throw new Error(
      `PostgreSQL target is not empty. Refusing to import into: ${populatedTables.join(', ')}`
    );
  }
}

async function copyTable({ client, database, table, requestedBatchSize, onProgress }) {
  const columns = await getSqliteTableColumns(database, table);
  const batchSize = getSafeBatchSize(columns.length, requestedBatchSize);
  let imported = 0;
  let offset = 0;

  while (true) {
    const rows = await readSqliteTable(database, table, columns, offset, batchSize);
    if (rows.length === 0) break;

    const statement = buildInsertStatement(table, columns, rows);
    await client.query(statement.sql, statement.values);
    imported += rows.length;
    offset += rows.length;
    onProgress?.({ table, imported });
  }

  return imported;
}

async function resetIdentitySequence(client, table) {
  if (TABLES_WITHOUT_NUMERIC_ID.has(table)) return;

  const sequenceResult = await client.query(
    `SELECT pg_get_serial_sequence($1, 'id') AS sequence_name`,
    [`public.${table}`]
  );
  const sequenceName = sequenceResult.rows[0].sequence_name;
  if (!sequenceName) return;

  const maximumResult = await client.query(`SELECT MAX(id)::bigint AS maximum FROM ${quoteIdentifier(table)}`);
  const maximum = maximumResult.rows[0].maximum;
  await client.query(
    'SELECT setval($1::regclass, $2::bigint, $3::boolean)',
    [sequenceName, maximum || 1, Boolean(maximum)]
  );
}

function stringifyMinorUnitTotal(value) {
  return value === null || value === undefined ? '0' : String(value);
}

async function getSqliteMinorUnitTotals(database) {
  const totals = {};

  for (const [table, column] of FINANCIAL_RECONCILIATION_COLUMNS) {
    const rows = await sqliteAll(
      database,
      `SELECT COALESCE(SUM(${quoteIdentifier(column)}), 0) AS total FROM ${quoteIdentifier(table)}`
    );
    totals[`${table}.${column}`] = stringifyMinorUnitTotal(rows[0].total);
  }

  return totals;
}

async function getPostgresMinorUnitTotals(client) {
  const totals = {};

  for (const [table, column] of FINANCIAL_RECONCILIATION_COLUMNS) {
    const result = await client.query(
      `SELECT COALESCE(SUM(${quoteIdentifier(column)}), 0)::text AS total FROM ${quoteIdentifier(table)}`
    );
    totals[`${table}.${column}`] = stringifyMinorUnitTotal(result.rows[0].total);
  }

  return totals;
}

async function verifyImportedData({ client, database, expectedRowCounts }) {
  const targetRowCounts = {};
  for (const table of EXPECTED_POSTGRES_TABLES) {
    const result = await client.query(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(table)}`);
    const count = Number(result.rows[0].count);
    targetRowCounts[table] = count;

    if (count !== expectedRowCounts[table]) {
      throw new Error(`Row-count mismatch for ${table}: source=${expectedRowCounts[table]}, target=${count}`);
    }
  }

  const [sourceMinorUnitTotals, targetMinorUnitTotals] = await Promise.all([
    getSqliteMinorUnitTotals(database),
    getPostgresMinorUnitTotals(client),
  ]);

  for (const [key, sourceTotal] of Object.entries(sourceMinorUnitTotals)) {
    if (targetMinorUnitTotals[key] !== sourceTotal) {
      throw new Error(
        `Financial minor-unit total mismatch for ${key}: source=${sourceTotal}, target=${targetMinorUnitTotals[key]}`
      );
    }
  }

  return { targetRowCounts, sourceMinorUnitTotals };
}

async function assertSourceUnchanged(sourcePath, initialStat, initialChecksum) {
  const finalStat = await fsp.stat(sourcePath);
  if (finalStat.size !== initialStat.size || finalStat.mtimeMs !== initialStat.mtimeMs) {
    throw new Error('SQLite source changed during import. The PostgreSQL transaction was rolled back.');
  }

  const finalChecksum = await sha256File(sourcePath);
  if (finalChecksum !== initialChecksum) {
    throw new Error('SQLite source checksum changed during import. The PostgreSQL transaction was rolled back.');
  }
}

async function prepareSqliteImport(sourcePath) {
  const absoluteSourcePath = path.resolve(sourcePath);
  const [source, sourceChecksum, sourceStat] = await Promise.all([
    inspectSqliteSource(absoluteSourcePath),
    sha256File(absoluteSourcePath),
    fsp.stat(absoluteSourcePath),
  ]);

  return {
    sourcePath: absoluteSourcePath,
    source,
    sourceChecksum,
    sourceStat,
  };
}

async function importSqliteToPostgres({ pool, preparedSource, batchSize = 200, onProgress }) {
  const database = await openReadOnlySqlite(preparedSource.sourcePath);
  const client = await pool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query('SELECT pg_advisory_xact_lock($1)', [734_116_493]);
    await validateEmptyPostgresTarget(client);

    const importedRowCounts = {};
    for (const table of SQLITE_IMPORT_ORDER) {
      importedRowCounts[table] = await copyTable({
        client,
        database,
        table,
        requestedBatchSize: batchSize,
        onProgress,
      });

      if (importedRowCounts[table] !== preparedSource.source.rowCounts[table]) {
        throw new Error(`SQLite source changed while reading ${table}. The PostgreSQL transaction was rolled back.`);
      }
    }

    await assertSourceUnchanged(
      preparedSource.sourcePath,
      preparedSource.sourceStat,
      preparedSource.sourceChecksum
    );

    for (const table of SQLITE_IMPORT_ORDER) {
      await resetIdentitySequence(client, table);
    }

    const verification = await verifyImportedData({
      client,
      database,
      expectedRowCounts: preparedSource.source.rowCounts,
    });
    await client.query('COMMIT');

    return {
      importedRowCounts,
      sourceChecksum: preparedSource.sourceChecksum,
      verification,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await closeSqlite(database);
  }
}

module.exports = {
  FINANCIAL_RECONCILIATION_COLUMNS,
  SQLITE_IMPORT_ORDER,
  assertImportOrder,
  getSafeBatchSize,
  importSqliteToPostgres,
  normalizeSourceValue,
  prepareSqliteImport,
  quoteIdentifier,
};
