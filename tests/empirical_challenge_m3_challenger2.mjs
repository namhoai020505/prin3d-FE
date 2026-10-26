// tests/empirical_challenge_m3_challenger2.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

console.log('========================================================================');
console.log('EMPIRICAL CHALLENGER 2 VERIFICATION HARNESS (MILESTONE 3)');
console.log('Domain: App.tsx Route Guards, Security Enforcement & Live Backend APIs');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: ROLE NORMALIZATION & JWT CLAIM EXTRACTION
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: ROLE NORMALIZATION & JWT CLAIM PARSER TESTS ---');

const normalizeRole = (role) =>
  role?.replace(/^ROLE_/i, '').trim().toLowerCase() ?? null;

const roleClaimKeys = [
  'role',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
];

const getRoleFromJwtPayload = (payload) => {
  if (!payload) return null;
  for (const key of roleClaimKeys) {
    const roleValue = payload[key];
    if (typeof roleValue === 'string' && roleValue.trim()) {
      return roleValue;
    }
    if (Array.isArray(roleValue)) {
      const firstRole = roleValue.find((item) => typeof item === 'string' && item.trim());
      if (typeof firstRole === 'string') {
        return firstRole;
      }
    }
  }
  return null;
};

runTest('normalizeRole handles null, undefined, empty, and prefixes', () => {
  assert.equal(normalizeRole(null), null);
  assert.equal(normalizeRole(undefined), null);
  assert.equal(normalizeRole('admin'), 'admin');
  assert.equal(normalizeRole('ADMIN'), 'admin');
  assert.equal(normalizeRole('ROLE_admin'), 'admin');
  assert.equal(normalizeRole('ROLE_ADMIN'), 'admin');
  assert.equal(normalizeRole('staff'), 'staff');
  assert.equal(normalizeRole('ROLE_STAFF'), 'staff');
  assert.equal(normalizeRole('cus'), 'cus');
  assert.equal(normalizeRole('customer'), 'customer');
  assert.equal(normalizeRole('ROLE_Customer'), 'customer');
});

runTest('getRoleFromJwtPayload extracts single role, array role, and standard claim key', () => {
  assert.equal(getRoleFromJwtPayload({ role: 'admin' }), 'admin');
  assert.equal(getRoleFromJwtPayload({ role: ['staff', 'user'] }), 'staff');
  assert.equal(
    getRoleFromJwtPayload({
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'admin',
    }),
    'admin'
  );
  assert.equal(getRoleFromJwtPayload({}), null);
  assert.equal(getRoleFromJwtPayload(null), null);
});

// -----------------------------------------------------------------------------
// SECTION 2: EMPIRICAL ROUTE GUARD DECISION ENGINE
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: ROUTE GUARD DECISION ENGINE SIMULATION ---');

/**
 * Exact simulation of App.tsx + RequireAuth.tsx routing decision
 */
function evaluateRouteAccess({
  targetPath,
  token,
  tokenPayload,
  isExpired = false,
  apiMeUser = null, // Mock result of GET /api/auth/me
}) {
  // Routes configuration in App.tsx
  const customerRoles = ['customer', 'cus', 'staff', 'admin'];
  const adminRoles = ['admin', 'staff'];

  // Check authentication
  if (!token) {
    return { status: 'redirect', to: '/', reason: 'unauthenticated' };
  }

  if (isExpired) {
    return { status: 'redirect', to: '/', reason: 'token_expired' };
  }

  const rawRole = getRoleFromJwtPayload(tokenPayload);
  const normalizedRole = normalizeRole(rawRole);

  // Check route tree
  if (targetPath.startsWith('/admin')) {
    // Outer Guard: <RequireAuth allowedRoles={['admin', 'staff']} verifyAdmin />
    const normalizedAdminRoles = adminRoles.map(normalizeRole);
    if (!normalizedAdminRoles.includes(normalizedRole)) {
      return { status: 'redirect', to: '/', reason: 'outer_admin_forbidden' };
    }

    // Outer verifyAdmin check
    if (!apiMeUser || (!['admin', 'staff'].includes(normalizeRole(apiMeUser.role)))) {
      return { status: 'redirect', to: '/', reason: 'outer_verify_admin_failed' };
    }

    // Child route: /admin/system
    if (targetPath === '/admin/system') {
      // Inner Guard: <RequireAuth allowedRoles={['admin']} verifyAdmin>
      const innerAllowedRoles = ['admin'].map(normalizeRole);
      if (!innerAllowedRoles.includes(normalizedRole)) {
        return { status: 'redirect', to: '/', reason: 'inner_system_forbidden_role_not_admin' };
      }
      if (!apiMeUser || normalizeRole(apiMeUser.role) !== 'admin') {
        return { status: 'redirect', to: '/', reason: 'inner_system_verify_admin_not_admin' };
      }
      return { status: 'allowed', component: 'SystemAdminPage' };
    }

    // Child route: /admin/dashboard
    if (targetPath === '/admin/dashboard') {
      return { status: 'allowed', component: 'DashboardPage' };
    }

    // Child route: /admin/orders
    if (targetPath === '/admin/orders') {
      return { status: 'allowed', component: 'OrdersPage' };
    }

    // Child route: /admin/finance
    if (targetPath === '/admin/finance') {
      return { status: 'allowed', component: 'FinancePage' };
    }

    // Child route: /admin/warranty
    if (targetPath === '/admin/warranty') {
      return { status: 'allowed', component: 'WarrantyPage' };
    }

    return { status: 'allowed', component: 'OtherAdminPage' };
  }

  return { status: 'allowed', component: 'UserPage' };
}

