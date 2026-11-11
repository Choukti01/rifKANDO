# rifKANDO Production Operations Runbook

This document is the authoritative production runbook for the Railway
deployment. Never put database URLs, R2 keys, OAuth secrets, payment details,
or session secrets in Git, issue comments, screenshots, or chat messages.

## Live architecture

- **Storefront:** Cloudflare Workers at `https://www.rifkando.com`
- **API:** Railway at `https://api.rifkando.com`
- **Database:** Neon PostgreSQL
- **Media:** Cloudflare R2, with separate public and private buckets
- **Source and deployment:** private GitHub repository and Railway GitHub
  deployment integration

The Windows PC and Cloudflare Tunnel are no longer production dependencies.
Do not re-enable the old tunnel during normal operations.

## Required Railway configuration

Configure these values in Railway’s Variables UI only:

```text
NODE_ENV=production
APP_ENV=production
DATABASE_ENGINE=postgres
DATABASE_URL=<Neon pooled production URL>
POSTGRES_SSL=true
CLIENT_URL=https://www.rifkando.com
ALLOWED_ORIGINS=https://www.rifkando.com,https://rifkando.com
OBJECT_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=<Cloudflare R2 S3 endpoint>
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_PUBLIC_BUCKET=<public R2 bucket>
OBJECT_STORAGE_PRIVATE_BUCKET=<private R2 bucket>
OBJECT_STORAGE_ACCESS_KEY_ID=<R2 access key>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<R2 secret>
OBJECT_STORAGE_PUBLIC_BASE_URL=https://media.rifkando.com
OBJECT_STORAGE_FORCE_PATH_STYLE=true
JWT_SECRET=<unique secret>
SESSION_SECRET=<unique secret>
AUDIT_LOG_SECRET=<unique secret>
PHONE_OTP_SECRET=<unique secret>
METRICS_TOKEN=<unique secret>
```

`CMI_STORE_KEY`, `CMI_CLIENT_ID`, and `BACKEND_URL` must be configured
together or all removed. CMI is not active for the current manual-bank/COD
launch, so leave all three absent until an intentional CMI launch.

## Health and monitoring

| Check | Meaning | Expected result |
| --- | --- | --- |
| `GET /health` | Railway process is alive | `200`, `status: ok` |
| `GET /ready` | API can query Neon PostgreSQL | `200`, `status: ready` |
| `GET /ready/storage` | API credentials can read both R2 buckets | `200`, `resource: storage` |
| `GET /metrics` | Aggregate metrics, protected by `X-Metrics-Token` | `200` only for a trusted monitor |

Every API response returns `X-Request-ID`. Use it when matching a user report
to Railway structured logs or the internal **rifKANDO Error Tracking** page.
Request bodies, cookies, and payment details must never be logged.

GitHub Actions runs the public production readiness check every 30 minutes. It
checks the storefront, API, CORS, Neon readiness, and R2 readiness. Keep
GitHub notifications enabled for workflow failures. A future external monitor
may poll the same public endpoints at a shorter interval without needing a
secret.

Run the same read-only check on demand:

```bash
cd rifKANDI-backend
npm run verify:production
```

## Deploy and rollback

1. Run local quality checks before merging or pushing.
2. Railway deploys `main` from the `rifKANDI-backend` root directory.
3. Wait for Railway’s `/ready` health check to pass.
4. Run `npm run verify:production` from a trusted machine.
5. Verify one public page and one authenticated workflow manually.

If a backend deployment is unhealthy, use Railway deployment history to
redeploy the last known-good build. If a frontend deployment is unhealthy, use
Cloudflare Workers deployment history. Do not edit or delete applied database
migrations; create a forward repair migration instead.

## Backup and restore drill

Neon provider recovery and restore branches are the primary PostgreSQL
recovery method. Perform this once per month:

1. In Neon, create a restore branch from production. Never restore over the
   live branch.
2. Use the branch connection string only in a local shell.
3. Run `npm run db:postgres:preflight` with `DATABASE_ENGINE=postgres`.
4. Check the expected tables, wallet ledger, COD records, and service/course
   reconciliation records.
5. Record the date, operator, result, and branch name in the incident log.
6. Delete the temporary branch after the drill.

`npm run backup:postgres:r2` needs the official `pg_dump` client and a private
R2 bucket. Automate it from a managed runner or Railway cron only after one
manual backup and restore succeed. A personal computer is not a production
backup runner.

## Incident response

1. Check `/health`, `/ready`, and `/ready/storage`.
2. Open Railway logs and search by `X-Request-ID`.
3. Review the restricted Error Tracking page for grouped failures.
4. Pause only the affected capability with `FEATURE_FLAGS` if possible.
5. Roll back the Railway or Cloudflare deployment if a release caused the
   incident.
6. Preserve the request ID, timestamp, impact, mitigation, and regression
   test for follow-up.

## Access rules

- Keep the GitHub repository private.
- Grant Railway and Cloudflare access only to this repository.
- Rotate any secret ever exposed in a public commit, screenshot, log, or chat.
- Give operations/reconciliation access only to named rifKANDO team members.
- Never put bank account details in browser code or version control.
