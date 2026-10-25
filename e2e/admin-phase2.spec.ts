import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const resetTestOrder = () => {
  const sql = `
SET QUOTED_IDENTIFIER ON;
DECLARE @oid UNIQUEIDENTIFIER = '256572EB-EB5D-40B1-9311-99F9970D27CE';
DELETE se FROM ShipmentEvents se INNER JOIN Shipments s ON se.ShipmentId = s.Id WHERE s.OrderId = @oid;
DELETE FROM Shipments WHERE OrderId = @oid;
DELETE pr FROM ProductionRuns pr INNER JOIN PartnerAssignments pa ON pr.AssignmentId = pa.Id WHERE pa.OrderId = @oid;
DELETE FROM PartnerAssignments WHERE OrderId = @oid;
UPDATE Orders SET FulfillmentStatus = 'AwaitingAssignment', TrackingNumber = NULL, PartnerLabId = NULL, PrintingStartedAtUtc = NULL, PackagedAtUtc = NULL, ShippedAtUtc = NULL, DeliveredAtUtc = NULL WHERE Id = @oid;
`;
  try {
    execSync(`sqlcmd -S "(localdb)\\mssqllocaldb" -d "TheBoysDb" -Q "${sql.replace(/\r?\n/g, ' ')}"`);
  } catch (err) {
    console.warn('Warning: Could not run sqlcmd to reset test order:', err);
  }
};

