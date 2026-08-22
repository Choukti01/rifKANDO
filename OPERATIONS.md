# Production Operations Runbook

## Required production configuration

Render must use the mounted disk and these canonical frontend settings:

```text
DATABASE_ENGINE=sqlite
DATABASE_PATH=/var/data/rifkandi.db
DB_BACKUP_DIR=/var/data/backups
DB_BACKUP_RETENTION_DAYS=14
OBJECT_STORAGE_DRIVER=local
UPLOADS_DIR=/var/data/uploads
CLIENT_URL=https://www.rifkando.com
ALLOWED_ORIGINS=https://www.rifkando.com,https://rifkando.com
```

`JWT_SECRET` must be at least 32 characters. Configure `CMI_STORE_KEY`,
`CMI_CLIENT_ID`, and `BACKEND_URL` together, never independently. The server
will refuse a production startup with a missing persistent database path,
invalid origin, weak JWT secret, or partial CMI configuration.

## Health and monitoring

Use `GET /health` for a liveness probe. It confirms that the Node process can
respond without depending on the database. Use `GET /ready` for a readiness
probe. It verifies the database before a service receives traffic.

Every response includes `X-Request-ID`. Keep this value when investigating a
customer report or an error log. Request logs are structured JSON and include
only request metadata, never request bodies, cookies, authorization headers,
or payment details.

`GET /metrics` is intentionally hidden unless the request contains the
`X-Metrics-Token` header matching `METRICS_TOKEN`. Configure a unique 32+
character `METRICS_TOKEN` in Render before connecting a monitoring service.
Metrics responses use `Cache-Control: no-store` and contain aggregate request
counts, durations, status classes, memory use, and uptime only.

## Files and object storage

The current Render blueprint uses `OBJECT_STORAGE_DRIVER=local` with
`UPLOADS_DIR=/var/data/uploads`. New profile pictures, marketplace images,
KYC documents, invoices, and digital files therefore survive a deploy for this
one persistent-disk web instance. Only the `public/` namespace is served at
`/uploads/*`. KYC documents, invoices, and paid digital files are stored as
opaque `storage://private/...` references and are streamed only through their
authenticated API routes.

Before adding a replica, worker, or a second service, set
`OBJECT_STORAGE_DRIVER=s3` and configure two different S3-compatible buckets:

```text
OBJECT_STORAGE_ENDPOINT=https://your-account.s3-provider.example
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_PUBLIC_BUCKET=rifkando-public
OBJECT_STORAGE_PRIVATE_BUCKET=rifkando-private
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_PUBLIC_BASE_URL=https://cdn.your-domain.example
OBJECT_STORAGE_FORCE_PATH_STYLE=false
```

The public bucket/CDN may expose only `public/*`. The private bucket must not
have public access or a public CDN origin. Enable provider-side encryption,
versioning, lifecycle rules, and access logs. Use separate least-privilege
credentials for the two buckets.

Files uploaded before this change lived on Render's ephemeral filesystem. Take
an inventory and migrate any still-available legacy media before deploying;
legacy paid digital files are intentionally blocked until re-uploaded to
private storage, rather than risking a public or path-traversal download.

## Deployment verification

After each backend deployment, verify both endpoints:

```text
GET /health
GET /ready
```

They return HTTP 200 only when the API can query its configured database. Every response carries
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
outside Render with retention enabled. The command verifies SQLite integrity,
logs a SHA-256 checksum, and removes only matching backups older than
`DB_BACKUP_RETENTION_DAYS`. A backup on the same disk is useful for application
recovery but is not a disaster-recovery copy. A Render Cron Job cannot back up
this web service's persistent disk, so run the schedule from the service host
or use an external backup process with access to the mounted data.

Before restoring any snapshot, create a separate test environment, open the
backup there, and verify orders, wallet ledger, and payment reconciliation.
Do not overwrite the production database without an approved restore plan and
a second backup of its current state.

## Scaling boundary

SQLite is safe for this single-instance Render service after WAL and a busy
timeout are enabled. It is not appropriate for horizontal API scaling or
multiple writers across instances. Before adding replicas, workers, or a second
web service, migrate to managed Postgres and rehearse the cutover and rollback.
The code supports a guarded runtime switch through `DATABASE_ENGINE=postgres`,
but production must remain on `DATABASE_ENGINE=sqlite` until the PostgreSQL
schema, data import, staging API tests, financial reconciliation, and rollback
plan are all verified. The detailed sequence is in
`rifKANDI-backend/POSTGRESQL_MIGRATION.md`.
Node is pinned to `22.22.3` in the repository, CI, and Render blueprint; use
that version locally before installing the native SQLite dependency.

## Financial monitoring

Use the authenticated admin reconciliation endpoint regularly:

```text
GET /api/admin/finance/reconciliation
```

It detects internal ledger, escrow, withdrawal, and CMI-record mismatches.
Compare its CMI records with the merchant portal or a gateway statement; the
application cannot independently verify the gateway's bank settlement.

## Feature-flag rollback

The backend supports focused-launch operational switches through the Render
`FEATURE_FLAGS` environment variable:

```text
checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=false,courses=false,services=false,digital=false
```

This is the current public launch configuration: Products and FINDit use Cash
on Delivery. Set a switch to `false` and restart the service to stop only that
operation:

- `checkout=false` stops new marketplace orders.
- `cmi_payments=false` stops new CMI payment initiation. Signed CMI callbacks
  remain active so payments already in flight can be reconciled safely.
- `wallet_payments=false` blocks non-COD wallet settlement in internal order
  workflows. Public checkout validates COD only regardless of this switch.
- `digital_downloads=false` temporarily stops protected digital file delivery.
- `courses=false`, `services=false`, and `digital=false` park their entire API
  domains while their source and data remain retained for future rollout.

Use all values explicitly when changing the variable. The service rejects
unknown, duplicated, or malformed values at startup. After a restart, verify
`/ready` and, as a super administrator, `GET /api/admin/feature-flags`. That
read is recorded in the tamper-evident audit log. Restore the prior value only
after the incident is understood and a regression test covers its cause.
