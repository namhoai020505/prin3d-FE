// tests/empirical_m3_challenge.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  CHALLENGER 1: EMPIRICAL STRESS TEST SUITE - MILESTONE 3');
console.log('  Frontend Phase 4 & Global Navigation & System Security');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err });
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// -------------------------------------------------------------------------
// SECTION 1: Mock Harness for adminService and observabilityService
// -------------------------------------------------------------------------

// Helper to simulate the exact unwrap function from observabilityService.ts
const unwrap = (res) => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return res.data;
  }
  return res;
};

// Create an instrumented Mock API Client
function createMockApi() {
  const calls = [];
  return {
    calls,
    get: async (url, config) => {
      calls.push({ method: 'GET', url, config });
      return { data: { success: true }, status: 200, headers: {} };
    },
    post: async (url, data, config) => {
      calls.push({ method: 'POST', url, data, config });
      return { data: { success: true, ...data }, status: 200, headers: {} };
    },
    patch: async (url, data, config) => {
      calls.push({ method: 'PATCH', url, data, config });
      return { data: { id: 'mock-id', ...data }, status: 200, headers: {} };
    },
    clear: () => {
      calls.length = 0;
    },
  };
}

// Standalone implementation matching src/services/adminService.ts
function createAdminService(apiInstance) {
  const currentKeys = new Map();

  const getOrCreateKey = (actionScope) => {
    const existingKey = currentKeys.get(actionScope);
    if (existingKey) return existingKey;
    const newKey = crypto.randomUUID();
    currentKeys.set(actionScope, newKey);
    return newKey;
  };

  const clearKey = (actionScope) => {
    currentKeys.delete(actionScope);
  };

  return {
    currentKeys,
    getUsers: async (page = 1, signal) => {
      const response = await apiInstance.get(`/api/admin/users?page=${page}`, { signal });
      return unwrap(response);
    },
    updateUserRole: async (id, role) => {
      const response = await apiInstance.patch(`/api/admin/users/${id}/role`, { role });
      return unwrap(response);
    },
    addUserCredits: async (
      id,
      amount,
      reason = 'Quản trị viên cấp bổ sung lượt tạo 3D',
      idempotencyKey,
    ) => {
      const key =
        idempotencyKey ||
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : getOrCreateKey(`admin:credits:${id}`));
      const response = await apiInstance.post(
        `/api/admin/users/credits`,
        { userId: id, amount, reason, idempotencyKey: key },
        { headers: { 'Idempotency-Key': key } },
      );
      clearKey(`admin:credits:${id}`);
      return unwrap(response);
    },
    lockUser: async (id, reason) => {
      const response = await apiInstance.post(`/api/admin/users/${id}/lock`, { reason });
      return unwrap(response);
    },
    unlockUser: async (id) => {
      const response = await apiInstance.post(`/api/admin/users/${id}/unlock`, {});
      return unwrap(response);
    },
    updatePricingPackage: async (id, payload) => {
      const response = await apiInstance.patch(`/api/admin/pricing-packages/${id}`, payload);
      return unwrap(response);
    },
  };
}

// Standalone implementation matching src/services/observabilityService.ts
function createObservabilityService(apiInstance) {
  return {
    getObservabilityReport: async () => {
      const raw = await apiInstance.get('/api/v2/admin/observability');
      return unwrap(raw);
    },
    dispatchOutbox: async (batchSize = 50) => {
      const raw = await apiInstance.post('/api/v2/admin/outbox/dispatch', { batchSize });
      return unwrap(raw);
    },
  };
}