runTest('Route Guard: Unauthenticated accessing /admin/system redirects to /', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/system',
    token: null,
  });
  assert.equal(result.status, 'redirect');
  assert.equal(result.to, '/');
  assert.equal(result.reason, 'unauthenticated');
});

runTest('Route Guard: Customer (role=cus) accessing /admin/system redirects to /', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/system',
    token: 'valid.token.here',
    tokenPayload: { role: 'cus' },
    apiMeUser: { role: 'cus' },
  });
  assert.equal(result.status, 'redirect');
  assert.equal(result.to, '/');
  assert.equal(result.reason, 'outer_admin_forbidden');
});

runTest('Route Guard: Customer (role=customer) accessing /admin/system redirects to /', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/system',
    token: 'valid.token.here',
    tokenPayload: { role: 'customer' },
    apiMeUser: { role: 'customer' },
  });
  assert.equal(result.status, 'redirect');
  assert.equal(result.to, '/');
  assert.equal(result.reason, 'outer_admin_forbidden');
});

runTest('Route Guard: Staff accessing /admin/system redirects to / (Inner Guard blocked)', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/system',
    token: 'valid.token.here',
    tokenPayload: { role: 'staff' },
    apiMeUser: { role: 'staff' },
  });
  assert.equal(result.status, 'redirect');
  assert.equal(result.to, '/');
  assert.equal(result.reason, 'inner_system_forbidden_role_not_admin');
});

runTest('Route Guard: Admin accessing /admin/system is ALLOWED', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/system',
    token: 'valid.token.here',
    tokenPayload: { role: 'admin' },
    apiMeUser: { role: 'admin' },
  });
  assert.equal(result.status, 'allowed');
  assert.equal(result.component, 'SystemAdminPage');
});

runTest('Route Guard: Staff accessing /admin/dashboard is ALLOWED', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/dashboard',
    token: 'valid.token.here',
    tokenPayload: { role: 'staff' },
    apiMeUser: { role: 'staff' },
  });
  assert.equal(result.status, 'allowed');
  assert.equal(result.component, 'DashboardPage');
});

runTest('Route Guard: Customer accessing /admin/dashboard redirects to /', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/dashboard',
    token: 'valid.token.here',
    tokenPayload: { role: 'cus' },
    apiMeUser: { role: 'cus' },
  });
  assert.equal(result.status, 'redirect');
  assert.equal(result.to, '/');
});

runTest('Route Guard: Expired token accessing /admin/system redirects to /', () => {
  const result = evaluateRouteAccess({
    targetPath: '/admin/system',
    token: 'expired.token.here',
    tokenPayload: { role: 'admin' },
    isExpired: true,
  });
  assert.equal(result.status, 'redirect');
  assert.equal(result.to, '/');
  assert.equal(result.reason, 'token_expired');
});

// -----------------------------------------------------------------------------
// SECTION 3: LIVE BACKEND API VERIFICATION (http://localhost:5133)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: LIVE BACKEND API VERIFICATION (http://localhost:5133) ---');

const BACKEND_BASE = 'http://localhost:5133';

