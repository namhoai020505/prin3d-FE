import api from '../lib/api';

export interface AiProviderMetricDto {
  provider: string; // Hunyuan3D, Meshy, Tripo
  totalJobs: number;
  succeededJobs: number;
  failedJobs: number;
  runningJobs: number;
}

export interface CommerceMetricDto {
  totalOrders: number;
  ordersByFulfillmentStatus: Record<string, number>;
  ordersByPaymentStatus: Record<string, number>;
  paymentAttemptsNeedsAttention: number;
  refundsNeedsAttention: number;
}

export interface OutboxAndNotificationMetricDto {
  outboxPending: number;
  outboxProcessed: number;
  outboxDeadLettered: number;
  notificationsDelivered: number;
  notificationsRead: number;
}

export interface ObservabilityReportDto {
  timestampUtc: string;
  aiGenerations: AiProviderMetricDto[];
  commerce: CommerceMetricDto;
  messaging: OutboxAndNotificationMetricDto;
  securityFilterStatus: string;
}

export interface DispatchOutboxResponse {
  dispatchedCount?: number;
  message?: string;
  [key: string]: unknown;
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * (Staff/Admin) Lay bao cao thong ke van hanh he thong thoi gian thuc V2
 */
export const getObservabilityReport = async (): Promise<ObservabilityReportDto> => {
  const raw = await api.get('/api/v2/admin/observability');
  return unwrap<ObservabilityReportDto>(raw);
};

/**
 * (Staff/Admin) Kich hoat giai phong hang doi Outbox thu cong
 */
export const dispatchOutbox = async (batchSize = 50): Promise<DispatchOutboxResponse> => {
  const raw = await api.post('/api/v2/admin/outbox/dispatch', { batchSize });
  return unwrap<DispatchOutboxResponse>(raw);
};

export const observabilityService = {
  getObservabilityReport,
  dispatchOutbox,
};

export default observabilityService;
