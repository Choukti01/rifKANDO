const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const legacyRenderApi = /^https:\/\/rifkando-backend\.onrender\.com\/api\/?$/i;
const defaultApiUrl = import.meta.env.PROD
  ? 'https://api.rifkando.com/api'
  : 'http://localhost:5000/api';

// A stale Netlify environment variable previously sent the public site to a
// suspended Render service. Reject that exact retired host even if it remains
// configured remotely, while retaining support for future valid API hosts.
export const API_URL = configuredApiUrl && !legacyRenderApi.test(configuredApiUrl)
  ? configuredApiUrl.replace(/\/$/, '')
  : defaultApiUrl;

export const API_ORIGIN = API_URL.replace(/\/api$/, '');
