import { expect, test } from '@playwright/test';

const apiResponses = {
  '/auth/me': { status: 401, body: { error: 'Authentication required' } },
  '/auth/refresh': { status: 401, body: { error: 'Session expired' } },
  '/products': { status: 200, body: { products: [], pagination: { total: 0, totalPages: 1 } } },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const response = apiResponses[requestUrl.pathname.replace('/api', '')];

    await route.fulfill({
      status: response?.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(response?.body ?? {}),
    });
  });
});

test('clears obsolete localStorage credentials during browser startup', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'legacy-bearer-token');
    localStorage.setItem('user', JSON.stringify({ id: 7, role: 'admin' }));
  });

  await page.goto('/');
  await expect(page.locator('.brand-name')).toContainText('rifKANDO');
  await expect.poll(() => page.evaluate(() => ({
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
  }))).toEqual({ token: null, user: null });
});

test('public catalogue navigation renders the products page', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-links-desktop a[href="/products"]').click();

  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator('.products-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
  await expect(page.getByText('No products found')).toBeVisible();
});

test('unauthenticated visitors cannot enter checkout', async ({ page }) => {
  await page.goto('/checkout');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.auth-page')).toBeVisible();
});
