const PUBLIC_CATALOG_SNAPSHOT_URL = 'https://media.rifkando.com/public/catalog/latest.json';
const SERVICE_WORKER_RECOVERY_COOKIE = 'rifkando_sw_recovery=1';

const applyServiceWorkerRecovery = (request, response) => {
  const isNavigation = request.method === 'GET'
    && request.headers.get('accept')?.includes('text/html');
  const alreadyRecovered = request.headers.get('cookie')?.includes(SERVICE_WORKER_RECOVERY_COOKIE);

  if (!isNavigation || alreadyRecovered) return response;

  // A previously deployed service worker could turn an upstream failure into
  // an invalid browser response. Clear only origin storage once so browsers
  // remove that registration without clearing authenticated session cookies.
  const headers = new Headers(response.headers);
  headers.set('Clear-Site-Data', '"storage"');
  headers.append(
    'Set-Cookie',
    `${SERVICE_WORKER_RECOVERY_COOKIE}; Max-Age=604800; Path=/; Secure; SameSite=Lax`,
  );

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

const catalogSnapshotResponse = async (request) => {
  try {
    const upstream = await fetch(PUBLIC_CATALOG_SNAPSHOT_URL, {
      headers: { Accept: 'application/json' },
    });
    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      headers,
      status: upstream.status,
      statusText: upstream.statusText,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Catalog snapshot is temporarily unavailable.' }), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
      status: 503,
    });
  }
};

// Serve the React shell only for browser page navigations. Returning index.html
// for every unknown URL makes a missing JavaScript asset look like a valid 200
// HTML response, which causes a blank screen after deployments.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'rifkando.com') {
      url.protocol = 'https:';
      url.hostname = 'www.rifkando.com';
      return Response.redirect(url.toString(), 301);
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/catalog/latest.json') {
      return catalogSnapshotResponse(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return applyServiceWorkerRecovery(request, assetResponse);

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if ((request.method === 'GET' || request.method === 'HEAD') && acceptsHtml) {
      url.pathname = '/index.html';
      url.search = '';
      return applyServiceWorkerRecovery(request, await env.ASSETS.fetch(new Request(url, request)));
    }

    return assetResponse;
  },
};
