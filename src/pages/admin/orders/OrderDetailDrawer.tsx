import React, { useEffect, useState } from 'react';
import { adminOrderService, type OrderV2DetailDto } from '../../../services/admin/adminOrderService';
import { StatusBadge } from '../components/StatusBadge';
import {
  getFulfillmentStatusMeta,
  getPaymentStatusMeta,
  formatVND,
  formatDateTime,
} from './orderStatus';
import { CancelOrderModal } from './CancelOrderModal';

interface OrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  orderId,
  onClose,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<OrderV2DetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    adminOrderService
      .getOrderById(orderId, abortController.signal)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        const msg = err.response?.data?.message || err.message || 'Không thể tải chi tiết đơn hàng';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [orderId]);

  if (!orderId) return null;

  const fulfillmentMeta = order ? getFulfillmentStatusMeta(order.fulfillmentStatus) : null;
  const paymentMeta = order ? getPaymentStatusMeta(order.orderPaymentStatus) : null;

  const canCancel =
    order &&
    order.fulfillmentStatus !== 'Cancelled' &&
    order.fulfillmentStatus !== 'Delivered';

  const handleCancelSuccess = () => {
    // Refetch detail
    if (orderId) {
      adminOrderService.getOrderById(orderId).then((data) => setOrder(data));
    }
    if (onOrderUpdated) {
      onOrderUpdated();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0b0f19] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 transform transition-transform duration-300 ease-in-out"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết đơn hàng"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {order ? order.orderCode : 'Đang tải đơn...'}
              </h2>
              {fulfillmentMeta && (
                <StatusBadge label={fulfillmentMeta.label} variant={fulfillmentMeta.variant} />
              )}
              {paymentMeta && (
                <StatusBadge label={paymentMeta.label} variant={paymentMeta.variant} />
              )}
            </div>
            {order?.createdAtUtc && (
              <span className="text-xs text-slate-400 mt-1">
                Tạo lúc: {formatDateTime(order.createdAtUtc)}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-800/50 rounded-xl" />
              <div className="h-40 bg-slate-800/50 rounded-xl" />
              <div className="h-32 bg-slate-800/50 rounded-xl" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300 text-sm">
              <p className="font-semibold">Lỗi tải dữ liệu</p>
              <p className="text-xs mt-1 text-rose-400">{error}</p>
            </div>
          )}

          {order && !loading && (
            <>
              {/* Customer & Shipping Section */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Thông tin khách hàng & Giao nhận
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Người nhận:</span>
                    <p className="font-medium text-slate-200 mt-0.5">
                      {order.address?.receiverName || 'Chưa cung cấp'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Số điện thoại:</span>
                    <p className="font-medium text-slate-200 mt-0.5 font-mono">
                      {order.address?.receiverPhone || 'Chưa cung cấp'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Địa chỉ giao hàng:</span>
                    <p className="font-medium text-slate-200 mt-0.5">
                      {[order.address?.streetAddress, order.address?.district, order.address?.city]
                        .filter(Boolean)
                        .join(', ') || 'Chưa cung cấp'}
                    </p>
                  </div>
                  {order.address?.customerNote && (
                    <div className="col-span-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Ghi chú của khách:</span>
                      <p className="text-slate-300 italic mt-0.5 text-xs">
                        "{order.address.customerNote}"
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Items & Print Specification Section */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Chi tiết sản phẩm in 3D
                </h3>
                {order.items && order.items.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-200">
                            Mẫu in #{item.lineNumber} — {item.materialSnapshot || 'Vật liệu tiêu chuẩn'}
                          </p>
                          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                            <span>Chiều cao: <strong className="text-slate-300">{item.heightMm} mm</strong></span>
                            <span>Số lượng: <strong className="text-slate-300">x{item.quantity}</strong></span>
                            {item.engravingText && (
                              <span className="text-cyan-400">Khắc: "{item.engravingText}"</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-medium text-slate-200">
                            {formatVND(item.unitPriceVnd * item.quantity)}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            ({formatVND(item.unitPriceVnd)}/cái)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>Vật liệu snapshot: <span className="text-white font-medium">{order.materialSnapshot || '—'}</span></p>
                    <p>Chiều cao snapshot: <span className="text-white font-medium">{order.heightMmSnapshot ? `${order.heightMmSnapshot} mm` : '—'}</span></p>
                    <p>Số lượng: <span className="text-white font-medium">{order.quantity}</span></p>
                  </div>
                )}
              </section>

              {/* Order Total Breakdown */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Tạm tính tiền hàng:</span>
                  <span className="font-mono text-slate-300">{formatVND(order.subTotalVnd)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Phí vận chuyển:</span>
                  <span className="font-mono text-slate-300">{formatVND(order.finalShippingFee)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono text-cyan-400 text-base">{formatVND(order.totalAmount)}</span>
                </div>
              </section>

              {/* Status Audit Trail */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Nhật ký trạng thái (Audit Trail)
                </h3>
                {order.statusHistories && order.statusHistories.length > 0 ? (
                  <div className="relative pl-4 space-y-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {order.statusHistories.map((h) => {
                      const fromMeta = getFulfillmentStatusMeta(h.fromStatus);
                      const toMeta = getFulfillmentStatusMeta(h.toStatus);
                      return (
                        <div key={h.id} className="relative text-xs">
                          <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-[#0b0f19]" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-400">{fromMeta.label}</span>
                            <span className="text-slate-500">→</span>
                            <span className="font-semibold text-slate-200">{toMeta.label}</span>
                            <span className="text-[10px] text-slate-400 ml-auto font-mono">
                              {formatDateTime(h.createdAtUtc)}
                            </span>
                          </div>
                          {h.reason && (
                            <p className="text-[11px] text-rose-300 mt-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
                              Lý do: {h.reason}
                            </p>
                          )}
                          {h.actorUserId && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Người thực hiện: <span className="font-mono text-slate-300">{h.actorUserId}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa ghi nhận lịch sử thay đổi trạng thái</p>
                )}
              </section>

              {/* Pending Cancellation Review Section (Rendered only if backend provides requestId) */}
              {order.pendingCancellationRequestId && (
                <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-amber-300 flex items-center gap-2">
                    ⚠️ Yêu cầu hủy đơn từ khách hàng
                  </h3>
                  <p className="text-xs text-slate-300">
                    Khách hàng đã gửi yêu cầu hủy cho đơn này. Vui lòng xem xét và xử lý:
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={async () => {
                        try {
                          await adminOrderService.reviewCancellationRequest(
                            order.pendingCancellationRequestId!,
                            { approved: true, decisionNote: 'Quản trị viên đồng ý yêu cầu hủy' }
                          );
                          handleCancelSuccess();
                        } catch (err: any) {
                          alert(err.message || 'Lỗi duyệt hủy');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Đồng ý hủy
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await adminOrderService.reviewCancellationRequest(
                            order.pendingCancellationRequestId!,
                            { approved: false, decisionNote: 'Quản trị viên từ chối yêu cầu hủy' }
                          );
                          handleCancelSuccess();
                        } catch (err: any) {
                          alert(err.message || 'Lỗi từ chối hủy');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Từ chối
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div>
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 rounded-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hủy đơn hàng
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </aside>

      <CancelOrderModal
        isOpen={showCancelModal}
        orderId={order?.id || null}
        orderCode={order?.orderCode}
        onClose={() => setShowCancelModal(false)}
        onSuccess={handleCancelSuccess}
      />
    </>
  );
};
