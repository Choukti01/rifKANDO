# Production deployment

## Current live status

The Netlify frontend is reachable, but the former Render API is suspended and
cannot serve application requests. Its suspension is a hosting-account state,
not a frontend defect. Do not point a production frontend at it while it is
suspended: API failures must be shown as unavailable, never as empty catalog
data.

The local PostgreSQL cutover must also remain paused until `DATABASE_URL`
points to an externally reachable PostgreSQL hostname or provider pooler. A
literal IPv6 address is not a deployable endpoint from this Windows host when
the network has no IPv6 route. Do not set `DATABASE_ENGINE=postgres` until the
target-only preflight and migration steps below pass.

## Self-hosted API with Cloudflare Tunnel

This is a temporary availability path while Render is unavailable. It exposes
the API without opening an inbound router port, but the Windows machine must
remain powered on, connected, and running the API. It is not horizontal
scaling; move the API to managed compute before a public-scale launch.

Before creating the tunnel, use a dedicated, non-root data directory and keep
every value out of Git:

```env
NODE_ENV=production
APP_ENV=production
DATABASE_ENGINE=postgres
PERSISTENT_STORAGE_ROOT=C:\\rifkando-data
UPLOADS_DIR=C:\\rifkando-data\\uploads
CLIENT_URL=https://www.rifkando.com
ALLOWED_ORIGINS=https://www.rifkando.com,https://rifkando.com
BACKEND_URL=https://api.rifkando.com
```

Keep the existing distinct 32+ character `JWT_SECRET`, `SESSION_SECRET`,
`AUDIT_LOG_SECRET`, and `PHONE_OTP_SECRET`; generate any missing values before
starting. Leave `SMS_PROVIDER` empty until a real Twilio sender is configured.
Use the PostgreSQL provider's hostname/pooler URL for `DATABASE_URL`, never a
raw database IP address.

After the provider endpoint is reachable, run these backend commands in order:

```powershell
npm run db:postgres:preflight -- --target-only --json
$env:POSTGRES_MIGRATION_CONFIRM='apply-postgres-schema'; npm run db:postgres:migrate
npm run db:postgres:preflight -- --target-only --json
```

Only when the second preflight reports every expected table and the migration
history is current, start the API with the production environment above. Then
install and authenticate `cloudflared`, create a named tunnel, map
`api.rifkando.com` to `http://localhost:5000`, and set Netlify's build-time
variable to `VITE_API_URL=https://api.rifkando.com/api` before redeploying.
Never commit a tunnel token, Cloudflare credentials, or any `.env` file.

## Backend (Render)

The included `render.yaml` provisions the API and mounts a persistent disk at
`/var/data`. The current live setting is `DATABASE_ENGINE=sqlite`, so do not
deploy without the disk: a database under `/tmp` is deleted on restart.

The backend can now run against PostgreSQL, but changing `DATABASE_ENGINE` to
`postgres` is a controlled cutover action, not a routine deploy setting. First
apply the migrations, import a reviewed SQLite backup into staging, run the
complete tests against staging PostgreSQL, and verify financial reconciliation.
Only then set the backend-only `DATABASE_URL` and `DATABASE_ENGINE=postgres`.
Do not expose `DATABASE_URL` to Netlify, browser code, Git, logs, or support
tickets.

In Render, provide values for every environment variable marked `sync: false`
in `render.yaml`. Use the values in `rifKANDI-backend/.env.example` as the
complete checklist. `NODE_ENV` must be `production` and `CLIENT_URL` must be
the HTTPS URL of the deployed frontend.

Set `METRICS_TOKEN` to a unique random secret before connecting monitoring.
The monitoring service must send it as `X-Metrics-Token` when reading
`/metrics`. Do not put this value in Netlify or any browser environment.

## Deferred activation checklist

These changes are implemented locally but must wait until the Render service
and frontend hosting are active again:

- Restore the Render backend, configure the SMS variables below, and redeploy.
- In a Twilio account, create and verify a Messaging Service, then set
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
  `TWILIO_MESSAGING_SERVICE_SID` in Render. Render generates
  `PHONE_OTP_SECRET`; do not reuse it as any other secret.
- Redeploy the frontend on Netlify after the backend is healthy, with
  `VITE_API_URL` pointing to the restored HTTPS API.
- Add the production frontend origins to the Google OAuth client and perform a
  real phone-code registration and sign-in smoke test.
- Complete the staged PostgreSQL cutover only after the Render service is
  restored and a real staging database is available.

## Frontend

Set these build-time values in the frontend host:

- `VITE_API_URL=https://<your-backend-host>/api`
- `VITE_GOOGLE_CLIENT_ID=<your Google web client ID>`

The frontend environment file is intentionally not committed. Do not put
backend secrets in a `VITE_` variable; Vite exposes those values to browsers.

## Staging and production separation

Create staging as a separate Render service from `render.staging.yaml` and a
separate frontend site (or a protected staging branch) using
`.env.staging.example`. It must have its own persistent disk/database,
frontend hostname, Google OAuth client, email sender, object-storage
credentials, and secrets. Never point staging at the production database,
uploads, API URL, or payment credentials.

Both deployed environments use `NODE_ENV=production`, so browser cookies stay
`Secure` and API security headers remain enabled. `APP_ENV` differentiates the
application environment: use `staging` in the staging service and `production`
in the live service. Startup rejects an unsafe combination, weak or reused
session/audit secrets, HTTP origins, placeholder secrets, or a partial payment
configuration.

CMI is in test mode when `APP_ENV=staging`; configure separate test credentials
only if CMI provides them. Otherwise leave all three CMI settings absent in
staging. Do not route live CMI callbacks to staging.

## Authentication

Google sign-up and sign-in use the verified email returned by Google. Phone
sign-up and sign-in use a six-digit SMS code delivered by Twilio. The backend
never exposes SMS-provider credentials to the browser and refuses phone
authentication until its SMS configuration is complete.

## Google OAuth

Use the same Google web client ID for `VITE_GOOGLE_CLIENT_ID` and the backend
`GOOGLE_CLIENT_ID`. In Google Cloud Console, add these Authorized JavaScript
Origins:

- `https://rifkando.com`
- `https://www.rifkando.com`

Keep `http://localhost:5173` only for local development.
