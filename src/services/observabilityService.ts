import api from '../lib/api';

export interface AiProviderMetricDto {
  provider: string; // Meshy, Tripo
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

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * (Staff/Admin) Lấy báo cáo thống kê vận hành hệ thống thời gian thực V2
 */
export const getObservabilityReport = async (): Promise<ObservabilityReportDto> => {
  const raw = await api.get('/api/v2/admin/observability');
  return unwrap<ObservabilityReportDto>(raw);
};

export const observabilityService = {
  getObservabilityReport,
};

export default observabilityService;

