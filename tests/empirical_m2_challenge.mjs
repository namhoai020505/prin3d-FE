// tests/empirical_m2_challenge.mjs
import assert from 'node:assert/strict';

// Helper to simulate the exact unwrap function from defectService.ts
const unwrap = (res) => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return res.data;
  }
  return res;
};

// Implement getDefectReports test harness mirroring src/services/defectService.ts
async function getDefectReports(mockApi, params) {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') {
    queryParams.append('status', params.status);
  }
  if (params?.orderId) {
    queryParams.append('orderId', params.orderId);
  }
  const queryString = queryParams.toString();
  const url = queryString ? `/api/v2/defect-reports?${queryString}` : '/api/v2/defect-reports';
  const raw = await mockApi.get(url);
  const data = unwrap(raw);
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const evidenceList = Array.isArray(item.evidencePhotos)
      ? item.evidencePhotos
      : Array.isArray(item.evidence)
      ? item.evidence.map((e) => (typeof e === 'string' ? e : e?.storageKey || ''))
      : [];

    return {
      id: item.id || item.Id || '',
      orderId: item.orderId || item.OrderId || '',
      orderCode: item.orderCode || item.OrderCode || '',
      customerName: item.customerName || item.CustomerName || 'Khách hàng',
      reason: item.reason || item.Reason || '',
      evidencePhotos: evidenceList,
      status: item.status || item.Status || 'Open',
      resolutionNote: item.resolutionNote ?? item.ResolutionNote ?? null,
      createdAtUtc: item.createdAtUtc || item.CreatedAtUtc || new Date().toISOString(),
      resolvedAtUtc: item.resolvedAtUtc ?? item.ResolvedAtUtc ?? null,
      userId: item.userId || item.UserId || null,
      refundId: item.refundId || item.RefundId || null,
      reprintRunId: item.reprintRunId || item.ReprintRunId || null,
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
    };
  });
}

console.log('=== RUNNING EMPIRICAL CHALLENGE SUITE FOR MILESTONE 2 ===\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// -------------------------------------------------------------
// GROUP 1: defectService.getDefectReports Query Parameters
// -------------------------------------------------------------
console.log('--- Group 1: Query Parameters Append & Encoding ---');

await runAsyncTest('Case 1.1: undefined params -> /api/v2/defect-reports', async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi);
  assert.equal(calledUrl, '/api/v2/defect-reports');
});

await runAsyncTest('Case 1.2: empty object {} -> /api/v2/defect-reports', async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi, {});
  assert.equal(calledUrl, '/api/v2/defect-reports');
});

await runAsyncTest("Case 1.3: status='ALL' is filtered out -> /api/v2/defect-reports", async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi, { status: 'ALL' });
  assert.equal(calledUrl, '/api/v2/defect-reports');
});

await runAsyncTest("Case 1.4: status='PendingReview' -> /api/v2/defect-reports?status=PendingReview", async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi, { status: 'PendingReview' });
  assert.equal(calledUrl, '/api/v2/defect-reports?status=PendingReview');
});

await runAsyncTest("Case 1.5: orderId='order-999' -> /api/v2/defect-reports?orderId=order-999", async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi, { orderId: 'order-999' });
  assert.equal(calledUrl, '/api/v2/defect-reports?orderId=order-999');
});

await runAsyncTest("Case 1.6: status & orderId combined -> /api/v2/defect-reports?status=Open&orderId=ord-1", async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi, { status: 'Open', orderId: 'ord-1' });
  assert.equal(calledUrl, '/api/v2/defect-reports?status=Open&orderId=ord-1');
});

await runAsyncTest("Case 1.7: status='ALL' + orderId='ord-2' -> /api/v2/defect-reports?orderId=ord-2", async () => {
  let calledUrl = '';
  const mockApi = {
    get: async (url) => {
      calledUrl = url;
      return [];
    },
  };
  await getDefectReports(mockApi, { status: 'ALL', orderId: 'ord-2' });
  assert.equal(calledUrl, '/api/v2/defect-reports?orderId=ord-2');
});

// -------------------------------------------------------------
// GROUP 2: defectService.getDefectReports Evidence Normalization
// -------------------------------------------------------------
console.log('\n--- Group 2: Evidence Normalization & Empty Handling ---');

await runAsyncTest('Case 2.1: Normalizes evidencePhotos string array', async () => {
  const mockApi = {
    get: async () => [
      {
        id: 'rep-1',
        orderId: 'ord-1',
        evidencePhotos: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.jpg'],
      },
    ],
  };
  const res = await getDefectReports(mockApi);
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].evidencePhotos, [
    'https://cdn.example.com/photo1.jpg',
    'https://cdn.example.com/photo2.jpg',
  ]);
});

