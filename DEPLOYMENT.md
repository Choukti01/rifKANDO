# Production deployment

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
