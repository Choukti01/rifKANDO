import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './cloudflareWorker';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Cloudflare Worker catalog snapshot route', () => {
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
});
