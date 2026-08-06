import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api, {
  clearCsrfToken,
  getProducts,
  setCsrfToken,
} from './api';

const runRequestInterceptor = (config) => api.interceptors.request.handlers[0].fulfilled(config);

describe('browser API client security boundary', () => {
  beforeEach(() => {
    clearCsrfToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearCsrfToken();
  });

  it('uses cookies, removes stale bearer tokens, and sends CSRF only on unsafe requests', () => {
    setCsrfToken('a'.repeat(32));

    const unsafeRequest = runRequestInterceptor({
      method: 'post',
      headers: { Authorization: 'Bearer stale-token' },
    });
    const safeRequest = runRequestInterceptor({
      method: 'get',
      headers: { authorization: 'Bearer stale-token' },
    });

    expect(unsafeRequest.withCredentials).toBe(true);
    expect(unsafeRequest.headers.Authorization).toBeUndefined();
    expect(unsafeRequest.headers['X-CSRF-Token']).toBe('a'.repeat(32));
    expect(safeRequest.headers.authorization).toBeUndefined();
    expect(safeRequest.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('rejects invalid CSRF token values', () => {
    setCsrfToken('too-short');

    const request = runRequestInterceptor({ method: 'patch', headers: {} });

    expect(request.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('uses the canonical protected products endpoint', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true } });

    await getProducts();

    expect(get).toHaveBeenCalledWith('/products');
  });
});
