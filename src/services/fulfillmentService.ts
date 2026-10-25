import api from '../lib/api';
import type { DefectReportDto } from './defectService';

export interface PartnerLabDto {
  id: string;
  name: string;
  contactPhone: string;
  address: string;
  isActive: boolean;
}

export interface ProductionRunDto {
  id: string;
  assignmentId?: string;
  runNo?: number;
  status: string; // Printing, PostProcessing, QualityCheck, Passed, Failed
  quantity?: number;
  actualCostVnd?: number | null;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  qcNote?: string | null;
  qcEvidenceStorageKey?: string | null;
}

export interface PartnerAssignmentDto {
  id: string;
  orderId?: string;
  partnerLabId?: string;
  labName?: string | null;
  partnerLabName?: string | null;
  assignedByUserId?: string;
  status: string; // Offered, Accepted, Rejected, Cancelled
  isActive?: boolean;
  partnerCostSnapshotVnd?: number;
  dueAtUtc?: string | null;
  decisionNote?: string | null;
  assignedAtUtc?: string;
  createdAtUtc?: string;
  productionRuns?: ProductionRunDto[];
}

export interface ShipmentEventDto {
  id?: string;
  shipmentId?: string;
  eventKey: string;
  status: string;
  note?: string | null;
  source?: string | null;
  actorUserId?: string | null;
  occurredAtUtc: string;
  receivedAtUtc?: string;
}

export interface ShipmentDto {
  id: string;
  orderId?: string;
  carrier: string;
  trackingNumber: string;
  status?: string;
  shippingActualVnd?: number | null;
  shippedAtUtc?: string;
  deliveredAtUtc?: string | null;
  deliveryEvidenceStorageKey?: string | null;
  createdAtUtc?: string;
  events: ShipmentEventDto[];
}

export interface FulfillmentTimelineDto {
  orderId: string;
  orderCode: string;
  fulfillmentStatus?: string;
  currentFulfillmentStatus?: string;
  orderPaymentStatus?: string;
  partnerLabId?: string | null;
  trackingNumber?: string | null;
  assignments: PartnerAssignmentDto[];
  productionRuns?: ProductionRunDto[];
  shipments: ShipmentDto[];
  defectReports?: DefectReportDto[];
}

export type OrderFulfillmentTimelineDto = FulfillmentTimelineDto;

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * 0. Lấy danh sách xưởng in đối tác đang hoạt động
 */
export const getPartnerLabs = async (): Promise<PartnerLabDto[]> => {
  const raw: any = await api.get('/api/v2/partner-labs');
  const unwrapped = unwrap<any>(raw);
  return (Array.isArray(unwrapped) ? unwrapped : unwrapped?.data) || [];
};

/**
 * 1. Khách hàng & Staff tra cứu toàn bộ dòng thời gian sản xuất & giao hàng của đơn
 */
export const getOrderTimeline = async (orderId: string): Promise<FulfillmentTimelineDto> => {
  const raw = await api.get(`/api/v2/orders/${orderId}/timeline`);
  return unwrap<FulfillmentTimelineDto>(raw);
};

/**
 * 2. (Staff) Gán xưởng in đối tác
 */
export const assignPartner = async (
  orderId: string,
  payload: { partnerLabId: string; dueAtUtc?: string; decisionNote?: string; partnerCostSnapshotVnd?: number },
  idempotencyKey?: string,
): Promise<PartnerAssignmentDto> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/orders/${orderId}/assignments`, payload, { headers });
  return unwrap<PartnerAssignmentDto>(raw);
};

/**
 * 3. (Staff/Xưởng) Khởi tạo đợt in
 */
export const startProductionRun = async (
  assignmentId: string,
  payload?: { quantity?: number; actualCostVnd?: number },
  idempotencyKey?: string,
): Promise<ProductionRunDto> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/assignments/${assignmentId}/production-runs`, payload, { headers });
  return unwrap<ProductionRunDto>(raw);
};

/**
 * 4. (Staff/Xưởng) Cập nhật tiến độ in (PostProcessing / QualityCheck)
 */
export const updateRunStatus = async (
  runId: string,
  status: 'PostProcessing' | 'QualityCheck',
  idempotencyKey?: string,
): Promise<ProductionRunDto> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/production-runs/${runId}/status`, { status }, { headers });
  return unwrap<ProductionRunDto>(raw);
};

/**
 * 5. (Staff) Ghi nhận kết quả kiểm định QC
 */
export const recordQc = async (
  runId: string,
  payload: { passed: boolean; qcNote?: string; qcEvidenceStorageKey?: string; triggerReprint?: boolean; actualCostVnd?: number },
  idempotencyKey?: string,
): Promise<ProductionRunDto> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/production-runs/${runId}/qc`, payload, { headers });
  return unwrap<ProductionRunDto>(raw);
};

/**
 * 6. (Staff) Tạo vận đơn giao hàng
 */
export const createShipment = async (
  orderId: string,
  payload: { carrier: string; trackingNumber: string; shippingActualVnd?: number },
  idempotencyKey?: string,
): Promise<ShipmentDto> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/orders/${orderId}/shipments`, payload, { headers });
  return unwrap<ShipmentDto>(raw);
};

/**
 * 7. (Staff/Shipper) Cập nhật trạng thái sự kiện giao hàng (Đang giao, Đã giao thành công)
 */
export const recordShipmentEvent = async (
  shipmentId: string,
  payload: { eventKey: string; status: string; note?: string; source?: string; occurredAtUtc?: string; deliveryEvidenceStorageKey?: string },
  idempotencyKey?: string,
): Promise<ShipmentEventDto> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/shipments/${shipmentId}/events`, payload, { headers });
  return unwrap<ShipmentEventDto>(raw);
};

/**
 * 8. (Xưởng/Staff) Phản hồi gán đơn (Chấp nhận hoặc Từ chối)
 */
export const respondAssignment = async (
  assignmentId: string,
  payload: { accepted: boolean; decisionNote?: string },
  idempotencyKey?: string,
): Promise<{ success: boolean; message: string }> => {
  const headers = { 'Idempotency-Key': idempotencyKey || crypto.randomUUID() };
  const raw = await api.post(`/api/v2/assignments/${assignmentId}/respond`, payload, { headers });
  return unwrap<{ success: boolean; message: string }>(raw);
};

export const fulfillmentService = {
  getPartnerLabs,
  getOrderTimeline,
  assignPartner,
  startProductionRun,
  updateRunStatus,
  recordQc,
  createShipment,
  recordShipmentEvent,
  respondAssignment,
};

export default fulfillmentService;
