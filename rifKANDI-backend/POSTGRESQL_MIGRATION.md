# PostgreSQL migration runbook

This repository now has a checksum-protected PostgreSQL schema migration. It is preparation for the SQLite to PostgreSQL cutover, not a runtime database switch. The deployed application remains on SQLite until the database-access refactor, data transfer, staging validation, and approved cutover are complete.

## Safety rules

- Never point the migration command at a shared or production PostgreSQL database without an approved maintenance plan.
- Always start from an encrypted SQLite backup stored outside the application disk.
- Run the source preflight before and after creating the migration snapshot.
- Run the schema migration only on a new, empty PostgreSQL database.
- Migration files are immutable after use. Create a later numbered migration for every schema change.
- Do not put `DATABASE_URL` in Git, frontend variables, logs, or support tickets.

## What the first migration provides

`migrations/postgres/001_initial_schema.sql` creates the 49-table PostgreSQL baseline, including session security, payment idempotency, financial minor-unit fields, query indexes, and immutable audit-log triggers. Follow-up migration `002_seller_withdrawal_eligibility.sql` records the seller start date used for the 14-day withdrawal hold. Migration `003_remove_seller_verification.sql` removes the retired seller identity-verification tables and resets the former badge field. Migration `004_phone_otp_authentication.sql` adds short-lived hashed phone-login challenges and a unique phone identity. Migration `005_professional_booking_protocol.sql` adds managed weekly availability, blocked dates, time-zone aware booking controls, capacity protection, idempotency, and appointment lifecycle fields. `schema_migrations` records the SHA-256 checksum of each applied migration. A database transaction plus PostgreSQL advisory lock prevents two deploys from applying the same migration at once.

The former `src/config/initDb.js` shortcut is intentionally retired. It created only a small, outdated subset of the schema and must never be used for a deployment.

## Commands

From `rifKANDI-backend`:

```bash
npm run db:postgres:plan
node scripts/postgresPreflight.js --sqlite-path /absolute/path/to/rifkandi.db --json
POSTGRES_MIGRATION_CONFIRM=apply-postgres-schema npm run db:postgres:migrate
node scripts/postgresPreflight.js --sqlite-path /absolute/path/to/rifkandi.db --target --json
```

The plan command is local only and never opens a database connection. The apply command requires both `DATABASE_URL` and the explicit confirmation value. The target preflight reads schema metadata only and does not copy data.

## Required cutover sequence

1. Provision a managed PostgreSQL service and store `DATABASE_URL` only in the backend environment.
2. Take and verify an encrypted SQLite backup. Record its checksum and row counts using the preflight command.
3. Apply the PostgreSQL baseline to an empty staging database.
4. Run the one-time data importer against a staging copy. It preserves IDs, checks the reviewed source SHA-256 before writing, imports only into an empty target, and validates row counts plus financial minor-unit totals before committing.
5. Refactor and test the application data-access layer for PostgreSQL, including row locks for wallet and payment workflows.
6. Run the full test suite and checkout smoke tests against staging PostgreSQL.
7. Put the live platform in maintenance mode, make a final SQLite backup, run one final import, validate it, then switch `DATABASE_URL` under a controlled release.
8. Keep the SQLite backup read-only until monitoring, reconciliation, and restore verification have passed.

The deployment must not be scaled horizontally until the PostgreSQL runtime refactor and cutover validation are complete.

## Runtime adapter and cutover guard

The backend now supports two explicit runtime engines:

```text
DATABASE_ENGINE=sqlite     # current production setting
DATABASE_ENGINE=postgres   # only after the cutover checks below
```

SQLite remains the default when the variable is absent. PostgreSQL startup refuses to serve traffic unless `DATABASE_URL` is present, the checksum-verified schema migrations have been applied, and all expected tables exist. The adapter keeps existing route handlers compatible while converting SQLite placeholders and time expressions to PostgreSQL syntax. Financial operations use a serializable PostgreSQL transaction, retry serialization conflicts, and lock the wallet, escrow, withdrawal, refund, and stock rows they change.

Before changing the engine in staging, confirm all of the following:

1. A staging PostgreSQL target has the schema baseline and imported staging data.
2. `npm test` passes with `DATABASE_ENGINE=sqlite` and the PostgreSQL adapter test passes.
3. Real API smoke tests have passed against staging with `DATABASE_ENGINE=postgres`.
4. Checkout, duplicate CMI callback, refund, withdrawal, digital download, and seller authorization workflows have been manually verified on that staging target.
5. A rollback decision and a read-only SQLite backup are available.

Only after those checks should the backend service receive `DATABASE_ENGINE=postgres`, `DATABASE_URL`, and `POSTGRES_SSL=true`. Do not switch the engine and import data in the same deployment.

## One-time SQLite data import

The importer never deletes or modifies SQLite. Give it an immutable SQLite backup, not the active live database file. First run a dry run and record its SHA-256. The apply command requires that exact SHA-256, an explicit confirmation value, an empty PostgreSQL target with the baseline migration already applied, and `DATABASE_URL` in the backend environment.

```bash
node scripts/importSqliteToPostgres.js --source /absolute/path/to/rifkandi-backup.db --dry-run
SQLITE_IMPORT_SOURCE_SHA256=<hash-from-dry-run> POSTGRES_DATA_IMPORT_CONFIRM=import-sqlite-data node scripts/importSqliteToPostgres.js --source /absolute/path/to/rifkandi-backup.db --apply
```

The importer uses one PostgreSQL transaction. Any schema, foreign-key, row-count, financial-total, source-file, or target-state failure rolls the whole import back.
