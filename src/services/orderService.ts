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
