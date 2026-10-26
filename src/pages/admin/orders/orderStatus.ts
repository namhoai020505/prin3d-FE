import type { StatusBadgeTone } from '../components/StatusBadge';

export interface StatusMeta {
  label: string;
  tone: StatusBadgeTone;
  variant: StatusBadgeTone;
}

export const FULFILLMENT_STATUS_MAP: Record<string, { label: string; tone: StatusBadgeTone }> = {
  PendingPayment: { label: 'Chờ thanh toán', tone: 'amber' },
  AwaitingAssignment: { label: 'Chờ gán xưởng', tone: 'cyan' },
  Assigned: { label: 'Xưởng tiếp nhận', tone: 'cyan' },
  Printing: { label: 'Đang in', tone: 'blue' },
  InProduction: { label: 'Đang sản xuất', tone: 'blue' },
  PostProcessing: { label: 'Xử lý nguội', tone: 'purple' },
  QualityCheck: { label: 'Kiểm định QC', tone: 'cyan' },
  Packaged: { label: 'Đã đóng gói', tone: 'cyan' },
  Shipped: { label: 'Đang giao hàng', tone: 'blue' },
  Delivered: { label: 'Đã giao hàng', tone: 'green' },
  Cancelled: { label: 'Đã hủy', tone: 'rose' },
  Draft: { label: 'Bản nháp', tone: 'slate' },
};

export const PAYMENT_STATUS_MAP: Record<string, { label: string; tone: StatusBadgeTone }> = {
  Unpaid: { label: 'Chưa thanh toán', tone: 'amber' },
  Paid: { label: 'Đã thanh toán', tone: 'green' },
  Refunding: { label: 'Đang hoàn tiền', tone: 'purple' },
  Refunded: { label: 'Đã hoàn tiền', tone: 'slate' },
  Failed: { label: 'Thanh toán lỗi', tone: 'rose' },
};

export function getFulfillmentStatusMeta(status: string | null | undefined): StatusMeta {
  if (!status) return { label: 'Chưa xác định', tone: 'slate', variant: 'slate' };
  const found = FULFILLMENT_STATUS_MAP[status];
  if (found) {
    return { label: found.label, tone: found.tone, variant: found.tone };
  }
  return { label: status, tone: 'slate', variant: 'slate' };
}

export function getPaymentStatusMeta(status: string | null | undefined): StatusMeta {
  if (!status) return { label: 'Chưa thanh toán', tone: 'slate', variant: 'slate' };
  const found = PAYMENT_STATUS_MAP[status];
  if (found) {
    return { label: found.label, tone: found.tone, variant: found.tone };
  }
  return { label: status, tone: 'slate', variant: 'slate' };
}

export function formatVND(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

