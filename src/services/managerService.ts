import api from '../lib/api';
import { readList } from './staffService';
import type { OrderSummaryItem } from './admin/adminOrderService';
import { getObservabilityReport } from './observabilityService';

// Read every server page; the API currently returns arrays without a total count.
// Deduplication also handles servers that repeat the last page.
export async function getManagerOrders(): Promise<OrderSummaryItem[]> {
  const orders = new Map<string, OrderSummaryItem>();
  for (let page = 1; ; page++) {
    const items = readList<OrderSummaryItem>(await api.get('/api/orders', { params: { page } }));
    const previousSize = orders.size;
    items.forEach(item => orders.set(item.id, item));
    if (!items.length || orders.size === previousSize) return [...orders.values()];
  }
}

export const managerService = {
  getOrders: getManagerOrders,
  async getOverview() {
    const [report, orders] = await Promise.all([getObservabilityReport(), getManagerOrders()]);
    return { report, orders };
  },
};
