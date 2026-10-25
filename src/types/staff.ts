// src/types/staff.ts

export interface CreatePrintReviewPayload {
  versionId: string;
  decision: 'Approved' | 'Rejected';
  checklist: {
    watertight: boolean;
    wallThicknessMm: number;
    supportRequired: boolean;
    orientation: 'Vertical' | 'Angled45' | 'Horizontal';
    slicer: string;
  };
  configuration: {
    material: string;
    heightMm: number;
    scale: number;
  };
  note: string;
  evidenceStorageKey?: string;
}

export interface AssignPartnerPayload {
  partnerLabId: string;
  dueAtUtc?: string;
  decisionNote?: string;
  partnerCostSnapshotVnd?: number;
}

export interface StartProductionRunPayload {
  quantity?: number;
  actualCostVnd?: number;
}

export interface UpdateRunStatusPayload {
  status: 'PostProcessing' | 'QualityCheck';
}

export interface RecordQcPayload {
  passed: boolean;
  qcNote?: string;
  qcEvidenceStorageKey?: string;
  triggerReprint?: boolean;
  actualCostVnd?: number;
}

export interface CreateShipmentPayload {
  carrier: string;
  trackingNumber: string;
  shippingActualVnd?: number;
}

export interface ResolveDefectPayload {
  resolutionType: 'ReprintApproved' | 'RefundApproved' | 'Rejected';
  resolutionNote?: string;
}

export type MeshStatus = 'Watertight' | 'NonManifold' | 'Warning' | 'Reviewed';

export interface ReviewQueueItem {
  id: string;
  versionId: string;
  taskCode: string;
  modelName: string;
  customerName: string;
  previewUrl: string;
  meshStatus: MeshStatus;
  requestedHeightMm: number;
  dimensionsMm: { x: number; y: number; z: number };
  volumeCm3: number;
  triangleCount: number;
  defaultMaterial: string;
  createdAt: string;
}

export type KanbanStage =
  | 'AwaitingLab'
  | 'LabAssigned'
  | 'InProduction'
  | 'QualityCheck'
  | 'Delivery';

export type ProductionSubStatus =
  | 'PendingAccept'
  | 'Accepted'
  | 'Printing'
  | 'PostProcessing'
  | 'WaitingQC'
  | 'ReadyToShip'
  | 'InTransit'
  | 'Delivered';

export interface ProductionRun {
  id: string;
  runNumber: number;
  status: 'Printing' | 'PostProcessing' | 'QualityCheck' | 'Passed' | 'Failed';
  actualCostVnd: number;
  startedAt: string;
  qcNote?: string;
}

export interface ShipmentEvent {
  status: 'LabelCreated' | 'PickedUp' | 'InTransit' | 'Delivered';
  timestamp: string;
  description: string;
}

export interface FulfillmentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  modelName: string;
  material: 'Resin Tiêu chuẩn' | 'Resin 8K Cao cấp' | 'Nhựa PLA Pro' | 'Nylon CF';
  heightMm: number;
  quantity: number;
  stage: KanbanStage;
  subStatus: ProductionSubStatus;
  assignment?: {
    id: string;
    partnerLabId: string;
    partnerLabName: string;
    assignedAt: string;
    dueAtUtc: string;
    partnerCostVnd: number;
    note?: string;
  };
  runs: ProductionRun[];
  shipment?: {
    carrier: string;
    trackingNumber: string;
    shippingActualVnd: number;
    events: ShipmentEvent[];
  };
}

export interface PartnerLab {
  id: string;
  name: string;
  specialty: string;
  activeLoad: number;
}

export interface DefectReportItem {
  id: string;
  orderCode: string;
  customerName: string;
  modelName: string;
  reportedIssue: string;
  customerImageUrl: string;
  qcArchiveImageUrl: string;
  createdAt: string;
  status: 'Pending' | 'ReprintApproved' | 'RefundApproved' | 'Rejected';
}

