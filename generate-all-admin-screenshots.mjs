import { chromium } from '@playwright/test';
import path from 'path';

const OUTPUT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/746749b6-d86e-46ee-9eac-48698917cd26';

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  sub: 'ac941bf5-0403-4aad-96a3-7c616723ef9f',
  role: 'admin',
  email: 'admin@theboys.io',
  exp: 1893456000,
  iss: 'TheBoys',
  aud: 'TheBoys.WebApi',
})).toString('base64url');
const validJwt = `${header}.${payload}.mock-signature-admin`;

const mockMe = {
  id: 'ac941bf5-0403-4aad-96a3-7c616723ef9f',
  email: 'admin@theboys.io',
  fullName: 'Trần Đoàn Thanh Hà (Lead Admin)',
  role: 'admin',
  freeTrialRemaining: 100,
  purchasedRemaining: 500,
  totalUsed: 1250,
  emailVerified: true,
};

const mockOrders = [
  {
    id: 'ord-samurai-01',
    orderCode: 'TB-20261026-001',
    userId: 'usr-01',
    status: 'Printing',
    fulfillmentStatus: 'Printing',
    orderPaymentStatus: 'Paid',
    quantity: 1,
    unitPriceVnd: 680000,
    subtotalVnd: 680000,
    shippingFeeVnd: 35000,
    totalVnd: 715000,
    material: 'Resin Cao Cấp 8K (Xám Chì)',
    dimensions: { widthMm: 85, depthMm: 80, heightMm: 120 },
    receiverName: 'Nguyễn Hoàng Nam',
    receiverPhone: '0987 654 321',
    streetAddress: 'Tòa Landmark 81, 720A Điện Biên Phủ, P.22',
    district: 'Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    customerNote: 'Gia công độ mịn tối đa 0.03mm giúp mình nhé, mô hình trưng bày.',
    trackingNumber: 'VNPOST-3D-998811',
    createdAtUtc: '2026-10-25T14:30:00Z',
  },
  {
    id: 'ord-voronoi-02',
    orderCode: 'TB-20261026-002',
    userId: 'usr-02',
    status: 'PendingPartnerAssignment',
    fulfillmentStatus: 'AwaitingAssignment',
    orderPaymentStatus: 'Paid',
    quantity: 2,
    unitPriceVnd: 420000,
    subtotalVnd: 840000,
    shippingFeeVnd: 40000,
    totalVnd: 880000,
    material: 'Nhựa PLA Pro Đỏ Neon Silk',
    dimensions: { widthMm: 110, depthMm: 95, heightMm: 150 },
    receiverName: 'Trần Thị Mai Anh',
    receiverPhone: '0912 345 678',
    streetAddress: 'Số 45 Lê Duẩn, P. Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    customerNote: 'Giao giờ hành chính vào các ngày trong tuần.',
    createdAtUtc: '2026-10-25T16:15:00Z',
  },
  {
    id: 'ord-assigned-06',
    orderCode: 'TB-20261026-005',
    userId: 'usr-06',
    status: 'Assigned',
    fulfillmentStatus: 'Assigned',
    orderPaymentStatus: 'Paid',
    quantity: 1,
    unitPriceVnd: 490000,
    subtotalVnd: 490000,
    shippingFeeVnd: 30000,
    totalVnd: 520000,
    material: 'Resin Tough Đen Nhám',
    dimensions: { widthMm: 75, depthMm: 75, heightMm: 110 },
    receiverName: 'Vũ Minh Tuấn',
    receiverPhone: '0938 777 666',
    streetAddress: '320 Hai Bà Trưng, P. Tân Định',
    district: 'Quận 3',
    city: 'TP. Hồ Chí Minh',
    createdAtUtc: '2026-10-25T17:00:00Z',
  },
  {
    id: 'ord-drone-03',
    orderCode: 'TB-20261025-089',
    userId: 'usr-03',
    status: 'QualityCheck',
    fulfillmentStatus: 'QualityCheck',
    orderPaymentStatus: 'Paid',
    quantity: 4,
    unitPriceVnd: 280000,
    subtotalVnd: 1120000,
    shippingFeeVnd: 0,
    totalVnd: 1120000,
    material: 'Nylon Carbon Fiber (Cực bền)',
    dimensions: { widthMm: 60, depthMm: 45, heightMm: 90 },
    receiverName: 'Kỹ Sư Lê Văn Hùng',
    receiverPhone: '0908 889 999',
    streetAddress: 'Phòng Lab R&D, 128 Cầu Giấy',
    district: 'Cầu Giấy',
    city: 'Hà Nội',
    trackingNumber: 'GHN-EXPRESS-887722',
    createdAtUtc: '2026-10-25T09:20:00Z',
  },
  {
    id: 'ord-cyber-04',
    orderCode: 'TB-20261024-042',
    userId: 'usr-04',
    status: 'Shipping',
    fulfillmentStatus: 'Shipping',
    orderPaymentStatus: 'Paid',
    quantity: 1,
    unitPriceVnd: 550000,
    subtotalVnd: 550000,
    shippingFeeVnd: 30000,
    totalVnd: 580000,
    material: 'Resin Tough Trong Suốt',
    dimensions: { widthMm: 90, depthMm: 90, heightMm: 100 },
    receiverName: 'Phạm Quốc Bảo',
    receiverPhone: '0933 112 233',
    streetAddress: 'Lô E2a-7, Đường D1, Khu CNC',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    trackingNumber: 'SPX-VN-440029',
    createdAtUtc: '2026-10-24T11:00:00Z',
  },
  {
    id: 'ord-cancel-05',
    orderCode: 'TB-20261023-018',
    userId: 'usr-05',
    status: 'Cancelled',
    fulfillmentStatus: 'Cancelled',
    orderPaymentStatus: 'Refunded',
    quantity: 1,
    unitPriceVnd: 390000,
    subtotalVnd: 390000,
    shippingFeeVnd: 30000,
    totalVnd: 420000,
    material: 'Resin Tiêu Chuẩn',
    dimensions: { widthMm: 70, depthMm: 70, heightMm: 100 },
    receiverName: 'Đặng Minh Châu',
    receiverPhone: '0977 445 566',
    streetAddress: '24 Đường số 8, KDC Him Lam',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    customerNote: 'Khách đổi ý muốn đặt kích thước lớn hơn 200mm.',
    createdAtUtc: '2026-10-23T08:15:00Z',
  },
];