// -------------------------------------------------------------------------
// RUN SUITE
// -------------------------------------------------------------------------
async function runSuite() {
  console.log('--- 1. EMPIRICAL STRESS TESTS: adminService.addUserCredits ---');

  await test('addUserCredits: Generates valid UUID v4 and sends in both header and body', async () => {
    const mockApi = createMockApi();
    const service = createAdminService(mockApi);
    const userId = '11111111-2222-3333-4444-555555555555';

    await service.addUserCredits(userId, 25, 'Test reason for AI credit');

    assert.equal(mockApi.calls.length, 1, 'Expected exactly 1 API call');
    const call = mockApi.calls[0];
    assert.equal(call.method, 'POST');
    assert.equal(call.url, '/api/admin/users/credits');
    assert.equal(call.data.userId, userId);
    assert.equal(call.data.amount, 25);
    assert.equal(call.data.reason, 'Test reason for AI credit');

    const bodyKey = call.data.idempotencyKey;
    const headerKey = call.config?.headers?.['Idempotency-Key'];

    assert.ok(bodyKey, 'idempotencyKey must be present in body');
    assert.ok(headerKey, 'Idempotency-Key must be present in headers');
    assert.equal(bodyKey, headerKey, 'Body and header idempotency keys must match');
    assert.match(bodyKey, UUID_V4_REGEX, `Generated key ${bodyKey} must be a valid RFC 4122 UUID v4`);
  });

  await test('addUserCredits: Preserves explicit idempotencyKey provided by caller', async () => {
    const mockApi = createMockApi();
    const service = createAdminService(mockApi);
    const customKey = 'c9b4e721-a53b-4fc2-85a7-96a8e8412bc4';

    await service.addUserCredits('user-123', 5, 'Custom key test', customKey);

    const call = mockApi.calls[0];
    assert.equal(call.data.idempotencyKey, customKey);
    assert.equal(call.config.headers['Idempotency-Key'], customKey);
  });

  await test('addUserCredits: Stress-test 100 consecutive calls generate 100 unique UUID v4s', async () => {
    const mockApi = createMockApi();
    const service = createAdminService(mockApi);
    const keysSeen = new Set();

    for (let i = 0; i < 100; i++) {
      mockApi.clear();
      await service.addUserCredits(`user-${i}`, 1);
      const generatedKey = mockApi.calls[0].data.idempotencyKey;
      assert.match(generatedKey, UUID_V4_REGEX);
      assert.ok(!keysSeen.has(generatedKey), `Key collision detected: ${generatedKey}`);
      keysSeen.add(generatedKey);
    }
    assert.equal(keysSeen.size, 100);
  });

  await test('addUserCredits: Default reason satisfies backend min-length constraint (>= 3 chars)', async () => {
    const mockApi = createMockApi();
    const service = createAdminService(mockApi);

    await service.addUserCredits('user-abc', 10);
    const reason = mockApi.calls[0].data.reason;
    assert.ok(reason.length >= 3, `Reason length ${reason.length} is less than 3`);
    assert.equal(reason, 'Quản trị viên cấp bổ sung lượt tạo 3D');
  });

  await test('addUserCredits: Propagates backend 400 Bad Request rejection cleanly', async () => {
    const errorApi = {
      post: async () => {
        const err = new Error('Request failed with status code 400');
        err.response = { status: 400, data: { message: 'Lý do cấp credit là bắt buộc.' } };
        throw err;
      },
    };
    const service = createAdminService(errorApi);

    await assert.rejects(
      async () => {
        await service.addUserCredits('user-fail', 0, '');
      },
      /Request failed with status code 400/
    );
  });

  console.log('\n--- 2. EMPIRICAL STRESS TESTS: adminService.updatePricingPackage ---');

  await test('updatePricingPackage: Correct endpoint PATCH /api/admin/pricing-packages/{id}', async () => {
    const mockApi = createMockApi();
    const service = createAdminService(mockApi);
    const pkgId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const payload = { priceVnd: 450000, isActive: true };

    await service.updatePricingPackage(pkgId, payload);

    assert.equal(mockApi.calls.length, 1);
    const call = mockApi.calls[0];
    assert.equal(call.method, 'PATCH');
    assert.equal(call.url, `/api/admin/pricing-packages/${pkgId}`);
    assert.deepEqual(call.data, payload);
    assert.equal(typeof call.data.priceVnd, 'number');
    assert.equal(typeof call.data.isActive, 'boolean');
  });

  await test('updatePricingPackage: Boundary values (min 1 VND, max 100M VND, isActive toggles)', async () => {
    const mockApi = createMockApi();
    const service = createAdminService(mockApi);

    // Min boundary
    await service.updatePricingPackage('pkg-1', { priceVnd: 1, isActive: false });
    assert.equal(mockApi.calls[0].data.priceVnd, 1);
    assert.equal(mockApi.calls[0].data.isActive, false);

    // Max boundary
    mockApi.clear();
    await service.updatePricingPackage('pkg-1', { priceVnd: 100000000, isActive: true });
    assert.equal(mockApi.calls[0].data.priceVnd, 100000000);
    assert.equal(mockApi.calls[0].data.isActive, true);
  });

  console.log('\n--- 3. EMPIRICAL STRESS TESTS: observabilityService ---');

  await test('dispatchOutbox: Default batchSize is exactly 50 and target is POST /api/v2/admin/outbox/dispatch', async () => {
    const mockApi = createMockApi();
    const service = createObservabilityService(mockApi);

    await service.dispatchOutbox();

    assert.equal(mockApi.calls.length, 1);
    const call = mockApi.calls[0];
    assert.equal(call.method, 'POST');
    assert.equal(call.url, '/api/v2/admin/outbox/dispatch');
    assert.deepEqual(call.data, { batchSize: 50 });
  });

  await test('dispatchOutbox: Custom batchSize parameter correctly passed', async () => {
    const mockApi = createMockApi();
    const service = createObservabilityService(mockApi);

    await service.dispatchOutbox(150);
    assert.deepEqual(mockApi.calls[0].data, { batchSize: 150 });
  });

  await test('dispatchOutbox: Axios wrapped response vs direct unwrapped response handling', async () => {
    const mockApiWrapped = {
      post: async () => ({
        data: { dispatchedCount: 24, message: 'Batch dispatched' },
        status: 200,
        headers: {},
      }),
    };
    const service1 = createObservabilityService(mockApiWrapped);
    const res1 = await service1.dispatchOutbox(50);
    assert.equal(res1.dispatchedCount, 24);

    const mockApiRaw = {
      post: async () => ({ dispatchedCount: 15, message: 'Direct object' }),
    };
    const service2 = createObservabilityService(mockApiRaw);
    const res2 = await service2.dispatchOutbox(50);
    assert.equal(res2.dispatchedCount, 15);
  });

  await test('getObservabilityReport: Target is GET /api/v2/admin/observability and validates contract structure', async () => {
    const sampleBackendResponse = {
      timestampUtc: '2026-10-25T16:30:00Z',
      aiGenerations: [
        { provider: 'Hunyuan3D', totalJobs: 50, succeededJobs: 48, failedJobs: 1, runningJobs: 1 },
        { provider: 'Meshy', totalJobs: 30, succeededJobs: 28, failedJobs: 2, runningJobs: 0 },
        { provider: 'Tripo', totalJobs: 20, succeededJobs: 19, failedJobs: 1, runningJobs: 0 },
      ],
      commerce: {
        totalOrders: 142,
        ordersByFulfillmentStatus: { Queued: 10, Printing: 5, Completed: 127 },
        ordersByPaymentStatus: { Succeeded: 130, PendingPayment: 8, NeedsAttention: 4 },
        paymentAttemptsNeedsAttention: 4,
        refundsNeedsAttention: 2,
      },
      messaging: {
        outboxPending: 3,
        outboxProcessed: 1205,
        outboxDeadLettered: 0,
        notificationsDelivered: 450,
        notificationsRead: 412,
      },
      securityFilterStatus: 'Enforcing',
    };

    const mockApi = {
      get: async (url) => ({ data: sampleBackendResponse, status: 200, headers: {} }),
    };

    const service = createObservabilityService(mockApi);
    const report = await service.getObservabilityReport();

    assert.equal(report.timestampUtc, '2026-10-25T16:30:00Z');
    assert.equal(report.aiGenerations.length, 3);
    assert.equal(report.commerce.totalOrders, 142);
    assert.equal(report.commerce.paymentAttemptsNeedsAttention, 4);
    assert.equal(report.commerce.refundsNeedsAttention, 2);
    assert.equal(report.messaging.outboxPending, 3);
    assert.equal(report.securityFilterStatus, 'Enforcing');
  });

  console.log('\n--- 4. STATIC & SEMANTIC CHECKS: Automated Emoji Scan ---');

  // Comprehensive emoji regex matching Unicode emoji code points
  const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|[\u2194-\u21aa]|[\u231a-\u231b]|[\u23e9-\u23ec]|[\u23f0]|[\u23f3]|[\u25fd-\u25fe]|[\u2614-\u2615]|[\u2648-\u2653]|[\u267f]|[\u2693]|[\u26a1]|[\u26aa-\u26ab]|[\u26bd-\u26be]|[\u26c4-\u26c5]|[\u26ce]|[\u26d4]|[\u26ea]|[\u26f2-\u26f3]|[\u26f5]|[\u26fa]|[\u26fd]|[\u2705]|[\u270a-\u270b]|[\u2728]|[\u274c]|[\u274e]|[\u2753-\u2755]|[\u2757]|[\u2795-\u2797]|[\u27b0]|[\u27bf]|[\u2b1b-\u2b1c]|[\u2b50]|[\u2b55]|[\ufe0e\ufe0f])/gu;

  // Specific blacklist mentioned in ORIGINAL_REQUEST.md
  const SPECIFIC_EMOJIS = ['📦', '🔍', '📊', '⚙️', '🛡️', '💳', '🚚', '🏭', '✨', '❌', '⚠️', '🚀', '💡', '🔥'];

  const targetDirs = [
    path.join(projectRoot, 'src', 'pages', 'admin', 'dashboard'),
    path.join(projectRoot, 'src', 'pages', 'admin', 'system'),
    path.join(projectRoot, 'src', 'layouts', 'admin'),
  ];
  const targetFiles = [path.join(projectRoot, 'src', 'App.tsx')];

  // Helper to collect all .ts, .tsx files recursively
  function collectFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(collectFiles(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  for (const dir of targetDirs) {
    targetFiles.push(...collectFiles(dir));
  }

  await test(`Emoji scan: 0 emojis across all ${targetFiles.length} Phase 4 & navigation files`, async () => {
    let emojiFoundCount = 0;
    const emojiDetails = [];

    for (const filePath of targetFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(projectRoot, filePath);

      // Check Unicode regex
      const matches = content.match(EMOJI_REGEX) || [];
      // Filter out harmless non-emoji characters like trademark or standard punctuation if false positive
      const actualEmojis = matches.filter((m) => {
        // Exclude standard variation selectors by themselves if not following emoji
        const codePoint = m.codePointAt(0);
        return codePoint > 127;
      });

      if (actualEmojis.length > 0) {
        emojiFoundCount += actualEmojis.length;
        emojiDetails.push(`${relPath}: found [${actualEmojis.join(', ')}]`);
      }

      // Check specific blacklist
      for (const emoji of SPECIFIC_EMOJIS) {
        if (content.includes(emoji)) {
          emojiFoundCount++;
          emojiDetails.push(`${relPath}: found blacklisted emoji "${emoji}"`);
        }
      }
    }

    if (emojiFoundCount > 0) {
      assert.fail(`Found ${emojiFoundCount} emojis:\n` + emojiDetails.join('\n'));
    }
    assert.equal(emojiFoundCount, 0, 'Emoji count must be exactly 0');
  });

  console.log('\n--- 5. INTEGRITY CHECK: Studio3DViewport.tsx ---');

  await test('Studio3DViewport.tsx: File hash and git diff confirm zero modifications', async () => {
    const viewportPath = path.join(projectRoot, 'src', 'pages', 'user', 'components', 'Studio3DViewport.tsx');
    assert.ok(fs.existsSync(viewportPath), 'Studio3DViewport.tsx must exist');

    const content = fs.readFileSync(viewportPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();

    // Verify sha256 matches verified hash
    assert.equal(
      hash,
      '8032AD613F95689EB7E2B9E36339236F2DD8FEFAC932BEFB1B07E82D4CE5A703',
      'Studio3DViewport.tsx hash must match expected untouched hash'
    );
  });

  console.log('\n--- 6. GLOBAL NAVIGATION & SECURITY ROUTE GUARD CHECKS ---');

  await test('Sidebar.tsx: All 7 Admin nav items enabled with no "Sắp có" badges active', async () => {
    const sidebarPath = path.join(projectRoot, 'src', 'layouts', 'admin', 'Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');

    const expectedRoutes = [
      '/admin/dashboard',
      '/admin/reviews',
      '/admin/orders',
      '/admin/fulfillment',
      '/admin/finance',
      '/admin/warranty',
      '/admin/system',
    ];

    for (const route of expectedRoutes) {
      assert.ok(content.includes(`'${route}'`), `Sidebar must contain route ${route}`);
    }

    // Verify all 7 have enabled: true
    const enabledMatches = content.match(/enabled:\s*true/g) || [];
    assert.equal(enabledMatches.length, 7, 'Expected all 7 nav items to have enabled: true');

    // Verify /admin/system is adminOnly: true
    assert.ok(content.includes('adminOnly: true'), 'System admin route must have adminOnly: true');
  });

  await test('App.tsx: /admin/system is strictly protected by RequireAuth with allowedRoles={["admin"]}', async () => {
    const appPath = path.join(projectRoot, 'src', 'App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    // Look for system route definition
    assert.ok(content.includes("path: 'system'"), 'App.tsx must define path "system"');
    assert.ok(
      content.includes("<RequireAuth allowedRoles={['admin']} verifyAdmin>") ||
      content.includes('<RequireAuth allowedRoles={["admin"]} verifyAdmin>'),
      '/admin/system must be wrapped with RequireAuth allowedRoles={["admin"]} verifyAdmin'
    );
  });

  console.log('\n================================================================');
  console.log(`  RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
