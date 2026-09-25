// Serve the React shell only for browser page navigations. Returning index.html
// for every unknown URL makes a missing JavaScript asset look like a valid 200
// HTML response, which causes a blank screen after deployments.
export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if ((request.method === 'GET' || request.method === 'HEAD') && acceptsHtml) {
      const url = new URL(request.url);
      url.pathname = '/index.html';
      url.search = '';
      return env.ASSETS.fetch(new Request(url, request));
    }

    return assetResponse;
  },
};
