# Production deployment

## Backend (Render)

The included `render.yaml` provisions the API and mounts a persistent disk at
`/var/data`. This is required because the application currently uses SQLite.
Do not deploy without the disk: a database under `/tmp` is deleted on restart.

In Render, provide values for every environment variable marked `sync: false`
in `render.yaml`. Use the values in `rifKANDI-backend/.env.example` as the
complete checklist. `NODE_ENV` must be `production` and `CLIENT_URL` must be
the HTTPS URL of the deployed frontend.

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

## Google registration verification

New Google sign-ups are activated only after the user enters a six-digit code
sent to the verified Google email address. Configure `RESEND_API_KEY` and an
`EMAIL_FROM` address from a domain verified in Resend. Google OAuth verifies
the Google identity but does not send application email codes itself.

## Google OAuth

Use the same Google web client ID for `VITE_GOOGLE_CLIENT_ID` and the backend
`GOOGLE_CLIENT_ID`. In Google Cloud Console, add these Authorized JavaScript
Origins:

- `https://rifkando.com`
- `https://www.rifkando.com`

Keep `http://localhost:5173` only for local development.