const mockOrderDetail = {
  id: 'ord-samurai-01',
  orderCode: 'TB-20261026-001',
  userId: 'usr-01',
  quoteId: 'quote-samurai-8k',
  fulfillmentStatus: 'Printing',
  orderPaymentStatus: 'Paid',
  quantity: 1,
  unitPriceSnapshot: 680000,
  subTotalVnd: 680000,
  finalShippingFee: 35000,
  totalAmount: 715000,
  currency: 'VND',
  address: {
    receiverName: 'Nguyễn Hoàng Nam',
    receiverPhone: '0987 654 321',
    streetAddress: 'Tòa Landmark 81, 720A Điện Biên Phủ, P.22',
    district: 'Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    customerNote: 'Gia công độ mịn tối đa 0.03mm giúp mình nhé, mô hình trưng bày triển lãm nghệ thuật.',
  },
  materialSnapshot: 'Resin Cao Cấp 8K (Xám Chì)',
  heightMmSnapshot: 120,
  createdAtUtc: '2026-10-25T14:30:00Z',
  items: [
    {
      id: 'item-samurai-01',
      lineNumber: 1,
      versionId: 'ver-samurai-01',
      configurationHash: 'hash-8k-resin-120mm-ultra',
      quantity: 1,
      unitPriceVnd: 680000,
      materialSnapshot: 'Resin Cao Cấp 8K (Xám Chì)',
      heightMm: 120,
      engravingText: 'PRIN3D-SAMURAI-LIMITED',
      partnerUnitBudgetVnd: 320000,
    },
  ],
  statusHistories: [
    {
      id: 'hist-1',
      axis: 'Payment',
      fromStatus: 'Unpaid',
      toStatus: 'Paid',
      createdAtUtc: '2026-10-25T14:35:10Z',
      reason: 'Cổng PayOS xác nhận giao dịch thành công (Mã GD: POS-88291)',
    },
    {
      id: 'hist-2',
      axis: 'Fulfillment',
      fromStatus: 'PendingPartnerAssignment',
      toStatus: 'PartnerAssigned',
      createdAtUtc: '2026-10-25T15:00:22Z',
      reason: 'Admin điều phối tác vụ sang Trạm chính THE BOYS Smart 3D Hub',
    },
    {
      id: 'hist-3',
      axis: 'Fulfillment',
      fromStatus: 'PartnerAssigned',
      toStatus: 'Printing',
      createdAtUtc: '2026-10-25T16:10:00Z',
      reason: 'Xưởng bắt đầu in lớp cắt (Layer 0.03mm, 4000 layers) trên Elegoo Saturn 4 Ultra',
    },
  ],
};

