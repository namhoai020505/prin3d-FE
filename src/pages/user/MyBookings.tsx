import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Printer,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  cancelOrder,
  listOrders,
  type OrderItem,
  type OrderStatus,
} from '../../services/orderService';

const statusConfig: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  Created: {
    label: 'Chờ duyệt in',
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-300',
    icon: Clock,
  },
  PrintingStarted: {
    label: 'Đang in 3D',
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-300',
    icon: Printer,
  },
  Packaged: {
    label: 'Đã đóng gói',
    bg: 'bg-purple-500/10 border-purple-500/30',
    text: 'text-purple-300',
    icon: Package,
  },
  Shipped: {
    label: 'Đang vận chuyển',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    text: 'text-cyan-300',
    icon: Truck,
  },
  Delivered: {
    label: 'Đã nhận hàng',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-300',
    icon: CheckCircle2,
  },
  Cancelled: {
    label: 'Đã hủy',
    bg: 'bg-rose-500/10 border-rose-500/30',
    text: 'text-rose-300',
    icon: XCircle,
  },
};

type FilterTab = 'ALL' | 'ACTIVE' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export default function MyBookings() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listOrders();
      setOrders(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng in 3D.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listOrders();
        if (isMounted) {
          setOrders(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng in 3D.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = async (orderId: string) => {
    const isConfirmed = window.confirm(
      'Bạn có chắc chắn muốn hủy đơn hàng in 3D này không?'
    );
    if (!isConfirmed) return;

    try {
      setCancellingOrderId(orderId);
      await cancelOrder(orderId);
      setActionNotice('Đã hủy đơn hàng thành công.');
      setTimeout(() => setActionNotice(null), 3000);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy đơn hàng lúc này.';
      alert(`Lỗi: ${msg}`);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const formatVnd = (amount: number) =>
    amount.toLocaleString('vi-VN') + ' đ';

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ACTIVE') {
      return order.status === 'Created' || order.status === 'PrintingStarted' || order.status === 'Packaged';
    }
    if (activeTab === 'SHIPPED') {
      return order.status === 'Shipped';
    }
    if (activeTab === 'DELIVERED') {
      return order.status === 'Delivered';
    }
    if (activeTab === 'CANCELLED') {
      return order.status === 'Cancelled';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#140204] text-white selection:bg-rose-500/30">
      {/* Header */}
      <section className="relative overflow-hidden pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-rose-200 text-xs font-semibold mb-2">
              <Printer className="w-3.5 h-3.5 text-rose-300" />
              <span>Gia Công & Sản Xuất Thực Tế</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Đơn Hàng In 3D Của Tôi
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/70 mt-1">
              Theo dõi quy trình kiểm duyệt, gia công máy in 3D công nghiệp và giao nhận thành phẩm.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/create')}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo mô hình mới</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {actionNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/10">
          {(
            [
              { id: 'ALL', label: 'Tất cả đơn' },
              { id: 'ACTIVE', label: 'Đang in & Xử lý' },
              { id: 'SHIPPED', label: 'Đang giao hàng' },
              { id: 'DELIVERED', label: 'Đã giao thành công' },
              { id: 'CANCELLED', label: 'Đã hủy' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white/[0.05] hover:bg-white/10 text-rose-100/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-rose-500/30 border-t-rose-400 rounded-full animate-spin" />
            <p className="text-sm text-rose-100/60 font-medium">Đang tải lịch sử đơn hàng...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-white font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchOrders}
              className="px-4 py-1.5 text-xs font-semibold bg-rose-600 rounded-xl"
            >
              Tải lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 rounded-3xl bg-white/[0.03] border border-white/10 text-center space-y-4 p-8">
            <Box className="w-14 h-14 text-rose-300/40 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Chưa có đơn hàng in 3D nào</h3>
              <p className="text-xs text-rose-100/60 max-w-sm mx-auto">
                Hãy chuyển ý tưởng hoặc hình ảnh của bạn thành mô hình 3D thực tế chỉ với một cú nhấp chuột.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all cursor-pointer"
            >
              Bắt đầu tạo mô hình
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const cfg = statusConfig[order.status] || statusConfig.Created;
              const StatusIcon = cfg.icon;
              const canCancel = order.status === 'Created';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white/[0.04] border border-white/12 p-5 sm:p-6 backdrop-blur-xl space-y-4 hover:border-white/25 transition-all"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-200">Mã đơn:</span>
                        <span className="text-sm font-extrabold text-white tracking-wide">
                          {order.orderCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-100/60">
                        Ngày đặt: {formatDateTime(order.createdAtUtc)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.text}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </div>

                      {order.trackingNumber && (
                        <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                          Mã vận đơn: {order.trackingNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Body */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* 3D Specs */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5" />
                        <span>Thông số mẫu phẩm</span>
                      </h4>
                      <div className="text-xs text-rose-100/80 space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                        <p>Chất liệu: <strong className="text-white">{order.material}</strong></p>
                        <p>Kích thước: <strong className="text-white">
                          {order.dimensions?.widthMm ?? 0} x {order.dimensions?.heightMm ?? 0} x {order.dimensions?.depthMm ?? 0} mm
                        </strong></p>
                        <p>Số lượng: <strong className="text-white">{order.quantity} cái</strong></p>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Địa chỉ nhận hàng</span>
                      </h4>
                      <div className="text-xs text-rose-100/80 space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                        <p className="font-semibold text-white">{order.receiverName} - {order.receiverPhone}</p>
                        <p className="line-clamp-2 text-rose-100/70">
                          {order.streetAddress}, {order.district}, {order.city}
                        </p>
                        {order.customerNote && (
                          <p className="text-[11px] text-amber-300/80 italic">Ghi chú: {order.customerNote}</p>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-rose-200">Thanh toán</h4>
                        <div className="text-xs text-rose-100/80 space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between">
                            <span>Đơn giá:</span>
                            <span className="text-white">{formatVnd(order.unitPriceVnd)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Phí giao hàng:</span>
                            <span className="text-emerald-400">
                              {order.shippingFeeVnd === 0 ? 'Miễn phí' : formatVnd(order.shippingFeeVnd)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-white/10">
                            <span>Tổng tiền:</span>
                            <span className="text-rose-400">{formatVnd(order.totalVnd)}</span>
                          </div>
                        </div>
                      </div>

                      {canCancel && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={cancellingOrderId === order.id}
                            onClick={() => handleCancel(order.id)}
                            className="px-3.5 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                          >
                            {cancellingOrderId === order.id ? 'Đang hủy...' : 'Hủy đơn hàng'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