test.describe('Admin Portal Phase 2 - Fulfillment & Lab Ops E2E Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Test 1: Admin login, Sidebar Tab 4 enabled without Sắp có, and 5 Kanban columns rendered with counters', async ({ page }) => {
    // 1. Authenticate as Admin
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

    // 2. Navigate to Admin Fulfillment Page
    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });

    // 3. Verify Sidebar Tab 4 (Điều phối xưởng) is active and enabled
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const fulfillmentNavLink = sidebar.locator('a[href="/admin/fulfillment"]');
    await expect(fulfillmentNavLink).toBeVisible();
    await expect(fulfillmentNavLink).toContainText('Điều phối xưởng');

    // Tab 4 must NOT contain "Sắp có" badge
    await expect(fulfillmentNavLink.locator('text=Sắp có')).toHaveCount(0);

    // 4. Verify Page Topbar & Header
    await expect(page.locator('text=Điều phối Sản xuất & Xưởng in').first()).toBeVisible({ timeout: 15000 });

    // 5. Verify KPI counter cards
    await expect(page.locator('text=Chờ Gán Xưởng').first()).toBeVisible();
    await expect(page.locator('text=Xưởng Tiếp Nhận').first()).toBeVisible();
    await expect(page.locator('text=Đang Sản Xuất').first()).toBeVisible();
    await expect(page.locator('text=Chờ Kiểm Định QC').first()).toBeVisible();
    await expect(page.locator('text=Đóng Gói & Giao Vận').first()).toBeVisible();

    // 6. Verify 5 Kanban Columns Exist in DOM
    const colAwaiting = page.locator('#col-awaiting');
    const colAssigned = page.locator('#col-assigned');
    const colProduction = page.locator('#col-production');
    const colQc = page.locator('#col-qc');
    const colDelivery = page.locator('#col-delivery');

    await expect(colAwaiting).toBeVisible();
    await expect(colAssigned).toBeVisible();
    await expect(colProduction).toBeVisible();
    await expect(colQc).toBeVisible();
    await expect(colDelivery).toBeVisible();
  });

  test('Test 2: Full 5-stage order progression on Kanban board + Timeline Drawer', async ({ page }) => {
    // 0. Reset test order in DB to clean initial state
    resetTestOrder();

    // 1. Authenticate as Admin
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

    // 2. Open /admin/fulfillment
    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#col-awaiting')).toBeVisible({ timeout: 15000 });

    // Target order code prefix or suffix
    const orderCodePartial = 'TB-20261025-2a49ab139b674337a291b6ead0200bc2';

    // --- STAGE 1: Gán Xưởng In (Column 1 -> Column 2) ---
    const cardInCol1 = page.locator('#col-awaiting').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol1).toBeVisible({ timeout: 10000 });

    const assignBtn = cardInCol1.locator('button:has-text("Gán Xưởng In")');
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // AssignLabDialog
    await expect(page.locator('text=Gán Xưởng In Đối Tác').first()).toBeVisible({ timeout: 5000 });
    const submitAssignBtn = page.getByRole('button', { name: 'Xác Nhận Gán Xưởng' });
    await expect(submitAssignBtn).toBeVisible();
    await submitAssignBtn.click();

    // Verify card moves to Column 2 (Xưởng Tiếp Nhận)
    const cardInCol2 = page.locator('#col-assigned').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol2).toBeVisible({ timeout: 15000 });

    // --- STAGE 2: Tiếp Nhận & Khởi Chạy In (Column 2 -> Column 3) ---
    // 2a. Lab accepts the assigned job first
    const acceptJobBtn = cardInCol2.locator('button:has-text("Nhận Việc")');
    await expect(acceptJobBtn).toBeVisible();
    await acceptJobBtn.click();

    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn').first()).toBeVisible({ timeout: 5000 });
    const submitAcceptBtn = page.getByRole('button', { name: 'Chấp Nhận Đơn' });
    await expect(submitAcceptBtn).toBeVisible();
    await submitAcceptBtn.click();

    // Wait for modal to close
    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn')).toHaveCount(0, { timeout: 5000 });

    // 2b. Now start the production run
    const startRunBtn = cardInCol2.locator('button:has-text("Bắt Đầu In")');
    await expect(startRunBtn).toBeVisible();
    await startRunBtn.click();

    // StartProductionRunDialog
    await expect(page.locator('text=Khởi Chạy Lượt In 3D').first()).toBeVisible({ timeout: 5000 });
    const submitRunBtn = page.getByRole('button', { name: 'Bắt Đầu In Ngay' });
    await expect(submitRunBtn).toBeVisible();
    await submitRunBtn.click();

    // Verify card moves to Column 3 (Đang Sản Xuất)
    const cardInCol3 = page.locator('#col-production').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol3).toBeVisible({ timeout: 15000 });

    // --- STAGE 3: Tiến Độ Sản Xuất (Printing -> PostProcessing -> QualityCheck) ---
    const toPostBtn = cardInCol3.locator('button:has-text("Chuyển Xử Lý Nguội")');
    await expect(toPostBtn).toBeVisible();
    await toPostBtn.click();

    // Then transition to QualityCheck
    const toQcBtn = cardInCol3.locator('button:has-text("Chuyển Chờ QC")');
    await expect(toQcBtn).toBeVisible({ timeout: 10000 });
    await toQcBtn.click();

    // Verify card moves to Column 4 (Kiểm Định QC)
    const cardInCol4 = page.locator('#col-qc').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol4).toBeVisible({ timeout: 15000 });

    // --- STAGE 4: Đánh Giá QC (QualityCheck -> Packaged / Column 5) ---
    const qcBtn = cardInCol4.locator('button:has-text("Đánh Giá QC")');
    await expect(qcBtn).toBeVisible();
    await qcBtn.click();

    // QcReviewDialog
    await expect(page.locator('text=Đánh Giá Chất Lượng Mẫu In (QC)').first()).toBeVisible({ timeout: 5000 });
    const submitQcBtn = page.getByRole('button', { name: 'Chấp Nhận QC & Đóng Gói' });
    await expect(submitQcBtn).toBeVisible();
    await submitQcBtn.click();

    // Verify card moves to Column 5 (Đóng Gói & Giao Vận)
    const cardInCol5 = page.locator('#col-delivery').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol5).toBeVisible({ timeout: 15000 });

    // --- STAGE 5: Tạo Vận Đơn & Cập Nhật Giao Hàng Thành Công ---
    const createShipmentBtn = cardInCol5.locator('button:has-text("Tạo Mã Vận Đơn")');
    await expect(createShipmentBtn).toBeVisible();
    await createShipmentBtn.click();

    // CreateShipmentDialog
    await expect(page.locator('text=Tạo Vận Đơn Giao Hàng').first()).toBeVisible({ timeout: 5000 });
    const submitShipmentBtn = page.locator('form').getByRole('button', { name: 'Tạo Mã Vận Đơn' });
    await expect(submitShipmentBtn).toBeVisible();
    await submitShipmentBtn.click();

    // Wait for shipment modal to close
    await expect(page.locator('text=Tạo Vận Đơn Giao Hàng')).toHaveCount(0, { timeout: 5000 });

    // Now card in Col 5 shows "Cập Nhật Giao Hàng"
    const updateShipmentBtn = cardInCol5.locator('button:has-text("Cập Nhật Giao Hàng")');
    await expect(updateShipmentBtn).toBeVisible({ timeout: 10000 });
    await updateShipmentBtn.click();

    // UpdateShipmentEventDialog
    await expect(page.locator('text=Cập Nhật Trạng Thái Giao Vận').first()).toBeVisible({ timeout: 5000 });

    // Choose Delivered option
    const deliveredRadio = page.locator('input[value="Delivered"]');
    await deliveredRadio.check();

    const submitEventBtn = page.locator('form').getByRole('button', { name: 'Ghi Nhận Sự Kiện' });
    await expect(submitEventBtn).toBeVisible();
    await submitEventBtn.click();

    // Verify card now shows "Đã Hoàn Thành Giao Hàng"
    await expect(cardInCol5.locator('text=Đã Hoàn Thành Giao Hàng')).toBeVisible({ timeout: 15000 });

    // --- DRAWER TEST: Click card to open timeline drawer ---
    await cardInCol5.click();

    const drawer = page.locator('text=Toàn bộ tiến trình dây chuyền sản xuất & giao nhận');
    await expect(drawer).toBeVisible({ timeout: 10000 });

    // Verify drawer sections exist
    await expect(page.locator('text=1. Phân Công Xưởng In')).toBeVisible();
    await expect(page.locator('text=2. Tiến Độ Sản Xuất & Lượt In')).toBeVisible();
    await expect(page.locator('text=3. Vận Đơn & Sự Kiện Giao Hàng')).toBeVisible();
  });

  test('Test 3: Unauthorized customer is blocked from /admin/fulfillment', async ({ page }) => {
    // 1. Authenticate as Customer
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'customer@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.accessToken;

    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate((jwt) => {
      sessionStorage.setItem('accessToken', jwt);
      sessionStorage.setItem('fullName', 'Khách Hàng');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, token);

    // 2. Attempt direct navigation to /admin/fulfillment
    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });

    // Wait and verify customer is redirected away from admin route
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/admin/fulfillment');
  });
});