const mockGenerations = [
  {
    id: 'gen-samurai-01',
    versionId: 'ver-samurai-01',
    userId: 'usr-01',
    modelName: 'Cyberpunk Oni Samurai Helmet',
    status: 'Succeeded',
    stage: 'Complete',
    progress: 100,
    requestedHeightMm: 120,
    shouldTexture: true,
    aiModel: 'Meshy-4-Generative-3D',
    createdAtUtc: '2026-10-25T14:00:00Z',
    isWatertight: true,
    printability: {
      status: 'Printable',
      details: 'Mô hình kết cấu kín nước hoàn hảo (Watertight), thành vách dày trên 1.5mm đạt chuẩn in SLA Resin.',
      metrics: {
        volumeCm3: 54.8,
        surfaceAreaCm2: 172.4,
        dimensionsMm: { x: 88.5, y: 82.1, z: 120.0 },
        triangleCount: 245800,
      },
    },
    isApprovedForPrinting: false,
    reviewStatus: 'Pending',
    reviewNote: null,
    imageUrl: '/favicon.png',
  },
  {
    id: 'gen-voronoi-02',
    versionId: 'ver-voronoi-02',
    userId: 'usr-02',
    modelName: 'Biomorphic Voronoi Computational Vase',
    status: 'Succeeded',
    stage: 'Complete',
    progress: 100,
    requestedHeightMm: 150,
    shouldTexture: false,
    aiModel: 'Tripo-V3-Geometric',
    createdAtUtc: '2026-10-25T12:15:00Z',
    isWatertight: true,
    printability: {
      status: 'Printable',
      details: 'Lưới đa giác khép kín hoàn chỉnh, thích hợp in FDM nhựa Silk Red.',
      metrics: {
        volumeCm3: 68.2,
        surfaceAreaCm2: 240.0,
        dimensionsMm: { x: 105.0, y: 98.0, z: 150.0 },
        triangleCount: 382400,
      },
    },
    isApprovedForPrinting: true,
    reviewStatus: 'Approved',
    reviewNote: 'Đã thẩm định thông số hình học, không có lỗ hổng lưới, đủ điều kiện in thương mại.',
    reviewedAtUtc: '2026-10-25T13:00:00Z',
    latestPrintReview: {
      decision: 'Approved',
      configurationHash: 'hash-pla-silk-150mm',
      createdAtUtc: '2026-10-25T13:00:00Z',
    },
  },
  {
    id: 'gen-drone-03',
    versionId: 'ver-drone-03',
    userId: 'usr-03',
    modelName: 'Aero Carbon Drone Motor Mount',
    status: 'NeedsAttention',
    stage: 'Analyze',
    progress: 88,
    requestedHeightMm: 90,
    shouldTexture: false,
    aiModel: 'Meshy-4-Generative-3D',
    createdAtUtc: '2026-10-25T15:30:00Z',
    isWatertight: false,
    printability: {
      status: 'NonManifold',
      details: 'Cảnh báo: Phát hiện 16 cạnh hở và mặt không đồng nhất (Non-manifold geometry). Cần chạy lại Remesh thuật toán sửa lỗi lưới.',
      metrics: {
        volumeCm3: 31.4,
        surfaceAreaCm2: 98.2,
        dimensionsMm: { x: 62.0, y: 46.0, z: 90.0 },
        triangleCount: 112000,
      },
    },
    isApprovedForPrinting: false,
    reviewStatus: 'Pending',
  },
];

const mockPartnerLabs = [
  {
    id: '11111111-2222-3333-4444-555555555501',
    name: 'THE BOYS Smart 3D Hub (Trạm Chính)',
    contactPhone: '0909 111 222',
    address: 'Khu Công nghệ phần mềm ĐHQG, TP. Thủ Đức',
    isActive: true,
  },
  {
    id: '11111111-2222-3333-4444-555555555502',
    name: 'Saigon Precision Resin & FDM Lab',
    contactPhone: '0908 333 444',
    address: '158 Điện Biên Phủ, P.15, Bình Thạnh, TP.HCM',
    isActive: true,
  },
];

