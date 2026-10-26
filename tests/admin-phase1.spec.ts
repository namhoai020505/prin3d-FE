import { test, expect } from '@playwright/test';

test.describe('Admin Portal Phase 1 E2E Suite', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Flow 1: Admin login redirects to /admin/orders, sidebar clean-up, customer stays on home', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    // 1. Open Login Modal by clicking sidebar account / login button
    const loginTrigger = page.locator('button[title*="Đăng nhập"]').first();
    await expect(loginTrigger).toBeVisible({ timeout: 15000 });
    await loginTrigger.click();

    // 2. Fill Admin Credentials
    const emailInput = page.locator('input[placeholder*="admin@123"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('admin@123');

    const passwordInput = page.locator('input[placeholder*="••••••••"]').first();
    await passwordInput.fill('Admin@123456');

    const submitBtn = page.locator('button[type="submit"]:has-text("Đăng nhập")').first();
    await submitBtn.click();

    // 3. Admin must be automatically redirected to /admin/orders
    await page.waitForURL('**/admin/orders', { timeout: 20000 });
    expect(page.url()).toContain('/admin/orders');

    // 4. Verify Admin Sidebar Clean-up
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Must have Tab 2 (Reviews) and Tab 3 (Orders) enabled
    await expect(sidebar.locator('a[href="/admin/reviews"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/orders"]')).toBeVisible();

    // Other subsystems must be disabled with "Sắp có" badge
    await expect(sidebar.locator('text=Sắp có').first()).toBeVisible();

    // Must NOT have links to customer studio, pricing, or bookings
    await expect(sidebar.locator('a[href="/create"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/ticket-prices"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/my-bookings"]')).toHaveCount(0);

    // Bottom link "← Về trang khách hàng"
    const backToClientLink = sidebar.locator('a[href="/"]:has-text("Về trang khách hàng")');
    await expect(backToClientLink).toBeVisible();

    // 5. Navigate back to client homepage
    await backToClientLink.click();
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

    // Open user account menu and verify "Trung tâm quản trị" button exists
    const accountBtn = page.locator('button[title*="Tài khoản"]').first();
    await expect(accountBtn).toBeVisible({ timeout: 5000 });
    await accountBtn.click();

    const adminCenterBtn = page.locator('button:has-text("Trung tâm quản trị")');
    await expect(adminCenterBtn).toBeVisible({ timeout: 5000 });

    // 6. Customer Login test: customer should stay on "/"
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    const cusLoginTrigger = page.locator('button[title*="Đăng nhập"]').first();
    await expect(cusLoginTrigger).toBeVisible({ timeout: 10000 });
    await cusLoginTrigger.click();

    const cusEmailInput = page.locator('input[placeholder*="admin@123"]').first();
    await expect(cusEmailInput).toBeVisible({ timeout: 10000 });
    await cusEmailInput.fill('customer@123');

    const cusPasswordInput = page.locator('input[placeholder*="••••••••"]').first();
    await cusPasswordInput.fill('Admin@123456');

    const cusSubmitBtn = page.locator('button[type="submit"]:has-text("Đăng nhập")').first();
    await cusSubmitBtn.click();

    await page.waitForTimeout(2500);
    // Customer must stay on home page
    expect(page.url()).not.toContain('/admin');
  });

  test('Flow 2: Orders list, search, pagination, drawer details, and cancel modal', async ({ page }) => {
    // 1. Authenticate as Admin via API and set sessionStorage
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'admin@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.accessToken;

    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate((jwt) => {
      sessionStorage.setItem('accessToken', jwt);
      sessionStorage.setItem('fullName', 'Quản Trị Viên');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, token);

    // 2. Navigate to Orders Page
    await page.goto('http://localhost:5173/admin/orders', { waitUntil: 'domcontentloaded' });

    // Page title
    await expect(page.locator('h1:has-text("Quản lý Đơn hàng")')).toBeVisible({ timeout: 15000 });

    // Table must be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check table headers
    await expect(page.locator('th:has-text("Mã đơn")')).toBeVisible();
    await expect(page.locator('th:has-text("Khách hàng")')).toBeVisible();
    await expect(page.locator('th:has-text("Vận hành")')).toBeVisible();
    await expect(page.locator('th:has-text("Thanh toán")')).toBeVisible();
    await expect(page.locator('th:has-text("Tổng tiền")')).toBeVisible();

    // 3. Open Detail Drawer by clicking an order or 'Chi tiết'
    const detailBtn = page.locator('button:has-text("Chi tiết")').first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();

      // Drawer should appear
      const drawer = page.locator('aside[aria-label="Chi tiết đơn hàng"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Verify sections inside drawer
      await expect(drawer.locator('text=Thông tin khách hàng & Giao nhận')).toBeVisible();
      await expect(drawer.locator('text=Chi tiết sản phẩm in 3D')).toBeVisible();
      await expect(drawer.locator('text=Nhật ký trạng thái')).toBeVisible();

      // Close drawer
      const closeBtn = drawer.locator('button[title*="Đóng"]').first();
      await closeBtn.click();
      await expect(drawer).not.toBeVisible();
    }

    // 4. Test Cancel Modal on an order
    const cancelBtn = page.locator('button:has-text("Hủy")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      const modal = page.locator('div[role="dialog"]:has-text("Xác nhận hủy đơn hàng")');
      await expect(modal).toBeVisible();

      const reasonTextarea = modal.locator('textarea');
      const confirmCancelBtn = modal.locator('button:has-text("Xác nhận hủy đơn")');

      // Reason < 10 characters should keep button disabled
      await reasonTextarea.fill('Quá ngắn');
      await expect(confirmCancelBtn).toBeDisabled();

      // Reason >= 10 characters should enable button
      await reasonTextarea.fill('Khách hàng đổi ý muốn đổi vật liệu in SLA khác');
      await expect(confirmCancelBtn).toBeEnabled();

      // Close modal without submitting destructive action
      const cancelModalClose = modal.locator('button:has-text("Hủy bỏ")');
      await cancelModalClose.click();
      await expect(modal).not.toBeVisible();
    }
  });

  test('Flow 3: 3D Reviews master-detail, 3D viewer, and approval workflow', async ({ page }) => {
    // 1. Authenticate as Admin via API and set sessionStorage
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'admin@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.accessToken;

    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate((jwt) => {
      sessionStorage.setItem('accessToken', jwt);
      sessionStorage.setItem('fullName', 'Quản Trị Viên');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, token);

    // 2. Navigate directly to target generation task
    const targetTaskId = '0b59e95e-e391-4638-916d-01b9fe673425';
    await page.goto(`http://localhost:5173/admin/reviews/${targetTaskId}`, { waitUntil: 'domcontentloaded' });

    // Page title
    await expect(page.locator('h1:has-text("Thẩm định Mẫu in 3D")')).toBeVisible({ timeout: 15000 });

    // 3. Verify Master-Detail Workspace
    // Left list
    await expect(page.locator('text=Hoàn tất').first()).toBeVisible({ timeout: 10000 });

    // Right Workspace: 3D Canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Geometric specs
    await expect(page.getByText('Kín nước (Watertight)', { exact: true })).toBeVisible();
    await expect(page.locator('span:has-text("Chiều cao yêu cầu")')).toBeVisible();

    // 4. Verify Review Form & Canonical Print Config Warning
    await expect(page.locator('text=Phiếu thẩm định kỹ thuật in 3D')).toBeVisible();
    await expect(page.locator('text=Cảnh báo nghiệp vụ')).toBeVisible();

    // Fill note
    const noteField = page.locator('textarea').first();
    await noteField.fill('Kiểm định hình học đạt chuẩn in SLA, kết cấu kín nước và đủ điều kiện xuất xưởng.');

    // Submit Approval
    const approveBtn = page.locator('button.btn-pooled-cyan');
    await expect(approveBtn).toBeEnabled();
    await approveBtn.click();

    // Check for success feedback (toast or status update)
    await page.waitForTimeout(3000);

    // 5. Customer Verification: Ensure customer (owner namhoai020505@gmail.com) can now approve/quote without ReviewRequired error
    const cusLoginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'namhoai020505@gmail.com', password: 'Admin@123456' },
    });
    expect(cusLoginRes.ok()).toBeTruthy();
    const cusLoginData = await cusLoginRes.json();
    const cusToken = cusLoginData.accessToken;

    // Check that customer approval endpoint returns success with matching canonical configuration
    // Target versionId is 07414FEC-D3EB-473C-9E34-6EFD438950DF
    const approvalRes = await page.request.post('http://localhost:5133/api/v2/approvals', {
      headers: { Authorization: `Bearer ${cusToken}` },
      data: {
        versionId: '07414fec-d3eb-473c-9e34-6efd438950df',
        configuration: {
          material: 'Resin Tiêu chuẩn',
          heightMm: 100,
          scale: 1,
        },
      },
    });

    expect([200, 201]).toContain(approvalRes.status());
  });
});
