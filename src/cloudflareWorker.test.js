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

  it('removes the legacy service worker once for a browser navigation', async () => {
    const response = await worker.fetch(
      new Request('https://www.rifkando.com/', { headers: { Accept: 'text/html' } }),
      { ASSETS: { fetch: vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200 })) } },
    );

    expect(response.headers.get('clear-site-data')).toBe('"storage"');
    expect(response.headers.get('set-cookie')).toContain('rifkando_sw_recovery=1');
  });
});