const mockTimeline = {
  orderId: 'ord-samurai-01',
  orderCode: 'TB-20261026-001',
  fulfillmentStatus: 'Printing',
  currentFulfillmentStatus: 'Printing',
  orderPaymentStatus: 'Paid',
  partnerLabId: '11111111-2222-3333-4444-555555555501',
  trackingNumber: 'VNPOST-3D-998811',
  assignments: [
    {
      id: 'assign-01',
      orderId: 'ord-samurai-01',
      partnerLabId: '11111111-2222-3333-4444-555555555501',
      labName: 'THE BOYS Smart 3D Hub (Trạm Chính)',
      partnerLabName: 'THE BOYS Smart 3D Hub (Trạm Chính)',
      status: 'Accepted',
      decisionNote: 'Xưởng đã tiếp nhận file STL thẩm định, ưu tiên gia công ca sáng.',
      assignedAtUtc: '2026-10-25T15:00:00Z',
      productionRuns: [
        {
          id: 'run-01',
          assignmentId: 'assign-01',
          runNo: 1,
          status: 'Printing',
          quantity: 1,
          actualCostVnd: 320000,
          startedAtUtc: '2026-10-25T16:10:00Z',
          qcNote: 'Lớp in đầu tiên kết dính bàn in 100%, không cong vênh.',
        },
      ],
    },
  ],
  shipments: [
    {
      id: 'ship-01',
      orderId: 'ord-samurai-01',
      carrier: 'VNPost Express 3D',
      trackingNumber: 'VNPOST-3D-998811',
      status: 'ReadyForPickup',
      shippingActualVnd: 35000,
      events: [
        {
          eventKey: 'LabelCreated',
          status: 'Vận đơn đã khởi tạo trên hệ thống VNPost',
          occurredAtUtc: '2026-10-25T16:30:00Z',
        },
      ],
    },
  ],
};

const mockObservability = {
  timestampUtc: '2026-10-25T18:00:00Z',
  securityFilterStatus: 'Hoạt động bình thường • Toàn bộ hệ thống AI & Thanh toán ổn định',
  aiGenerations: [
    {
      provider: 'Meshy-4 AI Generative Engine',
      totalJobs: 1420,
      succeededJobs: 1380,
      failedJobs: 25,
      runningJobs: 15,
    },
    {
      provider: 'Tripo-3D Precision Studio',
      totalJobs: 890,
      succeededJobs: 875,
      failedJobs: 9,
      runningJobs: 6,
    },
  ],
  commerce: {
    totalOrders: 284,
    ordersByFulfillmentStatus: {
      PendingPartnerAssignment: 12,
      PartnerAssigned: 18,
      Printing: 42,
      QcReview: 28,
      Shipping: 64,
      Delivered: 120,
    },
    ordersByPaymentStatus: {
      Paid: 260,
      Unpaid: 16,
      Refunded: 8,
    },
    paymentAttemptsNeedsAttention: 0,
    refundsNeedsAttention: 0,
  },
  messaging: {
    outboxPending: 3,
    outboxProcessed: 5820,
    outboxDeadLettered: 0,
    notificationsDelivered: 5780,
    notificationsRead: 5120,
  },
};

