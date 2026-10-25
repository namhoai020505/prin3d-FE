import api from '../lib/api';
import { IdempotencyManager } from '../lib/idempotency';

export interface PaymentAttemptDto {
  id: string;
  orderId: string;
  gateway: string; // "PayOS" | "Sandbox" | "SePay"
  merchantReference: string; // VD: "TB-20261025-ABCD..."
  providerTransactionId?: string | null;
  checkoutUrl?: string | null; // URL thanh toán VietQR / PayOS trực tiếp
  qrCode?: string | null; // Chuỗi EMVCo VietQR hoặc URL ảnh mã QR trực tiếp
  amountVnd: number;
  currency: string;
  status: 'Pending' | 'Succeeded' | 'Failed' | 'NeedsAttention' | 'Expired' | string;
  expiresAtUtc: string;
  createdAtUtc: string;
  capturedAtUtc?: string | null;
  failureReason?: string | null;
}

export interface RefundDto {
  id: string;
  orderId: string;
  amountVnd: number;
  reason?: string;
  status: 'Pending' | 'Submitted' | 'Succeeded' | 'Failed' | 'NeedsAttention' | string;
  note?: string;
  createdAtUtc: string;
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * 1. Tạo lượt thanh toán trực tuyến qua PayOS (Kèm Idempotency-Key UUID v4)
 */
export const createPaymentAttempt = async (
  orderId: string,
  note?: string,
  idempotencyKey?: string,
): Promise<PaymentAttemptDto> => {
  const key = idempotencyKey || IdempotencyManager.getOrCreateKey(`payment:attempt:${orderId}`);
  const raw = await api.post(
    `/api/v2/orders/${orderId}/payment-attempts`,
    { note: note || 'Thanh toán đơn hàng in 3D qua PayOS' },
    { headers: { 'Idempotency-Key': key } },
  );
  IdempotencyManager.clearKey(`payment:attempt:${orderId}`);
  return unwrap<PaymentAttemptDto>(raw);
};

/**
 * 2. Tra cứu lịch sử các lượt thanh toán của một đơn hàng
 */
export const getPaymentAttempts = async (orderId: string): Promise<PaymentAttemptDto[]> => {
  const raw = await api.get(`/api/v2/orders/${orderId}/payment-attempts`);
  return unwrap<PaymentAttemptDto[]>(raw);
};

/**
 * 3. (Admin/Staff) Đối soát giao dịch thanh toán khi gặp trạng thái NeedsAttention
 */
export const reconcilePaymentAttempt = async (
  attemptId: string,
): Promise<{ success: boolean; message: string; status?: string }> => {
  const raw = await api.post(`/api/v2/payments/reconcile/${attemptId}`);
  return unwrap<{ success: boolean; message: string; status?: string }>(raw);
};

/**
 * 4. (Admin/Staff) Tạo hoàn tiền cho đơn hàng
 */
export const createRefund = async (
  orderId: string,
  payload: { amountVnd?: number; reason?: string },
  idempotencyKey?: string,
): Promise<RefundDto> => {
  const key = idempotencyKey || IdempotencyManager.getOrCreateKey(`payment:refund:${orderId}`);
  const raw = await api.post(`/api/v2/orders/${orderId}/refunds`, payload, {
    headers: { 'Idempotency-Key': key },
  });
  IdempotencyManager.clearKey(`payment:refund:${orderId}`);
  return unwrap<RefundDto>(raw);
};

/**
 * 5. Xem danh sách hoàn tiền của đơn hàng
 */
export const getOrderRefunds = async (orderId: string): Promise<RefundDto[]> => {
  const raw = await api.get(`/api/v2/orders/${orderId}/refunds`);
  return unwrap<RefundDto[]>(raw);
};

/**
 * 6. (Admin/Staff) Đối soát lệnh hoàn tiền
 */
export const reconcileRefund = async (
  refundId: string,
  note?: string,
): Promise<{ success: boolean; message: string }> => {
  const raw = await api.post(`/api/v2/refunds/${refundId}/reconcile`, { note });
  return unwrap<{ success: boolean; message: string }>(raw);
};

export const paymentService = {
  createPaymentAttempt,
  getPaymentAttempts,
  reconcilePaymentAttempt,
  createRefund,
  getOrderRefunds,
  reconcileRefund,
};

export default paymentService;
