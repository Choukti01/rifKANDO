const { types } = require('pg');
const { createPostgresPool } = require('./postgres');
const { EXPECTED_POSTGRES_TABLES } = require('../database/postgresSchemaContract');
const {
  loadPostgresMigrations,
  validateMigrationHistory,
} = require('../database/postgresMigrationRunner');

// The current API uses numeric IDs and prices. PostgreSQL returns int8 and
// numeric values as strings by default, which would break existing handlers.
// All platform amounts are also stored as integer minor units before a value is
// used in financial logic.
types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const SQLITE_BOOLEAN_COLUMNS = new Set([
  'is_verified',
  'used',
  'is_primary',
  'is_preview',
  'completed',
  'is_available',
  'is_read',
]);

const TABLES_WITHOUT_NUMERIC_ID = new Set([
  'google_verifications',
  'passkey_challenges',
  'passkey_credentials',
  'pending_registrations',
  'phone_verification_challenges',
]);

// The SQLite schema historically used `profilePicture`. PostgreSQL preserves
// that exact mixed-case name because the reviewed baseline migration creates
// it as a quoted identifier. Keep that compatibility in one place so every
// existing SQL query remains valid on both engines, rather than allowing
// PostgreSQL to silently fold it to the nonexistent `profilepicture` column.
const POSTGRES_CASE_SENSITIVE_IDENTIFIERS = new Set(['profilePicture']);

function getDatabaseEngine(value = process.env.DATABASE_ENGINE) {
  const engine = String(value || 'sqlite').trim().toLowerCase();
  if (!['sqlite', 'postgres'].includes(engine)) {
    throw new Error('DATABASE_ENGINE must be either sqlite or postgres.');
  }
  return engine;
}

