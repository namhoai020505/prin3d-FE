import api from '../lib/api';

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

// ==================== V2 Types & Models ====================

export type ShippingAddress = {
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  district: string;
  city: string;
  customerNote?: string | null;
};

export type CustomerApproval = {
  id: string;
  userId: string;
  versionId: string;
  configurationHash: string;
  configurationJson: string;
  policyVersion: string;
  createdAtUtc: string;
};

export type CreateApprovalInput = {
  versionId: string;
  configuration: Record<string, unknown>;
  policyVersion?: string;
};

export type Quote = {
  id: string;
  userId: string;
  versionId: string;
  configurationHash: string;
  approvalId: string;
  reviewId: string;
  pricingPackageId: string;
  packageCode: string;
  packageName: string;
  quantity: number;
  unitPriceVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  address: ShippingAddress;
  snapshotJson: string;
  expiresAtUtc: string;
  createdAtUtc: string;
  isExpired: boolean;
};

export type CreateQuoteInput = {
  versionId: string;
  configuration: Record<string, unknown>;
  pricingPackageId: string;
  quantity: number;
  address: ShippingAddress;
};

export type OrderItemV2 = {
  id: string;
  lineNumber: number;
  versionId: string;
  configurationHash: string;
  quantity: number;
  unitPriceVnd: number;
  materialSnapshot: string;
  heightMm: number;
  engravingText?: string | null;
  partnerUnitBudgetVnd: number;
};

export type OrderStatusHistoryV2 = {
  id: string;
  axis: string;
  fromStatus: string;
  toStatus: string;
  actorUserId?: string | null;
  source: string;
  reason?: string | null;
  operationKey?: string | null;
  createdAtUtc: string;
};

export type OrderV2 = {
  id: string;
  orderCode: string;
  userId: string;
  quoteId: string;
  fulfillmentStatus: string;
  orderPaymentStatus: string;
  quantity: number;
  unitPriceSnapshot: number;
  subTotalVnd: number;
  finalShippingFee: number;
  totalAmount: number;
  currency: string;
  address: ShippingAddress;
  materialSnapshot: string;
  heightMmSnapshot: number;
  createdAtUtc: string;
  items: OrderItemV2[];
  histories: OrderStatusHistoryV2[];
};

export type CheckoutOrderV2Input = {
  quoteId: string;
};

export type PaymentAttempt = {
  id: string;
  orderId: string;
  gateway: string;
  merchantReference: string;
  providerTransactionId?: string | null;
  status: string;
  amountVnd: number;
  currency: string;
  expiresAtUtc: string;
  createdAtUtc: string;
  capturedAtUtc?: string | null;
  checkoutUrl?: string | null;
  failureReason?: string | null;
  qrCode?: string | null;
};

export type CreatePaymentAttemptInput = {
  note?: string;
};

// ==================== Legacy V1 Endpoints ====================

export const createOrder = async (input: CreateOrderInput): Promise<OrderItem> => {
  const response = await api.post('/api/orders', input, {
    headers: {
      'Idempotency-Key': crypto.randomUUID(),
    },
  });
  return response as unknown as OrderItem;
};

export const listOrders = async (page = 1): Promise<OrderItem[]> => {
  const response = await api.get(`/api/orders?page=${page}`);
  return response as unknown as OrderItem[];
};

export const getOrder = async (id: string): Promise<OrderItem> => {
  const response = await api.get(`/api/orders/${id}`);
  return response as unknown as OrderItem;
};

export const cancelOrder = async (id: string): Promise<OrderItem> => {
  const response = await api.post(`/api/orders/${id}/cancel`);
  return response as unknown as OrderItem;
};

export const updateOrderStatus = async (
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderItem> => {
  const response = await api.patch(`/api/orders/${id}/status`, input);
  return response as unknown as OrderItem;
};

// ==================== V2 Endpoints ====================

export const createApproval = async (input: CreateApprovalInput): Promise<CustomerApproval> => {
  const response = await api.post('/api/v2/approvals', {
    versionId: input.versionId,
    configuration: input.configuration,
    policyVersion: input.policyVersion || 'v1.0',
  });
  return response as unknown as CustomerApproval;
};

export const createQuote = async (input: CreateQuoteInput): Promise<Quote> => {
  const response = await api.post('/api/v2/quotes', input);
  return response as unknown as Quote;
};

export const checkoutOrderV2 = async (input: CheckoutOrderV2Input): Promise<OrderV2> => {
  const response = await api.post('/api/v2/orders', input, {
    headers: {
      'Idempotency-Key': crypto.randomUUID(),
    },
  });
  return response as unknown as OrderV2;
};

export const createPaymentAttempt = async (
  orderId: string,
  input?: CreatePaymentAttemptInput,
): Promise<PaymentAttempt> => {
  const response = await api.post(
    `/api/v2/orders/${orderId}/payment-attempts`,
    input ?? { note: 'Thanh toán đơn in 3D PayOS' },
    {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    },
  );
  return response as unknown as PaymentAttempt;
};

export const getPaymentAttempts = async (orderId: string): Promise<PaymentAttempt[]> => {
  const response = await api.get(`/api/v2/orders/${orderId}/payment-attempts`);
  return response as unknown as PaymentAttempt[];
};

// ==================== Top-Up Payment Endpoints ====================

export type TopUpPackageId = 'starter' | 'creator' | 'studio';

export type TopUpPaymentResponse = {
  success: boolean;
  packageId: TopUpPackageId;
  amountVnd: number;
  credits: number;
  merchantReference: string;
  checkoutUrl?: string | null;
  qrCode?: string | null;
};

export const createTopUpPayment = async (
  input: TopUpPackageId | { packageId: TopUpPackageId },
): Promise<TopUpPaymentResponse> => {
  const packageId = typeof input === 'string' ? input : input.packageId;
  const response = await api.post('/api/v2/payments/topup', { packageId });
  return response as unknown as TopUpPaymentResponse;
};

