import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './cloudflareWorker';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Cloudflare Worker catalog snapshot route', () => {
  it('redirects the root domain to the secure canonical storefront', async () => {
    const assetsFetch = vi.fn();

    const response = await worker.fetch(
      new Request('http://rifkando.com/products?condition=new'),
      { ASSETS: { fetch: assetsFetch } },
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://www.rifkando.com/products?condition=new');
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it('proxies the snapshot before static-asset routing', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ schemaVersion: 1 }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      status: 200,
    }));
    const assetsFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await worker.fetch(
      new Request('https://www.rifkando.com/catalog/latest.json'),
      { ASSETS: { fetch: assetsFetch } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({ schemaVersion: 1 });
    expect(upstreamFetch).toHaveBeenCalledOnce();
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it('serves a canonical sitemap even while the catalogue API is unavailable', async () => {
    const upstreamFetch = vi.fn().mockRejectedValue(new Error('offline'));
    const assetsFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await worker.fetch(
      new Request('https://www.rifkando.com/sitemap.xml'),
      { ASSETS: { fetch: assetsFetch } },
    );

    const sitemap = await response.text();
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(sitemap).toContain('<loc>https://www.rifkando.com/products</loc>');
    expect(sitemap).toContain('<loc>https://www.rifkando.com/findit</loc>');
    expect(sitemap).not.toContain('/login</loc>');
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it('adds a noindex header to private app pages', async () => {
    const response = await worker.fetch(
      new Request('https://www.rifkando.com/checkout', { headers: { Accept: 'text/html' } }),
      { ASSETS: { fetch: vi.fn().mockResolvedValue(new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } })) } },
    );

    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });

  it('writes route-specific metadata into public HTML before React loads', async () => {
    const document = '<!doctype html><html><head><meta name="description" content="old"><link rel="canonical" href="https://www.rifkando.com/"><meta property="og:url" content="https://www.rifkando.com/"><title>old</title></head><body><div id="root"></div></body></html>';
    const response = await worker.fetch(
      new Request('https://www.rifkando.com/products', { headers: { Accept: 'text/html' } }),
      { ASSETS: { fetch: vi.fn().mockResolvedValue(new Response(document, { headers: { 'Content-Type': 'text/html' } })) } },
    );

    const html = await response.text();
    expect(html).toContain('<title>Products in Morocco | New, Used as New and Joutiya | rifKANDO</title>');
    expect(html).toContain('<link rel="canonical" href="https://www.rifkando.com/products" />');
    expect(html).toContain('name="robots" content="index,follow,max-image-preview:large"');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
  });

  it('removes the legacy service worker once for a browser navigation', async () => {
    const response = await worker.fetch(
      new Request('https://www.rifkando.com/', { headers: { Accept: 'text/html' } }),
      { ASSETS: { fetch: vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200 })) } },
    );

    expect(response.headers.get('clear-site-data')).toBe('"storage"');
    expect(response.headers.get('set-cookie')).toContain('rifkando_sw_recovery=1');
  });
});
