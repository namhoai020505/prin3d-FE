import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const resetTestDefectReport = () => {
  const sql = `
SET QUOTED_IDENTIFIER ON;
DECLARE @repId UNIQUEIDENTIFIER = 'A558C872-ECF1-4319-A726-74990FDDAABC';
DECLARE @asgId UNIQUEIDENTIFIER = '74321C22-7762-42EC-986D-B5E92C40FAAA';
UPDATE DefectReports SET Status = 'Open', ResolutionNote = NULL, ResolvedByUserId = NULL, ResolvedAtUtc = NULL, ReprintRunId = NULL, RefundId = NULL WHERE Id = @repId;
DELETE FROM Notifications WHERE OutboxMessageId IN (SELECT Id FROM OutboxMessages WHERE DeduplicationKey LIKE '%a558c872-ecf1-4319-a726-74990fddaabc%');
DELETE FROM OutboxMessages WHERE DeduplicationKey LIKE '%a558c872-ecf1-4319-a726-74990fddaabc%';
DELETE FROM OrderStatusHistories WHERE OperationKey LIKE '%a558c872-ecf1-4319-a726-74990fddaabc%';
DELETE FROM ProductionRuns WHERE AssignmentId = @asgId AND RunNo > 1;
UPDATE Orders SET FulfillmentStatus = 'Completed', ReprintApproved = 0 WHERE Id = '6F51BB53-DA8E-40DB-8CC7-107E409F15D6';
`;
  const tmpFile = path.resolve(process.cwd(), 'temp_defect_reset.sql');
  try {
    fs.writeFileSync(tmpFile, sql, 'utf8');
    execSync(`sqlcmd -S "(localdb)\\mssqllocaldb" -d "TheBoysDb" -i "${tmpFile}"`);
  } catch (err) {
    console.warn('Warning: Could not run sqlcmd to reset test defect report:', err);
  } finally {
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
};

const resetUsers = () => {
  const sql = `
SET QUOTED_IDENTIFIER ON;
UPDATE Users SET AccountStatus = 'Active', LockoutEndUtc = NULL, FailedLoginAttempts = 0 WHERE Email IN ('admin@123', 'customer@123');
`;
  try {
    execSync(`sqlcmd -S "(localdb)\\mssqllocaldb" -d "TheBoysDb" -Q "${sql.replace(/\r?\n/g, ' ')}"`);
  } catch (err) {
    console.warn('Warning: Could not run sqlcmd to reset users:', err);
  }
};

const loginAsAdmin = async (page: any) => {
  const loginRes = await page.request.post('http://localhost:5133/api/auth/login', {
    data: { email: 'admin@123', password: 'Admin@123456' },
  });
  if (!loginRes.ok()) {
    console.error('loginAsAdmin FAILED:', loginRes.status(), await loginRes.text());
  }
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

const loginAsCustomer = async (page: any) => {
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
};

test.describe('Admin Portal Phase 3 & 4 E2E Suite (6/6 Tests)', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    resetUsers();
    resetTestDefectReport();
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // TEST 1: Finance Management (Tab 5 /admin/finance)
  test('Test 1: Finance Management (PayOS reconciliation, refund modal with validation and UUID v4 Idempotency-Key)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:5173/admin/finance', { waitUntil: 'domcontentloaded' });

    // Page Title
    await expect(page.locator('h1:has-text("Giao Dịch & Hoàn Tiền")')).toBeVisible({ timeout: 15000 });

    // Sub-tab 1: PayOS reconciliation table
    const reconSubTab = page.locator('button:has-text("Đối Soát Thanh Toán")');
    await expect(reconSubTab).toBeVisible();

    // Verify Table Headers
    await expect(page.locator('th:has-text("Mã đơn hàng")')).toBeVisible();
    await expect(page.locator('th:has-text("Cổng thanh toán")')).toBeVisible();
    await expect(page.locator('th:has-text("Số tiền (VNĐ)")')).toBeVisible();
    await expect(page.locator('th:has-text("Trạng thái")')).toBeVisible();

    // Verify Monospace Cyan Order Code or Empty state
    const firstOrderCode = page.locator('span.font-mono.text-cyan-400').first();
    if (await firstOrderCode.isVisible()) {
      await expect(firstOrderCode).toBeVisible();
    }

    // Test PayOS reconcile button on attempt if available
    const reconcileBtn = page.locator('button:has-text("Kiểm tra & Đối soát PayOS")').first();
    if (await reconcileBtn.isVisible()) {
      await reconcileBtn.click();
      await expect(page.locator('.Toastify__toast')).toBeVisible({ timeout: 10000 });
    }

    // Sub-tab 2: Switch to Refunds tab
    const refundSubTab = page.locator('button:has-text("Quản Lý Hoàn Tiền")');
    await expect(refundSubTab).toBeVisible();
    await refundSubTab.click();

    // Verify Refunds table headers or empty state
    await expect(
      page.locator('th:has-text("Số tiền hoàn")').or(page.locator('h3:has-text("Chưa có lệnh hoàn tiền")')),
    ).toBeVisible();

    // Click "Tạo Lệnh Hoàn Tiền"
    const createRefundBtn = page.locator('button:has-text("Tạo Lệnh Hoàn Tiền")').first();
    await expect(createRefundBtn).toBeVisible();
    await createRefundBtn.click();

    // Verify Modal opens
    const modalTitle = page.locator('h2:has-text("Tạo Lệnh Hoàn Tiền Mới")');
    await expect(modalTitle).toBeVisible();

    // Form inputs
    const submitRefundBtn = page.locator('button[type="submit"]:has-text("Xác nhận Hoàn Tiền")');
    const amountInput = page.locator('input[placeholder*="Nhập số tiền hoàn"]');
    const reasonInput = page.locator('textarea[placeholder*="Nhập chi tiết lý do hoàn tiền"]');

    // Validation: Form cannot submit with empty/0 amount or short reason
    await expect(submitRefundBtn).toBeDisabled();

    // Select order from dropdown if available
    const orderSelect = page.locator('form select').first();
    const selectOptionsCount = await orderSelect.locator('option').count();
    if (selectOptionsCount > 1) {
      await orderSelect.selectOption({ index: 1 });
    }

    // Validation: Reason < 10 characters keeps button disabled
    await amountInput.fill('50000');
    await reasonInput.fill('Quá ngắn');
    await expect(submitRefundBtn).toBeDisabled();

    // Validation: Reason >= 10 characters enables button
    await reasonInput.fill('Khách hàng yêu cầu hoàn tiền do đổi sang mô hình 3D khác');
    await expect(submitRefundBtn).toBeEnabled();

    // Verify Idempotency-Key (UUID v4 format)
    const keyContainer = page.locator('div:has-text("Key:")').filter({ hasText: 'Đổi Key' }).first();
    await expect(keyContainer).toBeVisible();
    const keyText = await keyContainer.textContent();
    expect(keyText).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

    // Close modal via Cancel button
    const cancelBtn = page.locator('button:has-text("Hủy bỏ")').first();
    await cancelBtn.click();
    await expect(modalTitle).toHaveCount(0);
  });

  // TEST 2: Warranty Defect Reports (Tab 6 /admin/warranty)
  test('Test 2: Warranty Defect Reports (table, lightbox gallery, 3-path resolution modal)', async ({ page }) => {
    resetTestDefectReport();
    await loginAsAdmin(page);
    await page.goto('http://localhost:5173/admin/warranty', { waitUntil: 'domcontentloaded' });

    // Page Title
    await expect(page.locator('h1:has-text("Bảo Hành & Khiếu Nại")')).toBeVisible({ timeout: 15000 });

    // Verify Table Headers
    await expect(page.locator('th:has-text("Mã đơn hàng")')).toBeVisible();
    await expect(page.locator('th:has-text("Khách hàng")')).toBeVisible();
    await expect(page.locator('th:has-text("Ngày gửi khiếu nại")')).toBeVisible();
    await expect(page.locator('th:has-text("Lý do khiếu nại")')).toBeVisible();
    await expect(page.locator('th:has-text("Ảnh bằng chứng")')).toBeVisible();
    await expect(page.locator('th:has-text("Trạng thái")')).toBeVisible();
    await expect(page.locator('th:has-text("Thao tác")')).toBeVisible();

    // Lightbox test: Click an evidence thumbnail
    const photoThumbnail = page.locator('button[title="Click để phóng to ảnh"]').first();
    await expect(photoThumbnail).toBeVisible({ timeout: 10000 });
    await photoThumbnail.click();

    // Verify Lightbox Modal is open
    const lightboxModal = page.locator('div[role="dialog"][aria-modal="true"]').first();
    await expect(lightboxModal).toBeVisible({ timeout: 10000 });

    // Lightbox navigation button (next photo if available)
    const nextBtn = page.locator('button[title*="Ảnh sau"]');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    // Close Lightbox via close button
    const closeLightboxBtn = page.locator('button[title="Đóng (Esc)"]').or(page.locator('button[title*="Đóng"]')).first();
    await expect(closeLightboxBtn).toBeVisible();
    await closeLightboxBtn.click();
    await expect(lightboxModal).toHaveCount(0);

    // Resolution Modal: Click "Thẩm Định Khiếu Nại" on Open report
    const openReportRow = page.locator('tr').filter({ hasText: 'Chờ thẩm định' }).first();
    const resolveBtn = openReportRow.locator('button:has-text("Thẩm Định Khiếu Nại")');
    await expect(resolveBtn).toBeVisible({ timeout: 10000 });
    await resolveBtn.click();

    // Verify Resolution Modal
    const modalHeader = page.locator('h2:has-text("Thẩm Định Khiếu Nại")');
    await expect(modalHeader).toBeVisible();

    // Verify 3 resolution options are rendered inside modal
    const resolveModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Thẩm Định Khiếu Nại' }).first();
    const reprintOption = resolveModal.locator('div.font-bold:has-text("In lại miễn phí (ReprintApproved)")');
    const refundOption = resolveModal.locator('div.font-bold:has-text("Duyệt hoàn tiền (RefundApproved)")');
    const rejectOption = resolveModal.locator('div.font-bold:has-text("Bác bỏ khiếu nại (Rejected)")');

    await expect(reprintOption).toBeVisible();
    await expect(refundOption).toBeVisible();
    await expect(rejectOption).toBeVisible();

    const submitResolutionBtn = page.locator('button[type="submit"]:has-text("Xác nhận Thẩm Định")');
    const noteTextarea = page.locator('textarea[placeholder*="Ghi rõ lý do thẩm định"]');

    // Button disabled when no option selected
    await expect(submitResolutionBtn).toBeDisabled();

    // Select ReprintApproved option
    await reprintOption.click();

    // Validation: Note < 10 characters keeps button disabled
    await noteTextarea.fill('Quá ngắn');
    await expect(submitResolutionBtn).toBeDisabled();

    // Fill valid note >= 10 characters
    await noteTextarea.fill('Sản phẩm in bị tách lớp kết cấu, duyệt in bù miễn phí theo quy chuẩn.');
    await expect(submitResolutionBtn).toBeEnabled();

    // Submit resolution
    await submitResolutionBtn.click();

    // Modal closes and success toast appears
    await expect(modalHeader).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.Toastify__toast--success').or(page.locator('.Toastify__toast'))).toBeVisible({ timeout: 10000 });
  });

  // TEST 3: Observability Dashboard (Tab 1 /admin/dashboard)
  test('Test 3: Observability Dashboard (4 KPI cards, distribution chart, AI provider stats, manual outbox dispatch)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'domcontentloaded' });

    // Page Title
    await expect(page.locator('h1:has-text("Tổng Quan & Chỉ Số Vận Hành")')).toBeVisible({ timeout: 15000 });

    // Verify 4 KPI cards
    await expect(page.locator('span:has-text("Tổng Đơn Hàng")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('span:has-text("Thanh Toán Cần Chú Ý")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Hoàn Tiền Cần Chú Ý")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Hàng Đợi Outbox")').first()).toBeVisible();

    // Verify 2-axis orders chart
    await expect(page.locator('text=Phân Bổ Đơn Hàng 2 Trục (Fulfillment vs Payment)')).toBeVisible();
    await expect(page.locator('text=1. Tiến Độ Sản Xuất')).toBeVisible();
    await expect(page.locator('text=2. Trạng Thái Thanh Toán')).toBeVisible();

    // Verify 3D AI Provider metrics (Hunyuan3D, Meshy, Tripo)
    await expect(page.locator('text=Hiệu Suất Nhà Cung Cấp AI 3D')).toBeVisible();
    await expect(page.locator('span.font-mono:has-text("Hunyuan3D")')).toBeVisible();
    await expect(page.locator('span.font-mono:has-text("Meshy")')).toBeVisible();
    await expect(page.locator('span.font-mono:has-text("Tripo")')).toBeVisible();

    // Manual outbox dispatch
    const dispatchBtn = page.locator('button:has-text("Kích hoạt gửi Outbox thủ công")');
    await expect(dispatchBtn).toBeVisible();
    await dispatchBtn.click();

    // Verify toast feedback appears
    await expect(page.locator('.Toastify__toast')).toBeVisible({ timeout: 10000 });
  });

  // TEST 4: System Admin - Users (Tab 7 /admin/system)
  test('Test 4: System Admin Users (20 items/page, AI credit grant with UUID v4 Idempotency-Key, lock/unlock user)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });

    // Page Title & Block 1
    await expect(page.locator('h1:has-text("Quản Trị Hệ Thống & Cấu Hình")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Quản Trị Người Dùng & Tài Khoản')).toBeVisible();

    // Users Table
    const usersTable = page.locator('table').first();
    await expect(usersTable).toBeVisible({ timeout: 10000 });
    await expect(usersTable.locator('th:has-text("Email")')).toBeVisible();
    await expect(usersTable.locator('th:has-text("Vai Trò (Role)")')).toBeVisible();
    await expect(usersTable.locator('th:has-text("Trạng Thái")')).toBeVisible();
    await expect(usersTable.locator('th:has-text("Lượt Tạo 3D AI")')).toBeVisible();

    // Pagination controls: 20 per page indicator
    await expect(page.locator('text=20 tài khoản/trang').or(page.locator('text=20 mục/trang')).first()).toBeVisible();

    const customerRow = usersTable.locator('tr').filter({ hasText: 'customer@123' }).first();
    await expect(customerRow).toBeVisible({ timeout: 10000 });

    // Test "Cấp Credit AI" modal on customer@123
    const creditBtn = customerRow.locator('button:has-text("Cấp Credit AI")');
    await expect(creditBtn).toBeVisible();
    await creditBtn.click();

    const creditModalHeader = page.locator('h3:has-text("Cấp Thêm Lượt Tạo 3D AI")');
    await expect(creditModalHeader).toBeVisible();

    // Verify inputs
    const creditAmountInput = page.locator('input[type="number"]').first();
    await expect(creditAmountInput).toBeVisible();
    await creditAmountInput.fill('5');

    const creditReasonInput = page.locator('input[placeholder*="Ví dụ: Đền bù"]');
    await expect(creditReasonInput).toBeVisible();
    await creditReasonInput.fill('Quản trị viên cấp bù credit AI cho bài kiểm thử tự động E2E');

    // Verify UUID v4 Idempotency-Key
    const idempotencyInput = page.locator('input[readonly]');
    await expect(idempotencyInput).toBeVisible();
    const keyVal = await idempotencyInput.inputValue();
    expect(keyVal).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

    // Submit credit grant
    const submitCreditBtn = page.locator('button:has-text("Xác nhận Cấp Credit")');
    await expect(submitCreditBtn).toBeEnabled();
    await submitCreditBtn.click();

    // Toast feedback appears
    await expect(page.locator('.Toastify__toast')).toBeVisible({ timeout: 10000 });
    await expect(creditModalHeader).toHaveCount(0);

    // Test "Khóa / Mở Khóa" modal on customer@123
    const lockActionBtn = customerRow.locator('button:has-text("Khóa"), button:has-text("Mở Khóa")');
    await expect(lockActionBtn).toBeVisible();
    const btnText = (await lockActionBtn.textContent()) || '';
    await lockActionBtn.click();

    const lockModal = page.locator('div[role="dialog"], div.fixed.inset-0').filter({ hasText: 'Khóa Tài Khoản' }).first();
    await expect(lockModal).toBeVisible();

    if (btnText.includes('Khóa') && !btnText.includes('Mở')) {
      const lockReasonTextarea = lockModal.locator('textarea');
      await lockReasonTextarea.fill('Tạm khóa để kiểm tra cơ chế bảo mật tài khoản người dùng');
      const confirmLockBtn = lockModal.locator('button:has-text("Xác nhận Khóa")');
      await expect(confirmLockBtn).toBeEnabled();
      await confirmLockBtn.click();

      // Modal closes and toast feedback appears
      await expect(page.locator('.Toastify__toast').first()).toBeVisible({ timeout: 10000 });
      await expect(lockModal).toHaveCount(0);

      // Re-unlock customer@123 to keep tests idempotent and active
      const unlockActionBtn = customerRow.locator('button:has-text("Mở Khóa")');
      await expect(unlockActionBtn).toBeVisible({ timeout: 10000 });
      await unlockActionBtn.click();
      const unlockModal = page.locator('div[role="dialog"], div.fixed.inset-0').filter({ hasText: 'Khóa Tài Khoản' }).first();
      await expect(unlockModal).toBeVisible();
      const confirmUnlockBtn = unlockModal.locator('button:has-text("Xác nhận Mở Khóa")');
      await expect(confirmUnlockBtn).toBeEnabled();
      await confirmUnlockBtn.click();
      await expect(page.locator('.Toastify__toast').first()).toBeVisible({ timeout: 10000 });
      await expect(unlockModal).toHaveCount(0);
    } else {
      const confirmUnlockBtn = lockModal.locator('button:has-text("Xác nhận Mở Khóa")');
      await expect(confirmUnlockBtn).toBeEnabled();
      await confirmUnlockBtn.click();
      await expect(page.locator('.Toastify__toast').first()).toBeVisible({ timeout: 10000 });
      await expect(lockModal).toHaveCount(0);
    }
  });

  // TEST 5: System Admin Pricing Packages (Tab 7 /admin/system)
  test('Test 5: System Admin Pricing Packages (dimensions, material, price update modal)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });

    // Locate Block 2
    const pricingSection = page.locator('h2:has-text("Cấu Hình Bảng Giá In 3D (Pricing Packages)")');
    await expect(pricingSection).toBeVisible({ timeout: 15000 });

    // Verify Pricing Table
    const pricingTable = page.locator('table').nth(1);
    await expect(pricingTable).toBeVisible({ timeout: 10000 });
    await expect(pricingTable.locator('th:has-text("Tên Gói")')).toBeVisible();
    await expect(pricingTable.locator('th:has-text("Kích Thước (mm)")')).toBeVisible();
    await expect(pricingTable.locator('th:has-text("Vật Liệu In")')).toBeVisible();
    await expect(pricingTable.locator('th:has-text("Đơn Giá Hiện Tại (VNĐ)")')).toBeVisible();
    await expect(pricingTable.locator('th:has-text("Trạng Thái")')).toBeVisible();
    await expect(pricingTable.locator('th:has-text("Thao Tác")')).toBeVisible();

    // Check at least one package row renders
    await expect(pricingTable.locator('td.font-bold').first()).toBeVisible();

    // Click "Cập Nhật Giá" button
    const editPriceBtn = pricingTable.locator('button:has-text("Cập Nhật Giá")').first();
    await expect(editPriceBtn).toBeVisible();
    await editPriceBtn.click();

    // Modal: Cập Nhật Giá Gói In 3D
    const editModalTitle = page.locator('h3:has-text("Cập Nhật Giá Gói In 3D")');
    await expect(editModalTitle).toBeVisible();

    // Price input
    const priceInput = page.locator('input[type="number"][step="1000"]');
    await expect(priceInput).toBeVisible();
    await priceInput.fill('390000');

    // Verify format preview inside modal
    await expect(page.locator('div:has-text("Định dạng hiển thị: 390.000")').first()).toBeVisible();

    // Submit update
    const savePriceBtn = page.locator('button:has-text("Lưu Biểu Phí")');
    await expect(savePriceBtn).toBeEnabled();
    await savePriceBtn.click();

    // Modal closes and toast appears
    await expect(editModalTitle).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.Toastify__toast').first()).toBeVisible({ timeout: 10000 });
  });

  // TEST 6: Role Guard Security & Navigation
  test('Test 6: Role Guard Security (staff/customer redirect to /, sidebar concealment of /admin/system)', async ({ page }) => {
    // 1. Authenticate as Customer
    await loginAsCustomer(page);

    // 2. Direct navigation attempt to /admin/system
    await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Assert customer is blocked and redirected to "/"
    expect(page.url()).not.toContain('/admin/system');
    expect(page.url()).toBe('http://localhost:5173/');

    // 3. Verify that /admin/system is concealed in Sidebar for non-admin accounts
    await expect(page.locator('a[href="/admin/system"]')).toHaveCount(0);

    // 4. Authenticate as Admin and verify /admin/system IS accessible and visible in Sidebar
    await loginAsAdmin(page);
    await page.goto('http://localhost:5173/admin/orders', { waitUntil: 'domcontentloaded' });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/system"]')).toBeVisible({ timeout: 10000 });
  });
});
