import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const resetTestOrder = () => {
  const sql = `
SET QUOTED_IDENTIFIER ON;
DECLARE @oid UNIQUEIDENTIFIER = '256572EB-EB5D-40B1-9311-99F9970D27CE';
DELETE se FROM ShipmentEvents se INNER JOIN Shipments s ON se.ShipmentId = s.Id WHERE s.OrderId = @oid;
DELETE FROM Shipments WHERE OrderId = @oid;
UPDATE DefectReports SET ReprintRunId = NULL WHERE ReprintRunId IN (SELECT Id FROM ProductionRuns WHERE AssignmentId IN (SELECT Id FROM PartnerAssignments WHERE OrderId = @oid));
DELETE FROM ProductionRuns WHERE AssignmentId IN (SELECT Id FROM PartnerAssignments WHERE OrderId = @oid);
DELETE FROM PartnerAssignments WHERE OrderId = @oid;
UPDATE Orders SET OrderPaymentStatus = 'Paid', FulfillmentStatus = 'AwaitingAssignment', TrackingNumber = NULL, PartnerLabId = NULL, PrintingStartedAtUtc = NULL, PackagedAtUtc = NULL, ShippedAtUtc = NULL, DeliveredAtUtc = NULL WHERE Id = @oid;
`;
  try {
    execSync(`sqlcmd -S "(localdb)\\mssqllocaldb" -d "TheBoysDb" -Q "${sql.replace(/\r?\n/g, ' ')}"`);
  } catch (err) {
    console.warn('Warning: Could not run sqlcmd to reset test order:', err);
  }
};