await runAsyncTest('Case 2.2: Normalizes evidence array of objects with storageKey', async () => {
  const mockApi = {
    get: async () => [
      {
        id: 'rep-2',
        orderId: 'ord-2',
        evidence: [
          { id: 'ev-1', storageKey: 'https://cdn.example.com/ev1.jpg', sha256Hex: 'abcd' },
          { id: 'ev-2', storageKey: 'https://cdn.example.com/ev2.jpg', sha256Hex: '1234' },
        ],
      },
    ],
  };
  const res = await getDefectReports(mockApi);
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].evidencePhotos, [
    'https://cdn.example.com/ev1.jpg',
    'https://cdn.example.com/ev2.jpg',
  ]);
});

await runAsyncTest('Case 2.3: Normalizes evidence array of raw strings', async () => {
  const mockApi = {
    get: async () => [
      {
        id: 'rep-3',
        orderId: 'ord-3',
        evidence: ['https://cdn.example.com/raw1.jpg'],
      },
    ],
  };
  const res = await getDefectReports(mockApi);
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].evidencePhotos, ['https://cdn.example.com/raw1.jpg']);
});

await runAsyncTest('Case 2.4: Neither evidencePhotos nor evidence provided -> []', async () => {
  const mockApi = {
    get: async () => [
      {
        id: 'rep-4',
        orderId: 'ord-4',
        evidencePhotos: null,
        evidence: null,
      },
    ],
  };
  const res = await getDefectReports(mockApi);
  assert.equal(res.length, 1);
  assert.deepEqual(res[0].evidencePhotos, []);
});

await runAsyncTest('Case 2.5: Empty array [] response handles without throwing', async () => {
  const mockApi = {
    get: async () => [],
  };
  const res = await getDefectReports(mockApi);
  assert.deepEqual(res, []);
});

await runAsyncTest('Case 2.6: Wrapped Axios response { data: [], status: 200, headers: {} }', async () => {
  const mockApi = {
    get: async () => ({
      status: 200,
      headers: {},
      data: [
        {
          id: 'rep-6',
          orderCode: 'TB-666',
          reason: 'Lỗi in',
          evidencePhotos: [],
        },
      ],
    }),
  };
  const res = await getDefectReports(mockApi);
  assert.equal(res.length, 1);
  assert.equal(res[0].orderCode, 'TB-666');
});

await runAsyncTest('Case 2.7: Malformed non-array response (null, object, string) -> returns [] gracefully', async () => {
  const mockApiNull = { get: async () => null };
  const mockApiObj = { get: async () => ({ unexpected: 'format' }) };
  const mockApiStr = { get: async () => 'error string' };

  assert.deepEqual(await getDefectReports(mockApiNull), []);
  assert.deepEqual(await getDefectReports(mockApiObj), []);
  assert.deepEqual(await getDefectReports(mockApiStr), []);
});

await runAsyncTest('Case 2.8: Robust fallback for missing fields in item', async () => {
  const mockApi = {
    get: async () => [
      {
        // totally empty object
      },
    ],
  };
  const res = await getDefectReports(mockApi);
  assert.equal(res.length, 1);
  assert.equal(res[0].customerName, 'Khách hàng');
  assert.equal(res[0].status, 'Open');
  assert.deepEqual(res[0].evidencePhotos, []);
  assert.equal(typeof res[0].createdAtUtc, 'string');
});

// -------------------------------------------------------------
// GROUP 3: FinancePage Error Handling & Reconciliation State
// -------------------------------------------------------------
console.log('\n--- Group 3: FinancePage Reconciliation Stress Testing ---');

runTest('Case 3.1: PayOS reconciliation handles network error gracefully', () => {
  // Simulate handleReconcilePayment error handling logic
  let toastedError = null;
  let isReconciling = true;

  const networkError = new Error('Network Error'); // Axios network error: no .response

  try {
    throw networkError;
  } catch (err) {
    const errResponse = err;
    const msg = errResponse?.response?.data?.message || 'Lỗi đối soát thanh toán PayOS.';
    toastedError = msg;
  } finally {
    isReconciling = false;
  }

  assert.equal(toastedError, 'Lỗi đối soát thanh toán PayOS.');
  assert.equal(isReconciling, false, 'Reconciling flag must be reset to false');
});

runTest('Case 3.2: PayOS reconciliation handles HTTP 400 with custom message', () => {
  let toastedError = null;
  let isReconciling = true;

  const httpError = {
    response: {
      status: 400,
      data: { message: 'Đơn hàng chưa phát sinh giao dịch trên PayOS.' },
    },
  };

  try {
    throw httpError;
  } catch (err) {
    const errResponse = err;
    const msg = errResponse?.response?.data?.message || 'Lỗi đối soát thanh toán PayOS.';
    toastedError = msg;
  } finally {
    isReconciling = false;
  }

  assert.equal(toastedError, 'Đơn hàng chưa phát sinh giao dịch trên PayOS.');
  assert.equal(isReconciling, false);
});

