import { expect, test } from '@playwright/test';

const apiResponses = {
  '/auth/me': { status: 401, body: { error: 'Authentication required' } },
  '/auth/refresh': { status: 401, body: { error: 'Session expired' } },
  '/products': { status: 200, body: { products: [], pagination: { total: 0, totalPages: 1 } } },
  '/courses': { status: 200, body: { courses: [], pagination: { total: 0, totalPages: 1 } } },
  '/services': { status: 200, body: { services: [], pagination: { total: 0, totalPages: 1 } } },
  '/digital': { status: 200, body: { products: [], pagination: { total: 0, totalPages: 1 } } },
  '/bookings': { status: 200, body: { bookings: [], pagination: { total: 0, totalPages: 1 } } },
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

test('each public marketplace section renders without a blank screen', async ({ page }) => {
  const pages = [
    { path: '/courses', container: '.courses-page', heading: 'Courses', emptyState: 'No courses found' },
    { path: '/services', container: '.services-page', heading: 'Services', emptyState: 'No services found' },
    { path: '/digital', container: '.digital-page', heading: 'Digital Products', emptyState: 'No digital products found' },
    { path: '/bookings', container: '.bookings-page', heading: 'Bookings', emptyState: 'No bookings available' },
  ];

  for (const marketplacePage of pages) {
    await page.goto(marketplacePage.path);
    await expect(page.locator(marketplacePage.container)).toBeVisible();
    await expect(page.getByRole('heading', { name: marketplacePage.heading, exact: true })).toBeVisible();
    await expect(page.getByText(marketplacePage.emptyState, { exact: true })).toBeVisible();
  }
});

test('unauthenticated visitors cannot enter checkout', async ({ page }) => {
  await page.goto('/checkout');

  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
  await expect(page.locator('.auth-page')).toBeVisible();
});

test.describe('mobile public navigation', () => {
  test('opens the menu and reaches a marketplace section without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: 'Open navigation menu', exact: true });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByRole('button', { name: 'Close navigation menu', exact: true })).toHaveAttribute('aria-expanded', 'true');

    const mobileNavigation = page.locator('#mobile-navigation');
    await expect(mobileNavigation).toBeVisible();
    await mobileNavigation.getByRole('link', { name: 'Courses', exact: true }).click();

    await expect(page).toHaveURL(/\/courses$/);
    await expect(page.locator('.courses-page')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