function replaceQuestionMarkPlaceholders(sql) {
  let parameterIndex = 0;
  let quote = null;
  let output = '';

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (quote) {
      output += character;
      if (character === quote) {
        if (sql[index + 1] === quote && quote === "'") {
          output += sql[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      output += character;
    } else if (character === '?') {
      parameterIndex += 1;
      output += `$${parameterIndex}`;
    } else {
      output += character;
    }
  }

  return output;
}

function quoteCaseSensitiveIdentifiers(sql) {
  let quote = null;
  let output = '';

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (quote) {
      output += character;
      if (character === quote) {
        if (sql[index + 1] === quote && quote === "'") {
          output += sql[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      output += character;
      continue;
    }

    const identifier = [...POSTGRES_CASE_SENSITIVE_IDENTIFIERS]
      .find((candidate) => sql.startsWith(candidate, index));
    const previous = sql[index - 1] || '';
    const next = identifier ? (sql[index + identifier.length] || '') : '';
    const isIdentifierBoundary = (value) => !/[A-Za-z0-9_$]/.test(value);

    if (identifier && isIdentifierBoundary(previous) && isIdentifierBoundary(next)) {
      output += `"${identifier}"`;
      index += identifier.length - 1;
      continue;
    }

    output += character;
  }

  return output;
}

function translateDateTimeFunctions(sql) {
  return sql
    .replace(
      /datetime\(\s*["']now["']\s*,\s*["'](-?\d+)\s+(day|days|hour|hours|minute|minutes)["']\s*\)/gi,
      (_match, amount, unit) => `CURRENT_TIMESTAMP + INTERVAL '${amount} ${unit}'`
    )
    .replace(/datetime\(\s*["']now["']\s*\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/date\(\s*["']now["']\s*\)/gi, 'CURRENT_DATE');
}

function translateBooleanLiterals(sql) {
  const expression = [...SQLITE_BOOLEAN_COLUMNS].join('|');
  return sql.replace(
    new RegExp(`\\b(${expression})\\s*(=|!=|<>)\\s*([01])\\b`, 'gi'),
    (_match, column, operator, numericValue) => `${column} ${operator} ${numericValue === '1' ? 'TRUE' : 'FALSE'}`
  );
}

function translateScalarMax(sql) {
  return sql.replace(
    /\bMAX\(\s*COALESCE\(([^,()]+),\s*0\)\s*-\s*([^,()]+),\s*0\s*\)/gi,
    'GREATEST(COALESCE($1, 0) - $2, 0)'
  );
}

function translateInsertOrIgnore(sql) {
  if (!/\bINSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql)) return sql;

  const normalized = sql.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO');
  if (/\bON\s+CONFLICT\b/i.test(normalized)) return normalized;

  const semicolon = /;\s*$/.test(normalized) ? ';' : '';
  const statement = normalized.replace(/;\s*$/, '');
  return `${statement} ON CONFLICT DO NOTHING${semicolon}`;
}

function translateSql(sql) {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new Error('A non-empty SQL statement is required.');
  }

  const transactionStatement = sql.trim().toUpperCase();
  if (transactionStatement === 'BEGIN IMMEDIATE TRANSACTION' || transactionStatement === 'BEGIN TRANSACTION') {
    return 'BEGIN';
  }

  return translateScalarMax(
    translateBooleanLiterals(
      translateDateTimeFunctions(
        translateInsertOrIgnore(
          quoteCaseSensitiveIdentifiers(replaceQuestionMarkPlaceholders(sql))
        )
      )
    )
  );
}

function extractInsertedTable(sql) {
  const match = sql.match(/^\s*INSERT\s+INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i);
  return match ? match[1] : null;
}

function prepareRunStatement(sql) {
  const translated = translateSql(sql);
  const table = extractInsertedTable(translated);

  if (!table || TABLES_WITHOUT_NUMERIC_ID.has(table) || /\bRETURNING\b/i.test(translated)) {
    return translated;
  }

  const semicolon = /;\s*$/.test(translated) ? ';' : '';
  const statement = translated.replace(/;\s*$/, '');
  return `${statement} RETURNING id${semicolon}`;
}

function normalizeArguments(parameters, callback) {
  if (typeof parameters === 'function') {
    return { parameters: [], callback: parameters };
  }

  return {
    parameters: parameters === undefined ? [] : parameters,
    callback,
  };
}

function callbackError(callback, error) {
  if (typeof callback === 'function') {
    callback(error);
  } else {
    console.error('PostgreSQL query failed:', error.message);
  }
}

function createPromiseQueryApi(query) {
  return {
    async run(sql, parameters = []) {
      const result = await query(prepareRunStatement(sql), parameters);
      return {
        changes: result.rowCount ?? 0,
        lastID: result.rows?.[0]?.id,
      };
    },
    async get(sql, parameters = []) {
      const result = await query(translateSql(sql), parameters);
      return result.rows[0];
    },
    async all(sql, parameters = []) {
      const result = await query(translateSql(sql), parameters);
      return result.rows;
    },
  };
}

async function validatePostgresSchema(pool) {
  const migrationTableResult = await pool.query(`
    SELECT to_regclass('public.schema_migrations') AS migration_table
  `);
  if (!migrationTableResult.rows[0].migration_table) {
    throw new Error('PostgreSQL schema is not initialized. Apply the reviewed migrations before starting the API.');
  }

  const [migrations, appliedResult, tablesResult] = await Promise.all([
    loadPostgresMigrations(),
    pool.query('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC'),
    pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `),
  ]);
  validateMigrationHistory(migrations, appliedResult.rows);

  const tableNames = new Set(tablesResult.rows.map((row) => row.table_name));
  const missingTables = EXPECTED_POSTGRES_TABLES.filter((table) => !tableNames.has(table));
  if (missingTables.length > 0) {
    throw new Error(`PostgreSQL schema is incomplete. Missing tables: ${missingTables.join(', ')}`);
  }
}

function canRetryTransaction(error) {
  return ['40001', '40P01'].includes(error?.code);
}

function createPostgresDatabase({ pool = createPostgresPool(), verifySchema = validatePostgresSchema } = {}) {
  const promiseApi = createPromiseQueryApi((sql, parameters) => pool.query(sql, parameters));
  let closePromise;

  const database = {
    dialect: 'postgres',
    path: 'postgresql',
    pool,
    ready: Promise.resolve().then(() => verifySchema(pool)),
    serialize(callback) {
      if (typeof callback === 'function') callback();
      return database;
    },
    configure() {
      return database;
    },
    run(sql, parameters, callback) {
      const normalized = normalizeArguments(parameters, callback);
      promiseApi.run(sql, normalized.parameters)
        .then((result) => {
          if (typeof normalized.callback === 'function') {
            normalized.callback.call(result, null);
          }
        })
        .catch((error) => callbackError(normalized.callback, error));
      return database;
    },
    get(sql, parameters, callback) {
      const normalized = normalizeArguments(parameters, callback);
      promiseApi.get(sql, normalized.parameters)
        .then((row) => {
          if (typeof normalized.callback === 'function') normalized.callback(null, row);
        })
        .catch((error) => callbackError(normalized.callback, error));
      return database;
    },
    all(sql, parameters, callback) {
      const normalized = normalizeArguments(parameters, callback);
      promiseApi.all(sql, normalized.parameters)
        .then((rows) => {
          if (typeof normalized.callback === 'function') normalized.callback(null, rows);
        })
        .catch((error) => callbackError(normalized.callback, error));
      return database;
    },
    each(sql, parameters, rowCallback, completeCallback) {
      const normalized = normalizeArguments(parameters, rowCallback);
      promiseApi.all(sql, normalized.parameters)
        .then((rows) => {
          for (const row of rows) normalized.callback?.(null, row);
          completeCallback?.(null, rows.length);
        })
        .catch((error) => {
          if (typeof completeCallback === 'function') completeCallback(error);
          else callbackError(normalized.callback, error);
        });
      return database;
    },
    async withTransaction(work, { isolationLevel = 'SERIALIZABLE', retries = 2 } = {}) {
      if (typeof work !== 'function') throw new Error('A transaction callback is required.');
      if (!['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'].includes(isolationLevel)) {
        throw new Error('Invalid PostgreSQL transaction isolation level.');
      }

      let attempt = 0;
      while (attempt <= retries) {
        const client = await pool.connect();
        try {
          await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
          const transaction = createPromiseQueryApi((sql, parameters) => client.query(sql, parameters));
          const result = await work(transaction);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          if (!canRetryTransaction(error) || attempt === retries) throw error;
          attempt += 1;
        } finally {
          client.release();
        }
      }

      throw new Error('PostgreSQL transaction retry limit reached.');
    },
    close(callback) {
      closePromise ||= pool.end();
      closePromise.then(
        () => callback?.(null),
        (error) => callback?.(error)
      );
      return closePromise;
    },
  };

  return database;
}

module.exports = {
  createPostgresDatabase,
  getDatabaseEngine,
  prepareRunStatement,
  quoteCaseSensitiveIdentifiers,
  replaceQuestionMarkPlaceholders,
  translateSql,
  validatePostgresSchema,
};
