import api from '../lib/api';
import { adminOrderService, type OrderSummaryItem } from './admin/adminOrderService';
import { adminReviewService, type GenerationTaskItem } from './admin/adminReviewService';
import { fulfillmentService } from './fulfillmentService';
import type { DefectReportDto } from './defectService';
import type { FulfillmentOrder, KanbanStage } from '../types/staff';

export function readList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object') {
    if ('data' in response) return readList<T>(response.data);
    if ('items' in response) return readList<T>(response.items);
  }
  throw new Error('Dữ liệu danh sách từ máy chủ không hợp lệ.');
}

async function readPages<T extends { id: string }>(fetchPage: (page: number) => Promise<unknown>): Promise<T[]> {
  const items = new Map<string, T>();
  for (let page = 1; ; page++) {
    const next = readList<T>(await fetchPage(page));
    const previousSize = items.size;
    next.forEach(item => items.set(item.id, item));
    if (next.length === 0 || previousSize === items.size) return [...items.values()];
  }
}

const stages: Record<string, KanbanStage> = {
  AwaitingAssignment: 'AwaitingLab', PendingAssignment: 'AwaitingLab',
  Assigned: 'LabAssigned', Printing: 'InProduction', InProduction: 'InProduction',
  PostProcessing: 'InProduction', QualityCheck: 'QualityCheck',
  Packaged: 'Delivery', ReadyToShip: 'Delivery', Shipping: 'Delivery',
  Shipped: 'Delivery', Delivered: 'Delivery',
};

export async function loadStaffOrder(summary: OrderSummaryItem): Promise<FulfillmentOrder> {
  const [detail, timeline] = await Promise.all([
    adminOrderService.getOrderById(summary.id), fulfillmentService.getOrderTimeline(summary.id),
  ]);
  const assignment = [...(timeline.assignments || [])].reverse().find(a =>
    a.isActive !== false && !['Rejected', 'Cancelled'].includes(a.status));
  const runs = timeline.productionRuns ?? (timeline.assignments || []).flatMap(a => a.productionRuns || []);
  const shipment = timeline.shipments?.at(-1);
  const status = timeline.currentFulfillmentStatus || timeline.fulfillmentStatus || detail.fulfillmentStatus || summary.fulfillmentStatus || '';
  return {
    id: summary.id, orderCode: detail.orderCode || summary.orderCode,
    customerName: detail.address?.receiverName || summary.receiverName || '',
    customerPhone: detail.address?.receiverPhone || summary.receiverPhone || '',
    material: detail.materialSnapshot || detail.items?.[0]?.materialSnapshot || summary.material || '',
    heightMm: detail.heightMmSnapshot ?? detail.items?.[0]?.heightMm ?? summary.dimensions?.heightMm,
    quantity: detail.quantity ?? summary.quantity, stage: stages[status] || 'Unknown',
    subStatus: status === 'Assigned' ? assignment?.status || status : status,
    assignment, runs, shipment,
  };
}

export const staffService = {
  getReviewQueue: () => readPages<GenerationTaskItem>(page => api.get(`/api/generations?page=${page}`)),
  getReviewDetail: adminReviewService.getGenerationById,
  async getOrders(): Promise<FulfillmentOrder[]> {
    const summaries = await readPages<OrderSummaryItem>(page => api.get(`/api/orders?page=${page}`));
    const paid = summaries.filter(o => o.orderPaymentStatus === 'Paid' && !['Cancelled', 'Draft', 'PendingPayment'].includes(o.fulfillmentStatus || o.status));
    const orders: FulfillmentOrder[] = [];
    for (let offset = 0; offset < paid.length; offset += 6) {
      orders.push(...await Promise.all(paid.slice(offset, offset + 6).map(loadStaffOrder)));
    }
    return orders;
  },
  getDefects: () => readPages<DefectReportDto>(page => api.get(`/api/v2/defect-reports?page=${page}`)),
};