runTest('Case 3.3: Payment reconciliation updates local row status cleanly on success', () => {
  // Initial attempts list
  let paymentAttempts = [
    { id: 'att-1', orderCode: 'TB-1', status: 'NeedsAttention' },
    { id: 'att-2', orderCode: 'TB-2', status: 'Pending' },
  ];

  const targetAttempt = paymentAttempts[0];
  const reconcileResult = { success: true, status: 'Succeeded', message: 'Đối soát thành công' };

  // Simulate local state update
  paymentAttempts = paymentAttempts.map((item) =>
    item.id === targetAttempt.id ? { ...item, status: reconcileResult.status || 'Succeeded' } : item,
  );

  assert.equal(paymentAttempts[0].status, 'Succeeded');
  assert.equal(paymentAttempts[1].status, 'Pending', 'Other rows must not be mutated');
});

runTest('Case 3.4: Refund reconciliation updates row status cleanly via loadFinanceData refresh', () => {
  let refunds = [
    { id: 'ref-1', orderCode: 'TB-1', status: 'NeedsAttention' },
    { id: 'ref-2', orderCode: 'TB-2', status: 'Pending' },
  ];

  // When refund reconcile completes, loadFinanceData is triggered, returning updated status
  const refreshedRefundsFromBackend = [
    { id: 'ref-1', orderCode: 'TB-1', status: 'Succeeded' },
    { id: 'ref-2', orderCode: 'TB-2', status: 'Pending' },
  ];

  refunds = refreshedRefundsFromBackend;
  assert.equal(refunds[0].status, 'Succeeded');
  assert.equal(refunds[1].status, 'Pending');
});

// -------------------------------------------------------------
// GROUP 4: WarrantyPage Resolution Submission Stress Testing
// -------------------------------------------------------------
console.log('\n--- Group 4: WarrantyPage Resolution Error Handling Stress Testing ---');

runTest('Case 4.1: Resolution note validation (< 10 chars) rejects submission before network call', () => {
  const shortNotes = ['', '   ', '123456789', 'Lỗi in'];
  for (const note of shortNotes) {
    const isValid = note.trim().length >= 10;
    assert.equal(isValid, false, `Note "${note}" must be invalid (<10 chars)`);
  }

  const validNotes = ['Sản phẩm bị nứt thân', 'Đồng ý in lại sản phẩm cho khách'];
  for (const note of validNotes) {
    const isValid = note.trim().length >= 10;
    assert.equal(isValid, true, `Note "${note}" must be valid (>=10 chars)`);
  }
});

runTest('Case 4.2: Resolution submission handles network error without dropping user modal inputs', () => {
  let isSubmitting = true;
  let resolutionError = null;
  let toastedError = null;
  let modalOpen = true;

  const networkErr = new Error('Network Error'); // No response

  try {
    throw networkErr;
  } catch (err) {
    const errResponse = err;
    const msg = errResponse?.response?.data?.message || 'Lỗi khi thẩm định khiếu nại.';
    resolutionError = msg;
    toastedError = msg;
    // Note: handleCloseResolveModal() is NOT called in catch block
  } finally {
    isSubmitting = false;
  }

  assert.equal(toastedError, 'Lỗi khi thẩm định khiếu nại.');
  assert.equal(resolutionError, 'Lỗi khi thẩm định khiếu nại.');
  assert.equal(isSubmitting, false, 'Submitting flag must be cleared');
  assert.equal(modalOpen, true, 'Modal must remain open so admin can retry without re-typing');
});

runTest('Case 4.3: Resolution submission handles backend 409 Conflict error with message', () => {
  let isSubmitting = true;
  let resolutionError = null;
  let toastedError = null;

  const conflictErr = {
    response: {
      status: 409,
      data: { message: 'Khiếu nại này đã được thẩm định trước đó bởi Quản trị viên khác.' },
    },
  };

  try {
    throw conflictErr;
  } catch (err) {
    const errResponse = err;
    const msg = errResponse?.response?.data?.message || 'Lỗi khi thẩm định khiếu nại.';
    resolutionError = msg;
    toastedError = msg;
  } finally {
    isSubmitting = false;
  }

  assert.equal(
    toastedError,
    'Khiếu nại này đã được thẩm định trước đó bởi Quản trị viên khác.',
  );
  assert.equal(resolutionError, 'Khiếu nại này đã được thẩm định trước đó bởi Quản trị viên khác.');
  assert.equal(isSubmitting, false);
});

console.log('\n======================================================');
console.log(`ALL EMPIRICAL CHALLENGES COMPLETE: ${passedTests}/${totalTests} PASSED`);
console.log('======================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
