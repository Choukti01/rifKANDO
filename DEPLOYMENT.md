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

## Google OAuth

Use the same Google web client ID for `VITE_GOOGLE_CLIENT_ID` and the backend
`GOOGLE_CLIENT_ID`. In Google Cloud Console, add these Authorized JavaScript
Origins:

- `https://rifkando.com`
- `https://www.rifkando.com`

Keep `http://localhost:5173` only for local development.