export const MOCK_PARTNER_LABS: PartnerLab[] = [
  { id: 'lab-01', name: 'Trạm In Sài Gòn CyberLab Q7', specialty: 'SLA Resin 8K & DLP', activeLoad: 12 },
  { id: 'lab-02', name: 'Xưởng FDM Thủ Đức BambuFarm', specialty: 'PLA Pro / PETG / ABS', activeLoad: 8 },
  { id: 'lab-03', name: 'MechaForge Industrial Bình Thạnh', specialty: 'SLS Nylon CF & Resin Kỹ thuật', activeLoad: 5 },
];

export const MOCK_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: 'rev-01',
    versionId: 'ver-9901',
    taskCode: 'MESH-2026-089',
    modelName: 'Cyber Samurai Ronin Bust',
    customerName: 'Nguyễn Minh Quân',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    meshStatus: 'Watertight',
    requestedHeightMm: 150,
    dimensionsMm: { x: 92.4, y: 84.1, z: 150.0 },
    volumeCm3: 184.6,
    triangleCount: 482910,
    defaultMaterial: 'Resin 8K Cao cấp',
    createdAt: '10 phút trước',
  },
  {
    id: 'rev-02',
    versionId: 'ver-9902',
    taskCode: 'MESH-2026-090',
    modelName: 'Mecha Dragon Articulated',
    customerName: 'Trần Hoàng Bảo',
    previewUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=300&auto=format&fit=crop&q=80',
    meshStatus: 'NonManifold',
    requestedHeightMm: 210,
    dimensionsMm: { x: 165.0, y: 140.2, z: 210.0 },
    volumeCm3: 312.8,
    triangleCount: 892100,
    defaultMaterial: 'Nylon CF',
    createdAt: '24 phút trước',
  },
  {
    id: 'rev-03',
    versionId: 'ver-9903',
    taskCode: 'MESH-2026-091',
    modelName: 'Chibi Valkyrie Armor',
    customerName: 'Lê Thu Hà',
    previewUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
    meshStatus: 'Warning',
    requestedHeightMm: 120,
    dimensionsMm: { x: 70.5, y: 68.0, z: 120.0 },
    volumeCm3: 95.2,
    triangleCount: 254300,
    defaultMaterial: 'Resin Tiêu chuẩn',
    createdAt: '45 phút trước',
  },
];

