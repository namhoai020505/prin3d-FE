import api from '../../lib/api';

export interface OrderSummaryItem {
  id: string;
  orderCode: string;
  userId: string;
  status: string;
  fulfillmentStatus?: string;
  orderPaymentStatus?: string;
  quantity: number;
  unitPriceVnd: number;
  subtotalVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  material?: string;
  dimensions?: {
    widthMm?: number;
    depthMm?: number;
    heightMm?: number;
  };
  receiverName?: string;
  receiverPhone?: string;
  streetAddress?: string;
  district?: string;
  city?: string;
  customerNote?: string;
  trackingNumber?: string;
  createdAtUtc?: string;
}

export interface ShippingAddressDto {
  receiverName?: string;
  receiverPhone?: string;
  streetAddress?: string;
  district?: string;
  city?: string;
  customerNote?: string;
}

export interface OrderItemDetailDto {
  id: string;
  lineNumber: number;
  versionId: string;
  configurationHash: string;
  quantity: number;
  unitPriceVnd: number;
  materialSnapshot: string;
  heightMm: number;
  engravingText?: string | null;
  partnerUnitBudgetVnd?: number;
}

export interface OrderStatusHistoryDto {
  id: string;
  axis: string;
  fromStatus: string;
  toStatus: string;
  actorUserId?: string | null;
  source?: string | null;
  reason?: string | null;
  operationKey?: string | null;
  createdAtUtc: string;
}

export interface OrderV2DetailDto {
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
  address: ShippingAddressDto;
  materialSnapshot?: string | null;
  heightMmSnapshot?: number | null;
  createdAtUtc: string;
  items: OrderItemDetailDto[];
  statusHistories: OrderStatusHistoryDto[];
  // If BE expands to return pendingCancellationRequestId
  pendingCancellationRequestId?: string | null;
}

export interface CancelOrderV2Payload {
  reason: string;
  decisionNote?: string;
}

export interface CancelOrderV2ResultDto {
  orderId: string;
  orderCode: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  cancellationStatus: string;
  cancellationRequestId?: string | null;
  refundRequired: boolean;
}

export interface ReviewCancellationRequestPayload {
  approved: boolean;
  decisionNote?: string;
}

type OrderV2ApiDto = Omit<OrderV2DetailDto, 'orderPaymentStatus' | 'unitPriceSnapshot' | 'subTotalVnd' | 'finalShippingFee' | 'totalAmount' | 'materialSnapshot' | 'heightMmSnapshot'> & {
  paymentStatus: string;
  unitPriceVnd: number;
  subtotalVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  material: string;
  heightMm: number;
};

export const adminOrderService = {
  getOrders: async (page = 1, signal?: AbortSignal): Promise<OrderSummaryItem[]> => {
    const res: any = await api.get(`/api/orders?page=${page}`, { signal });
    return (Array.isArray(res) ? res : res?.data) || [];
  },

  getOrderById: async (id: string, signal?: AbortSignal): Promise<OrderV2DetailDto> => {
    const response: unknown = await api.get(`/api/v2/orders/${id}`, { signal });
    const order = (response && typeof response === 'object' && 'data' in response ? response.data : response) as OrderV2ApiDto;
    return {
      ...order,
      orderPaymentStatus: order.paymentStatus,
      unitPriceSnapshot: order.unitPriceVnd,
      subTotalVnd: order.subtotalVnd,
      finalShippingFee: order.shippingFeeVnd,
      totalAmount: order.totalVnd,
      materialSnapshot: order.material,
      heightMmSnapshot: order.heightMm,
    };
  },

  cancelOrder: async (id: string, payload: CancelOrderV2Payload): Promise<CancelOrderV2ResultDto> => {
    const res: any = await api.post(`/api/v2/orders/${id}/cancel`, payload);
    return res?.data ?? res;
  },

  reviewCancellationRequest: async (
    requestId: string,
    payload: ReviewCancellationRequestPayload
  ): Promise<unknown> => {
    const res: any = await api.post(
      `/api/v2/orders/cancellation-requests/${requestId}/review`,
      payload
    );
    return res?.data ?? res;
  },
};

export default adminOrderService;

