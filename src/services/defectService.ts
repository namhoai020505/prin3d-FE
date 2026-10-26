import api from '../lib/api';
import { IdempotencyManager } from '../lib/idempotency';

export interface DefectEvidenceInput {
  storageKey: string;
  sha256Hex?: string | null;
}

export interface CreateDefectReportPayload {
  clientRequestId?: string;
  reason: string;
  evidence?: DefectEvidenceInput[];
}

export interface DefectEvidenceDto {
  id: string;
  reportId: string;
  storageKey: string;
  sha256Hex: string;
  createdAtUtc: string;
}

export interface DefectReportDto {
  id: string;
  orderId: string;
  orderCode?: string;
  customerName?: string;
  userId?: string | null;
  clientRequestId?: string;
  reason: string;
  evidencePhotos?: string[];
  status: 'Open' | 'PendingReview' | 'ReprintApproved' | 'RefundApproved' | 'Rejected' | string;
  resolutionNote?: string | null;
  resolvedByUserId?: string | null;
  refundId?: string | null;
  reprintRunId?: string | null;
  createdAtUtc: string;
  resolvedAtUtc?: string | null;
  evidence?: DefectEvidenceDto[];
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * 1. Khách hàng gửi khiếu nại sản phẩm lỗi trong vòng 7 ngày (Kèm Idempotency-Key UUID v4)
 */
export const createDefectReport = async (
  orderId: string,
  payload: CreateDefectReportPayload,
  idempotencyKey?: string,
): Promise<DefectReportDto> => {
  const clientRequestId =
    payload.clientRequestId ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : IdempotencyManager.getOrCreateKey(`defect:report:${orderId}`));
  const key = idempotencyKey || clientRequestId;

  const requestBody: { clientRequestId: string; reason: string; evidence?: DefectEvidenceInput[] } = {
    clientRequestId,
    reason: payload.reason.trim(),
  };

  if (payload.evidence && payload.evidence.length > 0) {
    requestBody.evidence = payload.evidence.map((e) => ({
      storageKey: e.storageKey,
      ...(e.sha256Hex ? { sha256Hex: e.sha256Hex } : {}),
    }));
  }

  const raw = await api.post(`/api/v2/orders/${orderId}/defect-reports`, requestBody, {
    headers: { 'Idempotency-Key': key },
  });
  IdempotencyManager.clearKey(`defect:report:${orderId}`);
  return unwrap<DefectReportDto>(raw);
};

/**
 * 2. (Staff/Admin) Phê duyệt phương án đền bù / giải quyết khiếu nại
 */
export const resolveDefectReport = async (
  reportId: string,
  payload: {
    resolutionType: 'ReprintApproved' | 'RefundApproved' | 'Rejected';
    resolutionNote?: string;
  },
): Promise<DefectReportDto> => {
  const raw = await api.post(`/api/v2/defect-reports/${reportId}/resolve`, payload);
  return unwrap<DefectReportDto>(raw);
};

/**
 * 3. (Staff/Admin) Lấy danh sách khiếu nại sản phẩm lỗi
 */
export const getDefectReports = async (
  params?: { status?: string; orderId?: string }
): Promise<DefectReportDto[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') {
    queryParams.append('status', params.status);
  }
  if (params?.orderId) {
    queryParams.append('orderId', params.orderId);
  }
  const queryString = queryParams.toString();
  const url = queryString ? `/api/v2/defect-reports?${queryString}` : '/api/v2/defect-reports';
  const raw = await api.get(url);
  const data = unwrap<any>(raw);
  const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];

  return items.map((item) => {
    const evidenceList: string[] = Array.isArray(item.evidencePhotos)
      ? item.evidencePhotos
      : Array.isArray(item.evidence)
      ? item.evidence.map((e: any) => (typeof e === 'string' ? e : e?.storageKey || ''))
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
};

export const defectService = {
  createDefectReport,
  resolveDefectReport,
  getDefectReports,
};

export default defectService;
