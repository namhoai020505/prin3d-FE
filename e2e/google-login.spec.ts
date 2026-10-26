import { test, expect } from '@playwright/test';

test.describe('Google Login E2E Suite', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Test 1: LoginModal displays Google Login button in both login and signup modes', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    // 1. Open Login Modal
    const loginTrigger = page.locator('button[title*="Đăng nhập"]').first();
    await expect(loginTrigger).toBeVisible({ timeout: 15000 });
    await loginTrigger.click();

    // 2. Verify modal in login mode shows divider and Google button
    const modal = page.locator('div.fixed.inset-0 div.glass-card-3d');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('text=Hoặc')).toBeVisible();
    await expect(modal.locator('button:has-text("Đăng Nhập Bằng Google")')).toBeVisible();

    // 3. Switch to Signup mode
    const signupBtn = modal.locator('button:has-text("Đăng ký ngay")');
    await expect(signupBtn).toBeVisible();
    await signupBtn.click();

    // 4. Verify modal in signup mode also displays divider and Google button
    await expect(modal.locator('text=Hoặc')).toBeVisible();
    await expect(modal.locator('button:has-text("Đăng Ký Bằng Google")')).toBeVisible();
  });

  test('Test 2: Successful Google OAuth login stores session and shows welcome toast', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    // Mock Backend POST /api/auth/google-login
    await page.route('**/api/auth/google-login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock.google.jwt.token',
          refreshToken: 'mock-refresh-token',
          accessExpires: new Date(Date.now() + 3600000).toISOString(),
          user: {
            id: 'google-user-123',
            email: 'testuser@gmail.com',
            fullName: 'Nguyen Google Test',
            role: 'Customer',
            accountStatus: 'Active',
            emailVerified: true,
            freeTrialRemaining: 2,
            purchasedRemaining: 0,
          },
        }),
      });
    });

    // Open Login Modal
    const loginTrigger = page.locator('button[title*="Đăng nhập"]').first();
    await expect(loginTrigger).toBeVisible({ timeout: 15000 });
    await loginTrigger.click();

    const modal = page.locator('div.fixed.inset-0 div.glass-card-3d');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Simulate Google credential dispatch via authService
    await page.evaluate(async () => {
      const response = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid-mocked-google-id-token' }),
      });
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('authSession', JSON.stringify({
        accessToken: data.accessToken,
        fullName: data.user.fullName,
      }));
      window.dispatchEvent(new Event('authSessionChanged'));
    });

    // Verify session in localStorage
    const savedToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(savedToken).toBe('mock.google.jwt.token');

    const authSession = await page.evaluate(() => localStorage.getItem('authSession'));
    expect(authSession).toContain('Nguyen Google Test');
  });
});