async function run() {
  console.log('🚀 Khởi động Edge Browser để chụp đầy đủ ảnh Admin UI...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  // Setup mock routes
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMe) });
  });

  await page.route('**/api/auth/consent*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasConsent: true, purpose: 'AiModelProcessing', policyVersion: 'v1.0' }) });
  });

  await page.route('**/api/orders*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockOrders) });
  });

  await page.route('**/api/v2/orders/*/timeline*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTimeline) });
  });

  await page.route('**/api/v2/orders/*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockOrderDetail) });
  });

  await page.route('**/api/generations?page=*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGenerations) });
  });

  await page.route('**/api/generations/*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGenerations[0]) });
  });

  await page.route('**/api/v2/partner-labs*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPartnerLabs) });
  });

  await page.route('**/api/v2/admin/observability*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockObservability) });
  });

  // Inject session
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  await page.evaluate((jwt) => {
    sessionStorage.setItem('accessToken', jwt);
    sessionStorage.setItem('fullName', 'Trần Đoàn Thanh Hà (Lead Admin)');
    window.dispatchEvent(new Event('g2c-auth-session-changed'));
  }, validJwt);

  // 1. ORDERS PAGE
  console.log('📸 1. Orders Page...');
  await page.goto('http://localhost:5173/admin/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_admin_orders.png') });

  // 2. ORDER DETAIL DRAWER
  console.log('📸 2. Order Detail Drawer...');
  const detailBtn = page.locator('button:has-text("Chi tiết")').first();
  if (await detailBtn.isVisible()) {
    await detailBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_admin_order_detail.png') });

    const closeBtn = page.locator('aside[aria-label="Chi tiết đơn hàng"] button[title*="Đóng"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // 3. CANCEL ORDER MODAL
  console.log('📸 3. Cancel Order Modal...');
  const cancelBtn = page.locator('button:has-text("Hủy")').first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await page.waitForTimeout(600);
    const textarea = page.locator('div[role="dialog"] textarea');
    if (await textarea.isVisible()) {
      await textarea.fill('Khách hàng yêu cầu đổi sang chất liệu Resin Tough 8K màu xám mờ.');
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_admin_order_cancel_modal.png') });

    const cancelModalClose = page.locator('div[role="dialog"] button:has-text("Hủy bỏ")');
    if (await cancelModalClose.isVisible()) {
      await cancelModalClose.click();
      await page.waitForTimeout(400);
    }
  }

  // 4. 3D REVIEWS LIST & WORKSPACE
  console.log('📸 4. 3D Reviews Page...');
  await page.goto('http://localhost:5173/admin/reviews', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_admin_reviews.png') });

  // 5. 3D REVIEW WORKSPACE WITH FORM
  console.log('📸 5. 3D Review Workspace...');
  await page.goto('http://localhost:5173/admin/reviews/gen-samurai-01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const noteField = page.locator('textarea').first();
  if (await noteField.isVisible()) {
    await noteField.fill('Kiểm định hoàn tất: Kết cấu kín nước (Watertight) đạt chuẩn in SLA Resin, thành vách tối thiểu 1.5mm, đã thiết lập góc đặt support nghiêng 35 độ.');
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_admin_review_workspace.png') });

  // 6. FULFILLMENT KANBAN BOARD
  console.log('📸 6. Fulfillment Kanban...');
  await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_admin_fulfillment_kanban.png') });

  // 7. FULFILLMENT TIMELINE DRAWER
  console.log('📸 7. Fulfillment Timeline Drawer...');
  await page.goto('http://localhost:5173/admin/fulfillment/ord-samurai-01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_admin_fulfillment_drawer.png') });

  // 8. FULFILLMENT ASSIGN LAB DIALOG
  console.log('📸 8. Assign Lab Dialog...');
  await page.goto('http://localhost:5173/admin/fulfillment', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const assignBtn = page.locator('button:has-text("Gán Xưởng In")').first();
  if (await assignBtn.isVisible()) {
    await assignBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_admin_fulfillment_assign_dialog.png') });

    const dialogClose = page.locator('div[role="dialog"] button:has-text("Hủy"), div[role="dialog"] button:has-text("Đóng")').first();
    if (await dialogClose.isVisible()) {
      await dialogClose.click();
      await page.waitForTimeout(400);
    }
  }

  // 9. ADMIN DASHBOARD
  console.log('📸 9. Admin Dashboard & Observability...');
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09_admin_dashboard.png') });

  // 10. LIGHT MODE THEME
  console.log('📸 10. Light Mode Theme...');
  await page.goto('http://localhost:5173/admin/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const lightBtn = page.locator('header button:has-text("LIGHT"), header button[title*="Giao diện"]').first();
  if (await lightBtn.isVisible()) {
    await lightBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_admin_orders_light_mode.png') });
  }

  await browser.close();
  console.log('🎉 TOÀN BỘ 10 ẢNH ADMIN UI ĐÃ ĐƯỢC CHỤP THÀNH CÔNG RỰC RỠ!');
}

run().catch((err) => {
  console.error('Lỗi chụp ảnh:', err);
  process.exit(1);
});