export const MOCK_FULFILLMENT_ORDERS: FulfillmentOrder[] = [
  {
    id: 'ord-101',
    orderCode: 'TB-2610-8821',
    customerName: 'Phạm Quốc Anh',
    customerPhone: '0908112233',
    modelName: 'Gundam Barbatos Custom Head',
    material: 'Resin 8K Cao cấp',
    heightMm: 140,
    quantity: 1,
    stage: 'AwaitingLab',
    subStatus: 'PendingAccept',
    runs: [],
  },
  {
    id: 'ord-102',
    orderCode: 'TB-2610-8819',
    customerName: 'Đặng Tuấn Kiệt',
    customerPhone: '0912445566',
    modelName: 'Vỏ Case Mini-ITX Cyberpunk',
    material: 'Nylon CF',
    heightMm: 240,
    quantity: 1,
    stage: 'LabAssigned',
    subStatus: 'PendingAccept',
    assignment: {
      id: 'asg-501',
      partnerLabId: 'lab-03',
      partnerLabName: 'MechaForge Industrial Bình Thạnh',
      assignedAt: '2026-10-25 14:20',
      dueAtUtc: '2026-10-28T10:00:00Z',
      partnerCostVnd: 650000,
      note: 'Chú ý độ co ngót nhiệt ở 4 góc ngàm ốc M3.',
    },
    runs: [],
  },
  {
    id: 'ord-103',
    orderCode: 'TB-2610-8815',
    customerName: 'Vũ Ngọc Bích',
    customerPhone: '0987654321',
    modelName: 'Tượng Malenia Blade of Miquella',
    material: 'Resin 8K Cao cấp',
    heightMm: 220,
    quantity: 1,
    stage: 'InProduction',
    subStatus: 'Printing',
    assignment: {
      id: 'asg-502',
      partnerLabId: 'lab-01',
      partnerLabName: 'Trạm In Sài Gòn CyberLab Q7',
      assignedAt: '2026-10-25 09:00',
      dueAtUtc: '2026-10-27T18:00:00Z',
      partnerCostVnd: 480000,
      note: 'In rỗng dày 2.2mm, đục 2 lỗ thoát nhựa dưới đế.',
    },
    runs: [
      {
        id: 'run-701',
        runNumber: 1,
        status: 'Printing',
        actualCostVnd: 480000,
        startedAt: '2026-10-25 10:30',
      },
    ],
  },
  {
    id: 'ord-104',
    orderCode: 'TB-2610-8809',
    customerName: 'Hoàng Gia Huy',
    customerPhone: '0933889900',
    modelName: 'Bàn Phím Split Ergonomic Tenting',
    material: 'Nhựa PLA Pro',
    heightMm: 85,
    quantity: 2,
    stage: 'QualityCheck',
    subStatus: 'WaitingQC',
    assignment: {
      id: 'asg-503',
      partnerLabId: 'lab-02',
      partnerLabName: 'Xưởng FDM Thủ Đức BambuFarm',
      assignedAt: '2026-10-24 15:00',
      dueAtUtc: '2026-10-26T12:00:00Z',
      partnerCostVnd: 220000,
    },
    runs: [
      {
        id: 'run-702',
        runNumber: 1,
        status: 'QualityCheck',
        actualCostVnd: 220000,
        startedAt: '2026-10-24 16:00',
      },
    ],
  },
  {
    id: 'ord-105',
    orderCode: 'TB-2610-8802',
    customerName: 'Ngô Bảo Châu',
    customerPhone: '0977223344',
    modelName: 'Mô Hình Động Cơ Jet Turbine',
    material: 'Resin Tiêu chuẩn',
    heightMm: 160,
    quantity: 1,
    stage: 'Delivery',
    subStatus: 'InTransit',
    assignment: {
      id: 'asg-504',
      partnerLabId: 'lab-01',
      partnerLabName: 'Trạm In Sài Gòn CyberLab Q7',
      assignedAt: '2026-10-23 11:00',
      dueAtUtc: '2026-10-25T11:00:00Z',
      partnerCostVnd: 350000,
    },
    runs: [
      {
        id: 'run-703',
        runNumber: 1,
        status: 'Passed',
        actualCostVnd: 350000,
        startedAt: '2026-10-23 13:00',
        qcNote: 'Đạt chuẩn dung sai 0.05mm, bề mặt cánh quạt sắc nét.',
      },
    ],
    shipment: {
      carrier: 'VNPost Express 3D',
      trackingNumber: 'VNP3D99281726VN',
      shippingActualVnd: 42000,
      events: [
        { status: 'LabelCreated', timestamp: '2026-10-25 14:00', description: 'Đã tạo mã vận đơn chống sốc 3 lớp' },
        { status: 'PickedUp', timestamp: '2026-10-25 16:30', description: 'Bưu tá đã nhận kiện hàng tại Trạm Q7' },
        { status: 'InTransit', timestamp: '2026-10-26 01:00', description: 'Đang luân chuyển tại kho trung tâm TP.HCM' },
      ],
    },
  },
];

export const MOCK_DEFECT_REPORTS: DefectReportItem[] = [
  {
    id: 'def-01',
    orderCode: 'TB-2610-8750',
    customerName: 'Lý Hải Đăng',
    modelName: 'Kỵ Sĩ Artorias Greatsword',
    reportedIssue: 'Thanh kiếm bị cong khoảng 15 độ và gãy phần chuôi khi mở hộp dù hộp ngoài không móp.',
    customerImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80',
    qcArchiveImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    createdAt: '2026-10-25 19:45',
    status: 'Pending',
  },
];
