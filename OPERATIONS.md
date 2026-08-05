# Production Operations Runbook

## Required production configuration

Render must use the mounted disk and these canonical frontend settings:

```text
DATABASE_PATH=/var/data/rifkandi.db
DB_BACKUP_DIR=/var/data/backups
CLIENT_URL=https://www.rifkando.com
ALLOWED_ORIGINS=https://www.rifkando.com,https://rifkando.com
```

`JWT_SECRET` must be at least 32 characters. Configure `CMI_STORE_KEY`,
`CMI_CLIENT_ID`, and `BACKEND_URL` together, never independently. The server
will refuse a production startup with a missing persistent database path,
invalid origin, weak JWT secret, or partial CMI configuration.

## Deployment verification

After each backend deployment, verify both endpoints:

```text
GET /health
GET /ready
```

They return HTTP 200 only when the API can query SQLite. Every response carries
an `X-Request-ID`; use it to find the matching structured error entry in Render
logs.

## Database backups

Create a consistent SQLite snapshot with:

```bash
cd rifKANDI-backend
npm run backup:db
```

The backup is written to `/var/data/backups` in production. Schedule this
command at least daily and copy the generated snapshots to encrypted storage
outside Render with retention enabled. A backup on the same disk is useful for
application recovery but is not a disaster-recovery copy.

Before restoring any snapshot, create a separate test environment, open the
backup there, and verify orders, wallet ledger, and payment reconciliation.
Do not overwrite the production database without an approved restore plan and
a second backup of its current state.

## Scaling boundary

SQLite is safe for this single-instance Render service after WAL and a busy
timeout are enabled. It is not appropriate for horizontal API scaling or
multiple writers across instances. Before adding replicas, workers, or a second
web service, migrate to managed Postgres and rehearse the cutover and rollback.

## Financial monitoring

Use the authenticated admin reconciliation endpoint regularly:

```text
GET /api/admin/finance/reconciliation
```

It detects internal ledger, escrow, withdrawal, and CMI-record mismatches.
Compare its CMI records with the merchant portal or a gateway statement; the
application cannot independently verify the gateway's bank settlement.
