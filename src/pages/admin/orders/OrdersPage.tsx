import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePagedQuery } from '../../../hooks/usePagedQuery';
import { adminOrderService, type OrderSummaryItem } from '../../../services/admin/adminOrderService';
import { DataTable, type Column } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { CancelOrderModal } from './CancelOrderModal';
import {
  getFulfillmentStatusMeta,
  getPaymentStatusMeta,
  formatVND,
  formatDateTime,
} from './orderStatus';

export const OrdersPage: React.FC = () => {
  const { id: routeOrderId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Cancel order modal target state
  const [cancelTarget, setCancelTarget] = useState<{ id: string; code: string } | null>(null);

  // Use paged query
  const {
    data: rawOrders,
    loading,
    error,
    page,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    refetch,
  } = usePagedQuery<OrderSummaryItem>({
    queryFn: (pageNumber, signal) => adminOrderService.getOrders(pageNumber, signal),
    pageSize: 20,
  });

  // Client-side filtering on current page
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((order) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const codeMatch = order.orderCode?.toLowerCase().includes(query);
        const nameMatch = order.receiverName?.toLowerCase().includes(query);
        const phoneMatch = order.receiverPhone?.toLowerCase().includes(query);
        if (!codeMatch && !nameMatch && !phoneMatch) return false;
      }

      // Fulfillment
      if (fulfillmentFilter !== 'ALL') {
        const fStatus = order.fulfillmentStatus || order.status;
        if (fStatus?.toLowerCase() !== fulfillmentFilter.toLowerCase()) {
          return false;
        }
      }

      // Payment
      if (paymentFilter !== 'ALL') {
        const pStatus = order.orderPaymentStatus || 'Unpaid';
        if (pStatus.toLowerCase() !== paymentFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [rawOrders, searchTerm, fulfillmentFilter, paymentFilter]);

  const handleOpenDetail = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const handleCloseDetail = () => {
    navigate('/admin/orders');
  };

  const columns: Column<OrderSummaryItem>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn',
      render: (item) => (
        <button
          onClick={() => handleOpenDetail(item.id)}
          className="font-mono text-cyan-400 hover:text-cyan-300 font-semibold hover:underline text-left cursor-pointer"
        >
          {item.orderCode}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (item) => (
        <div>
          <div className="font-medium text-slate-200">
            {item.receiverName || 'Khách vãng lai'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {item.receiverPhone || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'fulfillment',
      header: 'Vận hành',
      render: (item) => {
        const status = item.fulfillmentStatus || item.status;
        const meta = getFulfillmentStatusMeta(status);
        return <StatusBadge label={meta.label} variant={meta.variant} />;
      },
    },
    {
      key: 'payment',
      header: 'Thanh toán',
      render: (item) => {
        const status = item.orderPaymentStatus || 'Unpaid';
        const meta = getPaymentStatusMeta(status);
        return <StatusBadge label={meta.label} variant={meta.variant} />;
      },
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-100">
          {formatVND(item.totalVnd || item.subtotalVnd || 0)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      render: (item) => (
        <span className="text-slate-400 text-xs">
          {formatDateTime(item.createdAtUtc)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (item) => {
        const fStatus = item.fulfillmentStatus || item.status;
        const canCancel = fStatus !== 'Cancelled' && fStatus !== 'Delivered';
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleOpenDetail(item.id)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
              title="Xem chi tiết đơn"
            >
              Chi tiết
            </button>
            {canCancel && (
              <button
                onClick={() => setCancelTarget({ id: item.id, code: item.orderCode })}
                className="px-2 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                title="Hủy đơn hàng"
              >
                Hủy
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>📦</span> Quản lý Đơn hàng
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi tiến độ sản xuất, trạng thái vận hành và quản lý yêu cầu hủy đơn trên toàn sàn
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0d131f] p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="flex-1 w-full md:w-auto relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã đơn (TB-...), tên khách, số điện thoại..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="ALL">Vận hành: Tất cả</option>
            <option value="PendingPayment">Chờ thanh toán</option>
            <option value="AwaitingAssignment">Chờ gán xưởng</option>
            <option value="InProduction">Đang sản xuất</option>
            <option value="Shipped">Đang giao</option>
            <option value="Delivered">Đã giao</option>
            <option value="Cancelled">Đã hủy</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="ALL">Thanh toán: Tất cả</option>
            <option value="Unpaid">Chưa thanh toán</option>
            <option value="Paid">Đã thanh toán</option>
            <option value="Refunding">Đang hoàn tiền</option>
            <option value="Refunded">Đã hoàn tiền</option>
          </select>

          {(searchTerm || fulfillmentFilter !== 'ALL' || paymentFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFulfillmentFilter('ALL');
                setPaymentFilter('ALL');
              }}
              className="px-2.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {searchTerm && (
        <div className="text-[11px] text-slate-400 italic">
          * Đang tìm kiếm nhanh trên 20 bản ghi của trang hiện tại. Chuyển trang để tìm các đơn khác.
        </div>
      )}

      {/* Main Table */}
      <DataTable<OrderSummaryItem>
        columns={columns}
        data={filteredOrders}
        loading={loading}
        error={error}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => handleOpenDetail(item.id)}
        emptyTitle="Không có đơn hàng nào"
        emptyDescription="Không tìm thấy đơn hàng nào phù hợp với bộ lọc."
      />

      {/* Pagination */}
      <Pagination
        page={page}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onPrev={prevPage}
        onNext={nextPage}
        pageSize={20}
        totalItemsOnPage={filteredOrders.length}
        disabled={loading}
      />

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        orderId={routeOrderId || null}
        onClose={handleCloseDetail}
        onOrderUpdated={refetch}
      />

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={Boolean(cancelTarget)}
        orderId={cancelTarget?.id || null}
        orderCode={cancelTarget?.code}
        onClose={() => setCancelTarget(null)}
        onSuccess={() => {
          setCancelTarget(null);
          refetch();
        }}
      />
    </div>
  );
};

export default OrdersPage;

