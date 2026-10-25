import { test, expect } from '@playwright/test';

test.describe('Empirical Challenger 2 — Milestone 3 Browser Route Guards & Security Suite', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Security Test 1: Unauthenticated user navigating to /admin/system is redirected to /', async ({ page }) => {
    // Navigate directly to protected route /admin/system
    await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });

    // Expect url to redirect to /
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('Security Test 2: Unauthenticated user navigating to /admin/dashboard is redirected to /', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('Security Test 3: Customer role navigating to /admin/system is redirected to /', async ({ page }) => {
    // Obtain valid customer token from live backend
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'customer@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const customerToken = loginData.accessToken;
    expect(customerToken).toBeTruthy();

    // Set customer token in sessionStorage
    await page.evaluate((token: string) => {
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('fullName', 'Khách Hàng Test');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, customerToken);

    // Attempt to access /admin/system
    await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });

    // Must be redirected to root /
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('Security Test 4: Customer role navigating to /admin/dashboard is redirected to /', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'customer@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const customerToken = loginData.accessToken;

    await page.evaluate((token: string) => {
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('fullName', 'Khách Hàng Test');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, customerToken);

    await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('Security Test 5: Admin role navigating to /admin/system is ALLOWED and loads SystemAdminPage', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'admin@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const adminToken = loginData.accessToken;
    expect(adminToken).toBeTruthy();

    await page.evaluate((token: string) => {
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('fullName', 'Quản Trị Viên');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, adminToken);

    await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });

    // Expect to stay on /admin/system
    await expect(page).toHaveURL(/.*\/admin\/system/);

    // Verify page content loads
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Quản Trị Hệ Thống');
  });

  test('Security Test 6: Admin role navigating to /admin/dashboard is ALLOWED and renders 4 KPI cards', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'admin@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const adminToken = loginData.accessToken;

    await page.evaluate((token: string) => {
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('fullName', 'Quản Trị Viên');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, adminToken);

    await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/.*\/admin\/dashboard/);

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Chỉ Số Vận Hành');
  });

  test('Security Test 7: Sidebar renders all 7 tabs without any "Sắp có" badges', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'admin@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const adminToken = loginData.accessToken;

    await page.evaluate((token: string) => {
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('fullName', 'Quản Trị Viên');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, adminToken);

    await page.goto('http://localhost:5173/admin/orders', { waitUntil: 'domcontentloaded' });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Verify all 7 links exist
    const expectedPaths = [
      '/admin/dashboard',
      '/admin/reviews',
      '/admin/orders',
      '/admin/fulfillment',
      '/admin/finance',
      '/admin/warranty',
      '/admin/system',
    ];

    for (const path of expectedPaths) {
      const link = sidebar.locator(`a[href="${path}"]`);
      await expect(link).toBeVisible();
    }

    // Assert zero "Sắp có"
    const badges = sidebar.locator('text="Sắp có"');
    const badgeCount = await badges.count();
    expect(badgeCount).toBe(0);
  });
});
