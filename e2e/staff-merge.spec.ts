import { expect, test, type Page, type Route } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';

const qaDir = process.env.MERGE_QA_DIR || os.tmpdir();
const user = { id: 'merge-user', fullName: 'Merge QA', email: 'qa@example.com', role: 'staff', freeTrialRemaining: 5, purchasedRemaining: 5, emailVerified: true };
const tokenFor = (role: string) => `e30.${Buffer.from(JSON.stringify({ sub: user.id, role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const task = { id: 'merge-task', versionId: 'merge-version', modelName: 'Merge Model', status: 'succeeded', stage: 'Done', progress: 100, createdAtUtc: '2026-10-26T00:00:00Z', imageUrl: '', isWatertight: true, isApprovedForPrinting: true, latestPrintReview: { decision: 'Approved', configurationHash: 'review-hash', createdAtUtc: '2026-10-26T00:00:00Z' } };
const packages = [{ id: 'merge-package', name: 'PLA Standard', code: 'PLA', material: 'PLA', priceVnd: 100000, isActive: true, minHeightMm: 100, maxHeightMm: 120 }];

async function fulfill(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': new URL(route.request().headers().origin || 'http://localhost:5191').origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': '*' } });
}

async function setup(page: Page, role?: string, tasks: unknown[] = []) {
  if (role) await page.addInitScript(({ token, fullName }) => {
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('fullName', fullName);
  }, { token: tokenFor(role), fullName: user.fullName });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS') return fulfill(route, {});
    if (url.pathname === '/api/auth/me') return fulfill(route, { ...user, role: role || 'cus' });
    if (url.pathname === '/api/auth/consent') return fulfill(route, { hasConsent: true });
    if (url.pathname === '/api/generations') return fulfill(route, url.searchParams.get('page') === '2' ? [] : tasks);
    if (url.pathname === `/api/generations/${task.id}`) return fulfill(route, { ...task, status: 'Succeeded', requestedHeightMm: 100 });
    if (url.pathname === '/api/pricing-packages') return fulfill(route, packages);
    return fulfill(route, []);
  });
}

async function openStudio(page: Page, right = true) {
  await page.getByTitle('Mở bảng tạo hình', { exact: true }).click();
  if (right) await page.getByTitle('Tài sản & Lớp (Mở bảng thông số)', { exact: true }).click();
}

test('legacy login opens the unified modal after navigation', async ({ page }) => {
  await setup(page);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder('email@domain.com', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'merge-login.png') });
});

test('main Studio retains file modes and PayOS modals on desktop and mobile', async ({ page }) => {
  await setup(page, 'cus', [task]);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/create');
  await openStudio(page);
  await expect(page.getByRole('heading', { name: 'Tạo hình 3D', exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'File 3D', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Camera Vintage (.GLB)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Từ ảnh', exact: true }).click();
  await page.getByTitle('Nhấn để nạp thêm lượt tạo 3D (PayOS VietQR)').click();
  await expect(page.getByRole('heading', { name: 'Nạp Thêm Lượt Tạo 3D' })).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'merge-topup.png') });
  await page.goto('/create');
  await openStudio(page);
  await page.getByText('Merge Model', { exact: true }).click();
  await page.getByRole('button', { name: 'Chốt Mẫu & Đặt In →', exact: true }).click();
  await expect(page.getByText('Đặt in 3D', { exact: true })).toBeVisible();
  await page.goto('/create');
  await openStudio(page);
  await expect(page.getByRole('heading', { name: 'Tạo hình 3D', exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'merge-studio-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await openStudio(page, false);
  await expect(page.getByRole('heading', { name: 'Tạo hình 3D', exact: true })).toBeVisible();
  const panelBounds = await page.getByRole('heading', { name: 'Tạo hình 3D', exact: true }).boundingBox();
  expect(panelBounds && panelBounds.x + panelBounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(qaDir, 'merge-studio-mobile.png') });
  expect(errors).toEqual([]);
});

test('Staff account links to the Staff portal and its queue remains usable', async ({ page }) => {
  await setup(page, 'staff', [{ ...task, status: 'Succeeded' }]);
  const reviews: unknown[] = [];
  await page.route('**/api/v2/reviews', async route => {
    reviews.push(route.request().postDataJSON());
    await fulfill(route, { id: 'review', configurationHash: 'review-hash' });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByTitle(`Tài khoản: ${user.fullName}`).click();
  await page.getByRole('button', { name: 'Trung tâm quản trị', exact: true }).first().click();
  await expect(page).toHaveURL(/\/staff\/reviews$/);
  await expect(page.getByRole('heading', { name: 'Hàng Đợi Thẩm Định Mesh 3D' })).toBeVisible();
  await page.getByText('Merge Model', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Phiếu Thẩm Định Kỹ Thuật In 3D' })).toBeVisible();
  await page.getByLabel(/^Hướng in/).selectOption('Angled45');
  await page.getByLabel(/^Vật liệu duyệt in/).selectOption('PLA');
  await page.getByLabel('Xác nhận kết cấu đỡ (Support) đạt tiêu chuẩn in.', { exact: true }).check();
  await page.getByLabel('Xác nhận nằm gọn trong khổ in (Build Volume) của trạm.', { exact: true }).check();
  await page.getByLabel('Ghi chú kỹ thuật', { exact: true }).fill('Đạt tiêu chuẩn in thử nghiệm');
  await page.getByRole('button', { name: 'Xác nhận thẩm định mẫu in 3D', exact: true }).click();
  await expect.poll(() => reviews.length).toBe(1);
  expect(reviews[0]).toMatchObject({ versionId: task.versionId, decision: 'Approved', configuration: { material: 'PLA', heightMm: 100, scale: 1 } });
  await page.screenshot({ path: path.join(qaDir, 'merge-staff-reviews.png') });
  expect(errors).toEqual([]);
});

test('Studio preserves Staff approval and invalidates it when print configuration changes', async ({ page }) => {
  await setup(page, 'staff', [task]);
  const approvals: unknown[] = [];
  await page.route('**/api/v2/approvals', async route => {
    const body = route.request().postDataJSON();
    approvals.push(body);
    await fulfill(route, { id: 'approval', versionId: task.versionId, configurationHash: 'approved-hash' });
  });
  await page.goto('/create');
  await openStudio(page);
  await page.getByText('Merge Model', { exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận chốt mẫu in 3D', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã chốt cấu hình in 3D', exact: true })).toBeVisible();
  expect(approvals).toHaveLength(1);
  await page.getByRole('button', { name: 'Thuộc tính', exact: true }).click();
  await page.getByRole('button', { name: /Resin SLA/ }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận chốt mẫu in 3D', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận chốt mẫu in 3D', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã chốt cấu hình in 3D', exact: true })).toBeVisible();
  expect(approvals).toHaveLength(2);
});

test('cookie refresh retries the protected request with the rotated bearer token', async ({ page }) => {
  await setup(page, 'staff');
  let refreshBody: unknown;
  let protectedRequests = 0;
  await page.route('**/api/auth/refresh', async route => {
    refreshBody = route.request().postDataJSON();
    await fulfill(route, { success: true, data: { accessToken: tokenFor('admin'), fullName: user.fullName } });
  });
  await page.route('**/api/merge-protected', async route => {
    protectedRequests++;
    await fulfill(route, { ok: true }, protectedRequests === 1 ? 401 : 200);
  });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/api.ts';
    const { default: api } = await import(modulePath);
    return api.get('/api/merge-protected');
  });
  expect(result).toEqual({ ok: true });
  expect(refreshBody).toEqual({});
  expect(protectedRequests).toBe(2);
});

test('main PayOS APIs and Staff checkout APIs remain available together', async ({ page }) => {
  await setup(page, 'staff');
  const requests: { url: string; body: unknown; key?: string }[] = [];
  await page.route('**/api/v2/**', async route => {
    const url = new URL(route.request().url()).pathname;
    requests.push({ url, body: route.request().postDataJSON(), key: route.request().headers()['idempotency-key'] });
    await fulfill(route, url === '/api/v2/orders' ? { id: 'order', orderCode: 'ORD-MERGE' } : { id: 'payment', success: true });
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const modulePath = '/src/services/orderService.ts';
    const service = await import(modulePath);
    await service.checkoutQuote('staff-quote');
    await service.checkoutOrderV2({ quoteId: 'main-quote' });
    await service.createPaymentAttempt('order');
    await service.createTopUpPayment('creator');
  });
  expect(requests.filter(request => request.url === '/api/v2/orders').map(request => request.body)).toEqual([{ quoteId: 'staff-quote' }, { quoteId: 'main-quote' }]);
  expect(requests.find(request => request.url.endsWith('/payment-attempts'))?.key).toMatch(/^[\da-f-]{36}$/i);
  expect(requests.find(request => request.url.endsWith('/topup'))?.body).toEqual({ packageId: 'creator' });
});

test('generation retains retry keys and main content-moderation errors', async ({ page }) => {
  await setup(page, 'staff');
  const keys: string[] = [];
  await page.route('**/api/generations/image', async route => {
    keys.push(route.request().headers()['idempotency-key']);
    await fulfill(route, keys.length === 1 ? { message: 'Temporary failure' } : task, keys.length === 1 ? 503 : 200);
  });
  await page.goto('/');
  const parsed = await page.evaluate(async () => {
    const modulePath = '/src/services/generationService.ts';
    const service = await import(modulePath);
    const input = { image: new File(['image'], 'input.png', { type: 'image/png' }), modelName: 'Merge Model' };
    await service.createImageGeneration(input).catch(() => undefined);
    await service.createImageGeneration(input);
    await service.createImageGeneration(input);
    return service.parseGenerationError({ response: { status: 422, data: { code: 'NSFW_CONTENT_BLOCKED', message: 'Blocked image' } } });
  });
  expect(keys).toHaveLength(3);
  expect(keys[0]).toBe(keys[1]);
  expect(keys[1]).not.toBe(keys[2]);
  expect(parsed).toMatchObject({ isNsfwBlocked: true, message: 'Blocked image', status: 422 });
});
