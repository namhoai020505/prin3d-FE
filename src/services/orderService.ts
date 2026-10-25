import api from '../lib/api';
import { IdempotencyManager } from '../lib/idempotency';
import type { ShippingAddressDto } from './quoteService';

// V1 Types (giữ nguyên để tương thích ngược)
export type OrderStatus =
  | 'Created'
  | 'PrintingStarted'
  | 'Packaged'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type OrderItem = {
  id: string;
  orderCode: string;
  userId: string;
  generationTaskId: string;
  pricingPackageId: string;
  status: OrderStatus;
  quantity: number;
  unitPriceVnd: number;
  subtotalVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  material: string;
  dimensions: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  district: string;
  city: string;
  customerNote?: string | null;
  createdAtUtc: string;
  printingStartedAtUtc?: string | null;
  packagedAtUtc?: string | null;
  shippedAtUtc?: string | null;
  deliveredAtUtc?: string | null;
  cancelledAtUtc?: string | null;
  trackingNumber?: string | null;
  statusNote?: string | null;
  paymentMode: string;
};

export type CreateOrderInput = {
  generationTaskId: string;
  pricingPackageId: string;
  quantity: number;
  expectedTotalVnd: number;
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  district: string;
  city: string;
  customerNote?: string;
};

export type UpdateOrderStatusInput = {
  status: OrderStatus;
  note: string;
  trackingNumber?: string;
};

// V2 Types (Khớp 100% với Backend C# OrdersV2Controller)
export interface OrderV2ItemDto {
  id: string;
  lineNumber: number;
  versionId: string;
  configurationHash?: string;
  quantity: number;
  unitPriceVnd: number;
  materialSnapshot: string;
  heightMm: number;
  engravingText?: string | null;
  partnerUnitBudgetVnd?: number;
}

export interface OrderStatusHistoryDto {
  id: string;
  axis: string; // 'Payment' | 'Fulfillment'
  fromStatus: string;
  toStatus: string;
  actorUserId?: string | null;
  source?: string;
  reason: string;
  operationKey?: string;
  createdAtUtc: string;
}

export type OrderV2HistoryDto = OrderStatusHistoryDto;

export interface OrderV2Dto {
  id: string;
  orderCode: string;
  userId: string;
  quoteId: string;
  fulfillmentStatus: string; // PendingPayment, AwaitingAssignment, Assigned, Printing, Packaged, InTransit, Delivered, Cancelled
  orderPaymentStatus: string; // Unpaid, Paid, PartiallyRefunded, RefundPending, Refunded, NeedsAttention
  quantity: number;
  unitPriceSnapshot: number;
  subTotalVnd: number;
  finalShippingFee: number;
  totalAmount: number;
  currency: string;
  address: ShippingAddressDto;
  materialSnapshot: string;
  heightMmSnapshot: number;
  createdAtUtc: string;
  items: OrderV2ItemDto[];
  histories: OrderV2HistoryDto[];
}

export interface CancelOrderResult {
  orderId: string;
  orderCode: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  cancellationStatus: 'CancelledDirectly' | 'PendingReview' | 'ApprovedAwaitingRefund' | string;
  cancellationRequestId?: string | null;
  refundRequired: boolean;
}

export type CancelOrderV2Result = CancelOrderResult;

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

// V1 API Implementations
export const normalizeOrderV2 = (data: any): OrderV2Dto => {
  if (!data) return data;
  return {
    ...data,
    id: data.id || data.orderId || '',
    orderCode: data.orderCode || '',
    userId: data.userId || '',
    quoteId: data.quoteId || '',
    fulfillmentStatus: data.fulfillmentStatus || 'PendingPayment',
    orderPaymentStatus: data.orderPaymentStatus || data.paymentStatus || 'Unpaid',
    quantity: data.quantity ?? 1,
    unitPriceSnapshot: data.unitPriceSnapshot ?? data.unitPriceVnd ?? 0,
    subTotalVnd: data.subTotalVnd ?? data.subtotalVnd ?? 0,
    finalShippingFee: data.finalShippingFee ?? data.shippingFeeVnd ?? 0,
    totalAmount: data.totalAmount ?? data.totalVnd ?? 0,
    currency: data.currency || 'VND',
    address: data.address || {
      receiverName: '',
      receiverPhone: '',
      streetAddress: '',
      district: '',
      city: '',
    },
    materialSnapshot: data.materialSnapshot || data.material || 'Resin',
    heightMmSnapshot: data.heightMmSnapshot ?? data.heightMm ?? 100,
    createdAtUtc: data.createdAtUtc || new Date().toISOString(),
    items: data.items || [],
    histories: data.histories || data.statusHistories || [],
  };
};