const loginAsAdmin = async (page: any) => {
  const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
    data: { email: 'admin@123', password: 'Admin@123456' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  await page.evaluate((jwt: string) => {
    sessionStorage.setItem('accessToken', jwt);
    sessionStorage.setItem('fullName', 'Quản Trị Viên');
    window.dispatchEvent(new Event('g2c-auth-session-changed'));
  }, token);
};

test.describe('Admin Portal Phase 2 - Fulfillment & Lab Ops E2E Suite (5/5 Tests)', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // TEST 1: Admin Layout & 5 Kanban Columns & KPI Counters
  test('Test 1: Admin login, Sidebar Tab 4 enabled without Sắp có, and 5 Kanban columns rendered with counters', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });

    // Verify Sidebar Tab 4
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const fulfillmentNavLink = sidebar.locator('a[href="/admin/fulfillment"]');
    await expect(fulfillmentNavLink).toBeVisible();
    await expect(fulfillmentNavLink).toContainText('Điều phối xưởng');
    await expect(fulfillmentNavLink.locator('text=Sắp có')).toHaveCount(0);

    // Verify Topbar & Header
    await expect(page.locator('text=Điều phối Sản xuất & Xưởng in').first()).toBeVisible({ timeout: 15000 });

    // Verify KPI counter cards
    await expect(page.locator('text=Chờ Gán Xưởng').first()).toBeVisible();
    await expect(page.locator('text=Xưởng Tiếp Nhận').first()).toBeVisible();
    await expect(page.locator('text=Đang Sản Xuất').first()).toBeVisible();
    await expect(page.locator('text=Chờ Kiểm Định QC').first()).toBeVisible();
    await expect(page.locator('text=Đóng Gói & Giao Vận').first()).toBeVisible();

    // Verify 5 Kanban Columns Exist in DOM
    await expect(page.locator('#col-awaiting')).toBeVisible();
    await expect(page.locator('#col-assigned')).toBeVisible();
    await expect(page.locator('#col-production')).toBeVisible();
    await expect(page.locator('#col-qc')).toBeVisible();
    await expect(page.locator('#col-delivery')).toBeVisible();

    // Verify Dual-View Toggle (Kanban vs Table View) exists
    await expect(page.getByRole('button', { name: 'Kanban 5 Cột' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bảng Dây Chuyền' })).toBeVisible();
  });

  // TEST 2: Full 5-stage order progression (Happy path)
  test('Test 2: Full 5-stage order progression on Kanban board + Timeline Drawer', async ({ page }) => {
    resetTestOrder();
    await loginAsAdmin(page);

    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#col-awaiting')).toBeVisible({ timeout: 15000 });

    const orderCodePartial = 'TB-20261025-2a49ab139b674337a291b6ead0200bc2';

    // --- STAGE 1: Gán Xưởng In (Column 1 -> Column 2) ---
    const cardInCol1 = page.locator('#col-awaiting').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol1).toBeVisible({ timeout: 10000 });

    const assignBtn = cardInCol1.locator('button:has-text("Gán Xưởng In")');
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    await expect(page.locator('text=Gán Xưởng In Đối Tác').first()).toBeVisible({ timeout: 5000 });
    const submitAssignBtn = page.getByRole('button', { name: 'Xác Nhận Gán Xưởng' });
    await expect(submitAssignBtn).toBeVisible();
    await submitAssignBtn.click();

    // Verify card moves to Column 2 (Xưởng Tiếp Nhận)
    const cardInCol2 = page.locator('#col-assigned').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol2).toBeVisible({ timeout: 15000 });

    // --- STAGE 2: Tiếp Nhận & Khởi Chạy In (Column 2 -> Column 3) ---
    const acceptJobBtn = cardInCol2.locator('button:has-text("Nhận Việc")');
    await expect(acceptJobBtn).toBeVisible();
    await acceptJobBtn.click();

    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn').first()).toBeVisible({ timeout: 5000 });
    const submitAcceptBtn = page.getByRole('button', { name: 'Chấp Nhận Đơn' });
    await expect(submitAcceptBtn).toBeVisible();
    await submitAcceptBtn.click();

    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn')).toHaveCount(0, { timeout: 5000 });

    const startRunBtn = cardInCol2.locator('button:has-text("Bắt Đầu In")');
    await expect(startRunBtn).toBeVisible();
    await startRunBtn.click();

    await expect(page.locator('text=Khởi Chạy Lượt In 3D').first()).toBeVisible({ timeout: 5000 });
    const submitRunBtn = page.getByRole('button', { name: 'Bắt Đầu In Ngay' });
    await expect(submitRunBtn).toBeVisible();
    await submitRunBtn.click();

    // Verify card moves to Column 3 (Đang Sản Xuất)
    const cardInCol3 = page.locator('#col-production').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol3).toBeVisible({ timeout: 15000 });

    // --- STAGE 3: Tiến Độ Sản Xuất (Printing -> PostProcessing -> QualityCheck) ---
    const toPostBtn = cardInCol3.locator('button:has-text("Chuyển Xử Lý Nguội")').first();
    await expect(toPostBtn).toBeVisible();
    await toPostBtn.click();

    const toQcBtn = cardInCol3.locator('button:has-text("Chuyển Chờ QC")').first();
    await expect(toQcBtn).toBeVisible({ timeout: 10000 });
    await toQcBtn.click();

    // Verify card moves to Column 4 (Kiểm Định QC)
    const cardInCol4 = page.locator('#col-qc').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol4).toBeVisible({ timeout: 15000 });

    // --- STAGE 4: Đánh Giá QC (QualityCheck -> Packaged / Column 5) ---
    const qcBtn = cardInCol4.locator('button:has-text("Đánh Giá QC")');
    await expect(qcBtn).toBeVisible();
    await qcBtn.click();

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

    await expect(page.locator('text=Tạo Vận Đơn Giao Hàng').first()).toBeVisible({ timeout: 5000 });
    const submitShipmentBtn = page.locator('form').getByRole('button', { name: 'Tạo Mã Vận Đơn' });
    await expect(submitShipmentBtn).toBeVisible();
    await submitShipmentBtn.click();

    await expect(page.locator('text=Tạo Vận Đơn Giao Hàng')).toHaveCount(0, { timeout: 5000 });

    // Update shipment event to Delivered
    const updateShipmentBtn = cardInCol5.locator('button:has-text("Cập Nhật Giao Hàng")');
    await expect(updateShipmentBtn).toBeVisible({ timeout: 10000 });
    await updateShipmentBtn.click();

    await expect(page.locator('text=Cập Nhật Trạng Thái Giao Vận').first()).toBeVisible({ timeout: 5000 });
    const deliveredRadio = page.locator('input[value="Delivered"]');
    await deliveredRadio.check();

    const submitEventBtn = page.locator('form').getByRole('button', { name: 'Ghi Nhận Sự Kiện' });
    await expect(submitEventBtn).toBeVisible();
    await submitEventBtn.click();

    // Verify card shows delivered completion
    await expect(cardInCol5.locator('text=Đã Hoàn Thành Giao Hàng')).toBeVisible({ timeout: 15000 });

    // --- DRAWER TEST: Click order code on card to open timeline drawer ---
    await cardInCol5.locator(`text="${orderCodePartial}"`).click();

    await expect(page.locator('text=Toàn bộ tiến trình dây chuyền sản xuất & giao nhận')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=1. Phân Công Xưởng In')).toBeVisible();
    await expect(page.locator('text=2. Tiến Độ Sản Xuất & Lượt In')).toBeVisible();
    await expect(page.locator('text=3. Vận Đơn & Sự Kiện Giao Hàng')).toBeVisible();
  });

  // TEST 3: Role Guard (Customer blocked from /admin/fulfillment)
  test('Test 3: Unauthorized customer is blocked from /admin/fulfillment', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
      data: { email: 'customer@123', password: 'Admin@123456' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.accessToken;

    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate((jwt: string) => {
      sessionStorage.setItem('accessToken', jwt);
      sessionStorage.setItem('fullName', 'Khách Hàng');
      window.dispatchEvent(new Event('g2c-auth-session-changed'));
    }, token);

    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/admin/fulfillment');
  });

  // TEST 4: Edge Case 1 - Xưởng Từ Chối Tiếp Nhận -> Đơn quay về Cột 1
  test('Test 4: Edge Case - Partner Lab rejects assignment and order returns to Column 1 (Chờ Gán Xưởng)', async ({ page }) => {
    resetTestOrder();
    await loginAsAdmin(page);

    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#col-awaiting')).toBeVisible({ timeout: 15000 });

    const orderCodePartial = 'TB-20261025-2a49ab139b674337a291b6ead0200bc2';

    // 1. Assign lab from Column 1
    const cardInCol1 = page.locator('#col-awaiting').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol1).toBeVisible({ timeout: 10000 });

    const assignBtn = cardInCol1.locator('button:has-text("Gán Xưởng In")');
    await assignBtn.click();

    await expect(page.locator('text=Gán Xưởng In Đối Tác').first()).toBeVisible({ timeout: 5000 });
    const submitAssignBtn = page.getByRole('button', { name: 'Xác Nhận Gán Xưởng' });
    await submitAssignBtn.click();

    // 2. Order arrives in Column 2 (Xưởng Tiếp Nhận)
    const cardInCol2 = page.locator('#col-assigned').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol2).toBeVisible({ timeout: 15000 });

    // 3. Lab clicks "Nhận Việc" to open response dialog, but chooses REJECT
    const acceptJobBtn = cardInCol2.locator('button:has-text("Nhận Việc")');
    await acceptJobBtn.click();

    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn').first()).toBeVisible({ timeout: 5000 });

    // Click "Từ Chối Đơn"
    const rejectToggleBtn = page.locator('button:has-text("Từ Chối Đơn")');
    await rejectToggleBtn.click();

    // Fill rejection reason (>= 10 chars)
    const reasonInput = page.locator('form textarea');
    await reasonInput.fill('Xưởng quá tải máy in bảo trì đột xuất');

    const submitRejectBtn = page.getByRole('button', { name: 'Xác Nhận Từ Chối' });
    await expect(submitRejectBtn).toBeVisible();
    await submitRejectBtn.click();

    // 4. Modal closes and card must disappear from Column 2 and appear back in Column 1
    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn')).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('#col-assigned').locator(`div:has-text("${orderCodePartial}")`)).toHaveCount(0, { timeout: 10000 });

    const returnedCardInCol1 = page.locator('#col-awaiting').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(returnedCardInCol1).toBeVisible({ timeout: 10000 });
    await expect(returnedCardInCol1.locator('button:has-text("Gán Xưởng In")')).toBeVisible();
  });

  // TEST 5: Edge Case 2 - QC Thất Bại & Kích Hoạt In Lại -> Đơn quay về Cột 3
  test('Test 5: Edge Case - QC Failed with triggerReprint returns order to Column 3 (Đang Sản Xuất)', async ({ page }) => {
    resetTestOrder();
    await loginAsAdmin(page);

    await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#col-awaiting')).toBeVisible({ timeout: 15000 });

    const orderCodePartial = 'TB-20261025-2a49ab139b674337a291b6ead0200bc2';

    // 1. Advance to Column 2
    const cardInCol1 = page.locator('#col-awaiting').locator(`div:has-text("${orderCodePartial}")`).first();
    await cardInCol1.locator('button:has-text("Gán Xưởng In")').click();
    await page.getByRole('button', { name: 'Xác Nhận Gán Xưởng' }).click();

    // 2. Advance to Column 3
    const cardInCol2 = page.locator('#col-assigned').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol2).toBeVisible({ timeout: 15000 });
    await cardInCol2.locator('button:has-text("Nhận Việc")').click();
    await page.getByRole('button', { name: 'Chấp Nhận Đơn' }).click();
    await expect(page.locator('text=Phản Hồi Tiếp Nhận Đơn')).toHaveCount(0, { timeout: 5000 });

    await cardInCol2.locator('button:has-text("Bắt Đầu In")').click();
    await page.getByRole('button', { name: 'Bắt Đầu In Ngay' }).click();

    // 3. Advance to Column 4
    const cardInCol3 = page.locator('#col-production').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol3).toBeVisible({ timeout: 15000 });
    await cardInCol3.locator('button:has-text("Chuyển Xử Lý Nguội")').first().click();
    await cardInCol3.locator('button:has-text("Chuyển Chờ QC")').first().click();

    // 4. In Column 4, click "Đánh Giá QC"
    const cardInCol4 = page.locator('#col-qc').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(cardInCol4).toBeVisible({ timeout: 15000 });
    await cardInCol4.locator('button:has-text("Đánh Giá QC")').click();

    await expect(page.locator('text=Đánh Giá Chất Lượng Mẫu In (QC)').first()).toBeVisible({ timeout: 5000 });

    // Choose Failed
    const failedBtn = page.locator('button:has-text("Lỗi Kỹ Thuật (Failed)")');
    await failedBtn.click();

    // Fill defect description (>= 10 chars)
    const qcNoteInput = page.locator('form textarea');
    await qcNoteInput.fill('Bề mặt cong vênh tách lớp không đạt chuẩn kỹ thuật');

    // Ensure reprint is checked
    const reprintCheckbox = page.locator('form input[type="checkbox"]');
    await expect(reprintCheckbox).toBeChecked();

    const submitQcBtn = page.getByRole('button', { name: 'Ghi Nhận Lỗi QC' });
    await expect(submitQcBtn).toBeVisible();
    await submitQcBtn.click();

    // 5. Modal closes and card must return to Column 3 (Đang Sản Xuất)
    await expect(page.locator('text=Đánh Giá Chất Lượng Mẫu In (QC)')).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('#col-qc').locator(`div:has-text("${orderCodePartial}")`)).toHaveCount(0, { timeout: 10000 });

    const returnedCardInCol3 = page.locator('#col-production').locator(`div:has-text("${orderCodePartial}")`).first();
    await expect(returnedCardInCol3).toBeVisible({ timeout: 15000 });
    await expect(returnedCardInCol3.locator('text=Đang In 3D').first()).toBeVisible();
  });
});
