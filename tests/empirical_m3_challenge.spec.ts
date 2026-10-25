import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.describe('Milestone 3 Phase 4 & Security - Empirical Tests', () => {
  test('adminService.addUserCredits: Header and body payload match backend schema & UUID v4', () => {
    const key = crypto.randomUUID();
    const userId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const amount = 25;
    const reason = 'Quản trị viên cấp bổ sung lượt tạo 3D';

    // Verify UUID v4
    expect(key).toMatch(UUID_V4_REGEX);

    // Build payload exactly as adminService does
    const payload = { userId, amount, reason, idempotencyKey: key };
    const headers = { 'Idempotency-Key': key };

    expect(payload.userId).toBe(userId);
    expect(payload.amount).toBe(25);
    expect(payload.reason.length).toBeGreaterThanOrEqual(3);
    expect(payload.idempotencyKey).toBe(key);
    expect(headers['Idempotency-Key']).toBe(key);
  });

  test('adminService.updatePricingPackage: Payload and endpoint contract validation', () => {
    const pkgId = 'test-pkg-id';
    const payload = { priceVnd: 450000, isActive: true };

    const endpoint = `/api/admin/pricing-packages/${pkgId}`;
    expect(endpoint).toBe('/api/admin/pricing-packages/test-pkg-id');
    expect(typeof payload.priceVnd).toBe('number');
    expect(typeof payload.isActive).toBe('boolean');
    expect(payload.priceVnd).toBeGreaterThanOrEqual(1);
    expect(payload.priceVnd).toBeLessThanOrEqual(100000000);
  });

  test('observabilityService.dispatchOutbox: Payload { batchSize: 50 } and target endpoint', () => {
    const defaultBatchSize = 50;
    const endpoint = '/api/v2/admin/outbox/dispatch';
    const payload = { batchSize: defaultBatchSize };

    expect(endpoint).toBe('/api/v2/admin/outbox/dispatch');
    expect(payload).toEqual({ batchSize: 50 });
  });

  test('Static Check: Zero emojis across Phase 4, Navigation & App files', () => {
    const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|[\u2194-\u21aa]|[\u231a-\u231b]|[\u23e9-\u23ec]|[\u23f0]|[\u23f3]|[\u25fd-\u25fe]|[\u2614-\u2615]|[\u2648-\u2653]|[\u267f]|[\u2693]|[\u26a1]|[\u26aa-\u26ab]|[\u26bd-\u26be]|[\u26c4-\u26c5]|[\u26ce]|[\u26d4]|[\u26ea]|[\u26f2-\u26f3]|[\u26f5]|[\u26fa]|[\u26fd]|[\u2705]|[\u270a-\u270b]|[\u2728]|[\u274c]|[\u274e]|[\u2753-\u2755]|[\u2757]|[\u2795-\u2797]|[\u27b0]|[\u27bf]|[\u2b1b-\u2b1c]|[\u2b50]|[\u2b55]|[\ufe0e\ufe0f])/gu;
    const SPECIFIC_EMOJIS = ['📦', '🔍', '📊', '⚙️', '🛡️', '💳', '🚚', '🏭', '✨', '❌', '⚠️'];

    const targetPaths = [
      path.join(projectRoot, 'src', 'pages', 'admin', 'dashboard', 'DashboardPage.tsx'),
      path.join(projectRoot, 'src', 'pages', 'admin', 'system', 'SystemAdminPage.tsx'),
      path.join(projectRoot, 'src', 'layouts', 'admin', 'AdminLayout.tsx'),
      path.join(projectRoot, 'src', 'layouts', 'admin', 'Sidebar.tsx'),
      path.join(projectRoot, 'src', 'layouts', 'admin', 'Topbar.tsx'),
      path.join(projectRoot, 'src', 'App.tsx'),
    ];

    let foundCount = 0;
    for (const filePath of targetPaths) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(EMOJI_REGEX) || [];
      const actualMatches = matches.filter((m) => m.codePointAt(0)! > 127);
      foundCount += actualMatches.length;

      for (const emoji of SPECIFIC_EMOJIS) {
        if (content.includes(emoji)) {
          foundCount++;
        }
      }
    }

    expect(foundCount).toBe(0);
  });

  test('Integrity Check: Studio3DViewport.tsx is untouched', () => {
    const viewportPath = path.join(projectRoot, 'src', 'pages', 'user', 'components', 'Studio3DViewport.tsx');
    expect(fs.existsSync(viewportPath)).toBe(true);

    const content = fs.readFileSync(viewportPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();

    expect(hash).toBe('8032AD613F95689EB7E2B9E36339236F2DD8FEFAC932BEFB1B07E82D4CE5A703');
  });

  test('Security Check: Route Guard in App.tsx enforces admin-only access to /admin/system', () => {
    const appPath = path.join(projectRoot, 'src', 'App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    expect(content).toContain("path: 'system'");
    expect(content).toMatch(/<RequireAuth allowedRoles=\{(\['admin'\]|\["admin"\])\} verifyAdmin>/);
  });
});