export const createOrder = async (input: CreateOrderInput): Promise<OrderItem> => {
  const key = IdempotencyManager.getOrCreateKey('order:create');
  const response = await api.post('/api/orders', input, {
    headers: {
      'Idempotency-Key': key,
    },
  });
  IdempotencyManager.clearKey('order:create');
  return unwrap<OrderItem>(response);
};

export const listOrders = async (page = 1): Promise<OrderItem[]> => {
  const response = await api.get(`/api/orders?page=${page}`);
  return unwrap<OrderItem[]>(response);
};

export const getOrder = async (id: string): Promise<OrderItem> => {
  const response = await api.get(`/api/orders/${id}`);
  return unwrap<OrderItem>(response);
};

export const cancelOrder = async (id: string): Promise<OrderItem> => {
  const response = await api.post(`/api/orders/${id}/cancel`);
  return unwrap<OrderItem>(response);
};

export const updateOrderStatus = async (
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderItem> => {
  const response = await api.patch(`/api/orders/${id}/status`, input);
  return unwrap<OrderItem>(response);
};

// V2 API Implementations
/**
 * 1. Checkout tạo Đơn Hàng V2 từ QuoteId (Bắt buộc Idempotency-Key UUID v4)
 */
export const checkoutQuote = async (
  quoteId: string,
  idempotencyKey?: string,
): Promise<OrderV2Dto> => {
  const key = idempotencyKey || IdempotencyManager.getOrCreateKey(`order:checkout:${quoteId}`);
  const raw = await api.post(
    '/api/v2/orders',
    { quoteId },
    {
      headers: { 'Idempotency-Key': key },
    },
  );
  IdempotencyManager.clearKey(`order:checkout:${quoteId}`);
  const order = normalizeOrderV2(unwrap<any>(raw));
  if (typeof window !== 'undefined' && order?.id) {
    sessionStorage.setItem('idea2model_last_order_id', order.id);
  }
  return order;
};

/**
 * 2. Tra cứu chi tiết Đơn hàng V2 (2 trục Payment & Fulfillment)
 */
export const getOrderById = async (orderId: string): Promise<OrderV2Dto> => {
  const raw = await api.get(`/api/v2/orders/${orderId}`);
  return normalizeOrderV2(unwrap<any>(raw));
};

/**
 * 3. Hủy đơn hàng V2 (Phân nhánh: Hủy tức thì hoặc Gửi yêu cầu chờ duyệt)
 */
export const cancelOrderV2 = async (
  orderId: string,
  reason: string,
  decisionNote?: string,
): Promise<CancelOrderResult> => {
  const payload: { reason: string; decisionNote?: string } = { reason: reason.trim() };
  if (decisionNote && decisionNote.trim()) {
    payload.decisionNote = decisionNote.trim();
  }
  const raw = await api.post(`/api/v2/orders/${orderId}/cancel`, payload);
  return unwrap<CancelOrderResult>(raw);
};

/**
 * 4. (Staff/Admin) Duyệt yêu cầu hủy đơn hàng
 */
export const reviewCancellationRequest = async (
  requestId: string,
  approved: boolean,
  decisionNote?: string,
): Promise<{ success: boolean; message: string }> => {
  const raw = await api.post(`/api/v2/orders/cancellation-requests/${requestId}/review`, {
    approved,
    decisionNote,
  });
  return unwrap<{ success: boolean; message: string }>(raw);
};

export const orderService = {
  createOrder,
  listOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
  checkoutQuote,
  getOrderById,
  cancelOrderV2,
  reviewCancellationRequest,
};

export default orderService;
