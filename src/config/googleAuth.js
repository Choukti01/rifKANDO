// A Google OAuth client ID identifies the public browser application. It is
// intentionally safe to ship to browsers; the API still verifies every ID
// token with the matching server-side GOOGLE_CLIENT_ID before a session exists.
//
// Cloudflare's Git build does not read a developer's local .env.production,
// so this fallback keeps the production login button available. An explicit
// VITE_GOOGLE_CLIENT_ID build variable still takes priority.
export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '913193126398-lh5qt3ngeji29ck293ffhjt4ph521mq4.apps.googleusercontent.com'
).trim();

export const GOOGLE_CLIENT_CONFIGURED = Boolean(GOOGLE_CLIENT_ID);