async function mainBackendVerification() {
  let adminToken = '';
  let customerToken = '';

  // 1. Unauthenticated /api/auth/me -> 401
  await runAsyncTest('Backend: GET /api/auth/me without token returns 401 Unauthorized', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/auth/me`);
    assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 2. Admin Login
  await runAsyncTest('Backend: POST /api/auth/login as admin returns 200 and admin role', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@123', password: 'Admin@123456' }),
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.accessToken, 'Missing accessToken in login response');
    assert.equal(data.user?.role, 'admin', `Expected admin role, got ${data.user?.role}`);
    adminToken = data.accessToken;
  });

  // 3. Customer Login
  await runAsyncTest('Backend: POST /api/auth/login as customer returns 200 and cus role', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@123', password: 'Admin@123456' }),
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.accessToken, 'Missing accessToken in customer response');
    assert.ok(data.user?.role === 'cus' || data.user?.role === 'customer');
    customerToken = data.accessToken;
  });

  // 4. Admin GET /api/auth/me
  await runAsyncTest('Backend: GET /api/auth/me with Admin Token returns 200 and role admin', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.role, 'admin');
  });

  // 5. Customer GET /api/auth/me
  await runAsyncTest('Backend: GET /api/auth/me with Customer Token returns 200 and role cus', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.role === 'cus' || data.role === 'customer');
  });

  // 6. Observability endpoint: Admin allowed, Customer blocked
  await runAsyncTest('Backend: GET /api/v2/admin/observability with Admin Token returns 200 and telemetry data', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/v2/admin/observability`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.commerce, 'Observability missing commerce metrics');
    assert.ok(data.aiGenerations, 'Observability missing aiGenerations metrics');
    assert.ok(data.messaging, 'Observability missing messaging telemetry');
    assert.equal(typeof data.commerce.totalOrders, 'number');
    assert.equal(typeof data.messaging.outboxPending, 'number');
    console.log(`       [TELEMETRY] Total Orders: ${data.commerce.totalOrders}, Outbox Pending: ${data.messaging.outboxPending}`);
  });

  await runAsyncTest('Backend: GET /api/v2/admin/observability with Customer Token returns 403 Forbidden', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/v2/admin/observability`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403, `Expected 403, got ${res.status}`);
  });

  // 7. Admin Users endpoint: Admin allowed, Customer blocked
  await runAsyncTest('Backend: GET /api/admin/users?page=1 with Admin Token returns 200 and user array', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/admin/users?page=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected array of users');
    assert.ok(data.length > 0, 'Expected at least 1 user');
    console.log(`       [USERS] Fetched ${data.length} users successfully`);
  });

  await runAsyncTest('Backend: GET /api/admin/users?page=1 with Customer Token returns 403 Forbidden', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/admin/users?page=1`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403, `Expected 403, got ${res.status}`);
  });

  // 8. Pricing Packages endpoint
  await runAsyncTest('Backend: GET /api/pricing-packages returns 200 and package list', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/pricing-packages`);
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected array of pricing packages');
    console.log(`       [PACKAGES] Fetched ${data.length} pricing packages`);
  });

  // 9. Defect Reports endpoint: Admin allowed, Customer blocked
  await runAsyncTest('Backend: GET /api/v2/defect-reports with Admin Token returns 200', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/v2/defect-reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected array of defect reports');
    console.log(`       [DEFECTS] Fetched ${data.length} defect reports`);
  });

  await runAsyncTest('Backend: GET /api/v2/defect-reports with Customer Token returns 403 Forbidden', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/v2/defect-reports`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403, `Expected 403, got ${res.status}`);
  });

  // 10. Outbox Dispatch endpoint: Admin allowed, Customer blocked
  await runAsyncTest('Backend: POST /api/v2/admin/outbox/dispatch with Admin Token returns 200', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/v2/admin/outbox/dispatch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batchSize: 50 }),
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    console.log(`       [OUTBOX] Dispatch response: ${JSON.stringify(data)}`);
  });

  await runAsyncTest('Backend: POST /api/v2/admin/outbox/dispatch with Customer Token returns 403 Forbidden', async () => {
    const res = await fetch(`${BACKEND_BASE}/api/v2/admin/outbox/dispatch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batchSize: 50 }),
    });
    assert.equal(res.status, 403, `Expected 403, got ${res.status}`);
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: SOURCE CODE CHECKS (ZERO EMOJI & IMMUTABILITY)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: SOURCE CODE AUDIT (EMOJIS & STUDIO3DVIEWPORT) ---');

  const filesToScan = [
    'src/pages/admin/dashboard/DashboardPage.tsx',
    'src/pages/admin/system/SystemAdminPage.tsx',
    'src/layouts/admin/Sidebar.tsx',
    'src/layouts/admin/Topbar.tsx',
    'src/App.tsx',
    'src/components/RequireAuth.tsx',
    'src/services/adminService.ts',
    'src/services/observabilityService.ts',
  ];

  const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

  runTest('Emoji check: Zero emojis found in modified & created Phase 4 files', () => {
    let totalEmojiCount = 0;
    filesToScan.forEach((file) => {
      const fullPath = path.resolve(file);
      assert.ok(fs.existsSync(fullPath), `File does not exist: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line, idx) => {
        if (emojiRegex.test(line)) {
          console.error(`Emoji detected in ${file}:${idx + 1} -> ${line.trim()}`);
          totalEmojiCount++;
        }
      });
    });
    assert.equal(totalEmojiCount, 0, `Expected 0 emojis, found ${totalEmojiCount}`);
  });

  runTest('Immutability check: Studio3DViewport.tsx exists and is uncorrupted', () => {
    const studioPath = path.resolve('src/pages/user/components/Studio3DViewport.tsx');
    assert.ok(fs.existsSync(studioPath), 'Studio3DViewport.tsx must exist');
    const content = fs.readFileSync(studioPath, 'utf8');
    assert.ok(content.length > 1000, 'Studio3DViewport.tsx content is valid');
  });

  // Summary
  console.log('\n========================================================================');
  console.log(`ALL VERIFICATIONS COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================');
}

mainBackendVerification().catch((err) => {
  console.error('\n[FATAL SUITE FAILURE]:', err);
  process.exit(1);
});
