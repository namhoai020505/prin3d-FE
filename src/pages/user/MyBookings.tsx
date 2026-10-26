import { useEffect, useState, useMemo } from 'react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  AlertCircle,
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Loader2,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import {
  cancelOrderV2,
  listOrders,
  getOrderById,
  type OrderItem,
  type OrderV2Dto,
  type CancelOrderResult,
} from '../../services/orderService';
import {
  fulfillmentService,
  type FulfillmentTimelineDto,
} from '../../services/fulfillmentService';
import { DefectReportModal } from '../../components/DefectReportModal';
import logoTheBoy from '../../assets/LOGOTheBoy.png';
import TiltCard from '../../components/ui/TiltCard';

type FilterTab = 'ALL' | 'UNPAID' | 'PRODUCTION' | 'SHIPPING_DELIVERED' | 'CANCELLED_REFUND';

export default function MyBookings() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [v2DetailsMap, setV2DetailsMap] = useState<Record<string, OrderV2Dto>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Notification state
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Expanded timelines state
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [timelinesMap, setTimelinesMap] = useState<Record<string, FulfillmentTimelineDto>>({});
  const [loadingTimelineIds, setLoadingTimelineIds] = useState<Set<string>>(new Set());

  // 2-Phase Cancellation Modal State
  const [cancellationTarget, setCancellationTarget] = useState<{
    order: OrderItem;
    v2?: OrderV2Dto;
  } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  // 7-Day Defect Report Modal State
  const [defectTarget, setDefectTarget] = useState<{
    orderId: string;
    orderCode: string;
    deliveredAtUtc?: string | null;
  } | null>(null);

  // Fetch orders and enrich with V2 details
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listOrders();
      setOrders(data);

      // Parallel fetch V2 details for all orders
      const v2Results = await Promise.allSettled(
        data.map((o) => getOrderById(o.id))
      );

      const map: Record<string, OrderV2Dto> = {};
      v2Results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.id) {
          map[res.value.id] = res.value;
        }
      });
      setV2DetailsMap(map);
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
        if (!isMounted) return;
        setOrders(data);

        const v2Results = await Promise.allSettled(
          data.map((o) => getOrderById(o.id))
        );
        if (!isMounted) return;

        const map: Record<string, OrderV2Dto> = {};
        v2Results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value?.id) {
            map[res.value.id] = res.value;
          }
        });
        setV2DetailsMap(map);
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

  // Toggle Timeline expansion & lazy-load timeline data
  const handleToggleTimeline = async (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });

    if (!timelinesMap[orderId] && !loadingTimelineIds.has(orderId)) {
      setLoadingTimelineIds((prev) => new Set(prev).add(orderId));
      try {
        const timeline = await fulfillmentService.getOrderTimeline(orderId);
        setTimelinesMap((prev) => ({ ...prev, [orderId]: timeline }));
      } catch (err) {
        console.warn('Không thể tải timeline chi tiết cho đơn', orderId, err);
      } finally {
        setLoadingTimelineIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    }
  };

  // 2-Phase Cancellation Handlers
  const handleOpenCancelModal = (order: OrderItem) => {
    setCancellationTarget({ order, v2: v2DetailsMap[order.id] });
    setCancellationReason('');
    setCancellationError(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationTarget) return;
    if (cancellationReason.trim().length < 5) {
      setCancellationError('Vui lòng nhập lý do hủy đơn ít nhất 5 ký tự.');
      return;
    }

    setIsCancelling(true);
    setCancellationError(null);

    try {
      const res: CancelOrderResult = await cancelOrderV2(
        cancellationTarget.order.id,
        cancellationReason.trim()
      );

      if (res.cancellationStatus === 'CancelledDirectly') {
        setActionNotice({
          type: 'success',
          message: `Đơn hàng #${res.orderCode} chưa thanh toán đã được hủy tức thì thành công.`,
        });
      } else if (res.cancellationStatus === 'PendingReview') {
        setActionNotice({
          type: 'warning',
          message: `Yêu cầu hủy đơn hàng #${res.orderCode} đã được ghi nhận và gửi đến Quản trị viên để xét duyệt hoàn tiền.`,
        });
      } else {
        setActionNotice({
          type: 'info',
          message: `Đã cập nhật trạng thái hủy đơn hàng #${res.orderCode}.`,
        });
      }

      setCancellationTarget(null);
      setTimeout(() => setActionNotice(null), 6000);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thực hiện hủy đơn lúc này.';
      setCancellationError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatVnd = (amount: number) => amount.toLocaleString('vi-VN') + ' đ';

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  // Badges & helpers
  const getPaymentBadge = (paymentStatus?: string) => {
    const norm = (paymentStatus || 'Unpaid').toLowerCase();
    if (norm === 'paid') {
      return {
        label: 'Đã thanh toán',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }
    if (norm === 'refundpending') {
      return {
        label: 'Chờ hoàn tiền',
        color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        icon: RotateCcw,
      };
    }
    if (norm === 'refunded') {
      return {
        label: 'Đã hoàn tiền',
        color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        icon: CheckCircle2,
      };
    }
    if (norm === 'partiallyrefunded') {
      return {
        label: 'Hoàn tiền 1 phần',
        color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        icon: CheckCircle2,
      };
    }
    if (norm === 'needsattention') {
      return {
        label: 'Cần chú ý',
        color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        icon: AlertCircle,
      };
    }
    return {
      label: 'Chờ thanh toán',
      color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      icon: Clock,
    };
  };

  const getFulfillmentBadge = (status?: string) => {
    const s = status || 'PendingPayment';
    switch (s) {
      case 'PendingPayment':
        return { label: 'Chờ thanh toán', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: Clock };
      case 'AwaitingAssignment':
        return { label: 'Chờ gán xưởng in', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30', icon: Clock };
      case 'Assigned':
        return { label: 'Đã nhận lệnh in', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30', icon: Box };
      case 'Printing':
      case 'PrintingStarted':
        return { label: 'Đang in 3D', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse', icon: Printer };
      case 'PostProcessing':
        return { label: 'Hậu kỳ & Xử lý bề mặt', color: 'bg-teal-500/10 text-teal-300 border-teal-500/30', icon: Layers };
      case 'QualityCheck':
        return { label: 'Kiểm định QC', color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30', icon: ShieldAlert };
      case 'Packaged':
        return { label: 'Đã đóng gói', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30', icon: Package };
      case 'InTransit':
      case 'Shipping':
      case 'Shipped':
        return { label: 'Đang vận chuyển', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30', icon: Truck };
      case 'Delivered':
        return { label: 'Đã giao thành công', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 };
      case 'Cancelled':
        return { label: 'Đã hủy đơn', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: XCircle };
      default:
        return { label: s, color: 'bg-white/10 text-white/80 border-white/20', icon: Clock };
    }
  };

  const getStepperCurrentStep = (paymentStatus: string, fulfillmentStatus: string): number => {
    if (fulfillmentStatus === 'Cancelled') return -1;
    if (fulfillmentStatus === 'Delivered') return 6;
    if (['InTransit', 'Shipping', 'Shipped'].includes(fulfillmentStatus)) return 5;
    if (['Printing', 'PrintingStarted', 'PostProcessing', 'QualityCheck', 'Packaged'].includes(fulfillmentStatus)) return 4;
    if (['Assigned', 'AwaitingAssignment'].includes(fulfillmentStatus)) return 3;
    if (paymentStatus.toLowerCase() === 'paid') return 2;
    return 1;
  };

  const STEPPER_STAGES = [
    { step: 1, label: 'Khởi tạo đơn' },
    { step: 2, label: 'Đã thanh toán' },
    { step: 3, label: 'Phân bổ xưởng' },
    { step: 4, label: 'Gia công & QC' },
    { step: 5, label: 'Vận chuyển' },
    { step: 6, label: 'Đã giao hàng' },
  ];

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const v2 = v2DetailsMap[order.id];
      const pStatus = (v2?.orderPaymentStatus || (order.status === 'Created' ? 'Unpaid' : 'Paid')).toLowerCase();
      const fStatus = v2?.fulfillmentStatus || order.status;

      if (activeTab === 'UNPAID') {
        return pStatus === 'unpaid' && fStatus !== 'Cancelled';
      }
      if (activeTab === 'PRODUCTION') {
        return ['AwaitingAssignment', 'Assigned', 'Printing', 'PrintingStarted', 'PostProcessing', 'QualityCheck', 'Packaged'].includes(fStatus);
      }
      if (activeTab === 'SHIPPING_DELIVERED') {
        return ['InTransit', 'Shipping', 'Shipped', 'Delivered'].includes(fStatus);
      }
      if (activeTab === 'CANCELLED_REFUND') {
        return fStatus === 'Cancelled' || ['refundpending', 'refunded', 'partiallyrefunded'].includes(pStatus);
      }
      return true;
    });
  }, [orders, v2DetailsMap, activeTab]);

  return (
    <div className="min-h-screen bg-[#090D14] text-white selection:bg-cyan-500/30">
      {/* Top Banner Header */}
      <section className="relative overflow-hidden pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Theo Dõi Đơn Hàng & Vận Hành V2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <img src={logoTheBoy} alt="Idea2Model Logo" className="w-8 h-8 object-contain drop-shadow" />
              <span>Đơn Hàng In 3D Của Tôi</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-2xl">
              Giám sát 2 trục trạng thái Thanh toán & Sản xuất, lịch sử xưởng in đối tác, vận đơn theo thời gian thực và khiếu nại bảo hành trong 7 ngày.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="btn-pooled-cyan px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black flex items-center gap-2 cursor-pointer shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Tạo mô hình mới</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Action Notice */}
        {actionNotice && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
              actionNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : actionNotice.type === 'warning'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {actionNotice.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
              {actionNotice.type === 'info' && <Clock className="w-4 h-4 text-cyan-400 shrink-0" />}
              <span>{actionNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="p-1 text-white/50 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 5 Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/10">
          {(
            [
              { id: 'ALL', label: 'Tất cả đơn' },
              { id: 'UNPAID', label: 'Chờ thanh toán' },
              { id: 'PRODUCTION', label: 'Đang sản xuất' },
              { id: 'SHIPPING_DELIVERED', label: 'Vận chuyển & Đã giao' },
              { id: 'CANCELLED_REFUND', label: 'Đã hủy & Hoàn tiền' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50'
                  : 'bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders State Views */}
        {isLoading && orders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm text-cyan-100/70 font-medium">Đang tải dữ liệu đơn hàng và trục vận hành...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-[#0c1017] border border-rose-500/30 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-white font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchOrders}
              className="px-4 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 rounded-3xl bg-[#0c1017]/90 border border-white/10 text-center space-y-4 p-8">
            <Box className="w-14 h-14 text-cyan-400/40 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Không có đơn hàng nào trong mục này</h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                Hiện không có đơn hàng nào khớp với bộ lọc đã chọn. Hãy tạo một mẫu in 3D mới cùng AI Studio!
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="btn-pooled-cyan px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black transition-all cursor-pointer"
            >
              Bắt đầu tạo mô hình
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const v2 = v2DetailsMap[order.id];
              const pStatus = v2?.orderPaymentStatus || (order.status === 'Created' ? 'Unpaid' : 'Paid');
              const fStatus = v2?.fulfillmentStatus || order.status;

              const paymentBadge = getPaymentBadge(pStatus);
              const fulfillmentBadge = getFulfillmentBadge(fStatus);
              const PaymentIcon = paymentBadge.icon;
              const FulfillmentIcon = fulfillmentBadge.icon;

              const currentStep = getStepperCurrentStep(pStatus, fStatus);
              const isExpanded = expandedOrderIds.has(order.id);
              const timeline = timelinesMap[order.id];
              const isLoadingTimeline = loadingTimelineIds.has(order.id);

              // Action conditions
              const isUnpaid = pStatus.toLowerCase() === 'unpaid' && fStatus !== 'Cancelled';
              const canCancel = fStatus !== 'Delivered' && fStatus !== 'Cancelled';
              const canDefect = ['Delivered', 'Shipped', 'InTransit', 'Shipping'].includes(fStatus) && fStatus !== 'Cancelled';

              return (
                <TiltCard
                  key={order.id}
                  maxTilt={2.5}
                  perspective={1200}
                  scale={1.008}
                  className="rounded-2xl bg-gradient-to-b from-[#0d1422]/90 via-[#0a0f1a]/92 to-[#070a13]/96 border border-white/10 hover:border-cyan-500/40 p-5 sm:p-6 backdrop-blur-2xl space-y-5 transition-all shadow-[0_16px_45px_rgba(0,0,0,0.75),0_0_25px_rgba(0,240,255,0.06),inset_0_1px_1px_rgba(255,255,255,0.12)]"
                >
                  {/* Top Bar: Code, Date & Dual-Axis Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Mã đơn:</span>
                        <span className="text-base font-black text-cyan-400 font-mono tracking-wide">
                          #{order.orderCode}
                        </span>
                        {v2?.quoteId && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">
                            Quote: {v2.quoteId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50">
                        Thời gian tạo: {formatDateTime(order.createdAtUtc)}
                      </p>
                    </div>

                    {/* Dual-Axis Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Payment Axis Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${paymentBadge.color}`}
                        title="Trục Trạng Thái Thanh Toán"
                      >
                        <PaymentIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Thanh toán: {paymentBadge.label}</span>
                      </div>

                      {/* Fulfillment Axis Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${fulfillmentBadge.color}`}
                        title="Trục Trạng Thái Vận Hành & Sản Xuất"
                      >
                        <FulfillmentIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Vận hành: {fulfillmentBadge.label}</span>
                      </div>

                      {/* Tracking Number pill if available */}
                      {(order.trackingNumber || timeline?.trackingNumber) && (
                        <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Vận đơn: {order.trackingNumber || timeline?.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6-Step Visual Stepper */}
                  <div className="bg-black/25 rounded-xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-white/70">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Tiến trình hoàn thiện đơn hàng:</span>
                      </span>
                      {currentStep === -1 ? (
                        <span className="text-xs font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                          Đơn hàng đã hủy
                        </span>
                      ) : (
                        <span className="text-xs text-white/50">
                          Bước {currentStep}/6
                        </span>
                      )}
                    </div>

                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                      {STEPPER_STAGES.map((st) => {
                        const isPast = currentStep > st.step;
                        const isCurrent = currentStep === st.step;
                        const isCancelled = currentStep === -1;

                        let stageColor = 'border-white/10 bg-white/[0.02] text-white/40';
                        if (isCancelled) {
                          stageColor = 'border-white/5 bg-white/[0.01] text-white/20';
                        } else if (isPast) {
                          stageColor = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300';
                        } else if (isCurrent) {
                          stageColor = 'border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-md shadow-cyan-950/50';
                        }

                        return (
                          <div
                            key={st.step}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${stageColor}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {isPast ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : isCurrent ? (
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-white/20" />
                              )}
                              <span className="text-[11px] font-mono font-bold">#{st.step}</span>
                            </div>
                            <span className="text-xs font-semibold leading-tight line-clamp-1">
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Specs / Items Snapshot */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Mẫu in & Thông số kỹ thuật</span>
                      </h4>
                      <div className="text-xs text-white/80 space-y-1.5 bg-black/30 p-3.5 rounded-xl border border-white/5">
                        <div className="flex justify-between">
                          <span className="text-white/50">Vật liệu:</span>
                          <strong className="text-white font-mono">{order.material}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Kích thước:</span>
                          <strong className="text-white font-mono">
                            {order.dimensions?.widthMm ?? 0} x {order.dimensions?.depthMm ?? 0} x {order.dimensions?.heightMm ?? 0} mm
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Số lượng:</span>
                          <strong className="text-cyan-300 font-mono">{order.quantity} cái</strong>
                        </div>
                        {v2?.items && v2.items.length > 0 && (
                          <div className="pt-1.5 border-t border-white/5 text-[11px] text-white/60">
                            {v2.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between py-0.5">
                                <span>Phiên bản: #{item.lineNumber}</span>
                                <span className="font-mono text-white/80">{item.heightMm}mm</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Thông tin giao nhận</span>
                      </h4>
                      <div className="text-xs text-white/80 space-y-1.5 bg-black/30 p-3.5 rounded-xl border border-white/5">
                        <p className="font-bold text-white flex items-center gap-1.5">
                          <span>{order.receiverName}</span>
                          <span className="text-white/40">•</span>
                          <span className="font-mono text-cyan-300">{order.receiverPhone}</span>
                        </p>
                        <p className="text-white/70 line-clamp-2 leading-relaxed">
                          {order.streetAddress}, {order.district}, {order.city}
                        </p>
                        {order.customerNote && (
                          <p className="text-[11px] text-amber-300/90 italic pt-1 border-t border-white/5">
                            Ghi chú: {order.customerNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price & Summary */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Chi phí thanh toán</span>
                        </h4>
                        <div className="text-xs text-white/80 space-y-1.5 bg-black/30 p-3.5 rounded-xl border border-white/5">
                          <div className="flex justify-between">
                            <span className="text-white/50">Đơn giá in:</span>
                            <span className="text-white font-mono">{formatVnd(order.unitPriceVnd)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Phí vận chuyển:</span>
                            <span className="text-emerald-400 font-mono">
                              {order.shippingFeeVnd === 0 ? 'Miễn phí' : formatVnd(order.shippingFeeVnd)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-white pt-1.5 border-t border-white/10">
                            <span>Tổng cộng:</span>
                            <span className="text-cyan-400 font-mono text-base">{formatVnd(order.totalVnd)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Timeline Section */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-white/10 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
                          <Printer className="w-4 h-4 text-cyan-400" />
                          <span>Dòng thời gian sản xuất & Vận chuyển chi tiết (Timeline V2)</span>
                        </h4>
                        {isLoadingTimeline && (
                          <div className="flex items-center gap-2 text-xs text-cyan-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang đồng bộ dữ liệu xưởng...</span>
                          </div>
                        )}
                      </div>

                      {timeline ? (
                        <div className="space-y-4 text-xs">
                          {/* Partner Lab Assignment */}
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                            <div className="flex items-center justify-between font-semibold text-white">
                              <span className="text-cyan-300 flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Xưởng in gia công tiếp nhận:</span>
                              </span>
                              <span className="font-mono text-white/80">
                                {timeline.assignments?.[0]?.labName || timeline.assignments?.[0]?.partnerLabName || 'The Boys Smart 3D Hub'}
                              </span>
                            </div>
                            {timeline.assignments?.[0] && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-white/60 pt-1">
                                <div>
                                  <span>Trạng thái xưởng: </span>
                                  <strong className="text-white">{timeline.assignments[0].status}</strong>
                                </div>
                                <div>
                                  <span>Ngày giao việc: </span>
                                  <strong className="text-white">{formatDateTime(timeline.assignments[0].assignedAtUtc || timeline.assignments[0].createdAtUtc)}</strong>
                                </div>
                                <div>
                                  <span>Hạn giao hàng: </span>
                                  <strong className="text-white">{formatDateTime(timeline.assignments[0].dueAtUtc)}</strong>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Production Runs */}
                          {timeline.assignments?.[0]?.productionRuns && timeline.assignments[0].productionRuns.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Nhật ký các đợt in 3D:</span>
                              </span>
                              <div className="space-y-2 pt-1">
                                {timeline.assignments[0].productionRuns.map((run) => (
                                  <div key={run.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="font-bold text-white">Đợt in #{run.runNo ?? 1} ({run.status})</span>
                                      <span className="text-white/50">{formatDateTime(run.startedAtUtc)}</span>
                                    </div>
                                    {run.qcNote && (
                                      <p className="text-[11px] text-amber-300/80">QC Note: {run.qcNote}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shipments with Tracking Events */}
                          {timeline.shipments && timeline.shipments.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Hành trình bưu phẩm & Vận đơn:</span>
                              </span>
                              {timeline.shipments.map((ship) => (
                                <div key={ship.id} className="space-y-2 pt-1">
                                  <div className="flex flex-wrap items-center justify-between text-[11px] p-2 rounded bg-black/30 border border-white/5">
                                    <span>Đơn vị giao: <strong className="text-white">{ship.carrier}</strong></span>
                                    <span className="font-mono text-cyan-300 font-bold">Mã: {ship.trackingNumber}</span>
                                    <span>Xuất kho: <strong className="text-white">{formatDateTime(ship.shippedAtUtc || ship.createdAtUtc)}</strong></span>
                                  </div>
                                  {ship.events && ship.events.length > 0 && (
                                    <div className="pl-3 border-l-2 border-cyan-500/30 space-y-2">
                                      {ship.events.map((ev, idx) => (
                                        <div key={idx} className="text-[11px] space-y-0.5">
                                          <div className="flex justify-between text-white/70">
                                            <span className="font-semibold text-white">{ev.status}</span>
                                            <span className="text-white/40">{formatDateTime(ev.occurredAtUtc)}</span>
                                          </div>
                                          {ev.note && <p className="text-white/60">{ev.note}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Defect Reports (if any) */}
                          {timeline.defectReports && timeline.defectReports.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                <span>Hồ sơ khiếu nại bảo hành đã gửi:</span>
                              </span>
                              {timeline.defectReports.map((def) => (
                                <div key={def.id} className="p-2.5 rounded-lg bg-black/30 border border-rose-500/20 space-y-1 text-[11px]">
                                  <div className="flex justify-between font-bold">
                                    <span className="text-rose-200">Trạng thái: {def.status}</span>
                                    <span className="text-white/40">{formatDateTime(def.createdAtUtc)}</span>
                                  </div>
                                  <p className="text-white/80">Lý do: {def.reason}</p>
                                  {def.resolutionNote && (
                                    <p className="text-emerald-300">Phản hồi BQT: {def.resolutionNote}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : !isLoadingTimeline ? (
                        <p className="text-xs text-white/40 italic">Chưa có thông tin cập nhật bổ sung từ xưởng.</p>
                      ) : null}
                    </div>
                  )}

                  {/* Action Bar (Pay Now, Cancel, Defect Report, Toggle Timeline) */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleToggleTimeline(order.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Thu gọn tiến độ' : 'Xem tiến độ chi tiết'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Defect Report 7-day Button */}
                      {canDefect && (
                        <button
                          type="button"
                          onClick={() =>
                            setDefectTarget({
                              orderId: order.id,
                              orderCode: order.orderCode,
                              deliveredAtUtc: order.deliveredAtUtc || timeline?.shipments?.[0]?.deliveredAtUtc,
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Khiếu nại sản phẩm lỗi</span>
                        </button>
                      )}

                      {/* Cancel Order 2-Phase Button */}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(order)}
                          className="px-3.5 py-1.5 rounded-xl border border-white/15 text-white/60 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Hủy đơn hàng
                        </button>
                      )}

                      {/* Pay Now Button (Unpaid orders) */}
                      {isUnpaid && (
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${order.id}/checkout-return`)}
                          className="btn-pooled-cyan px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                        >
                          <span>Thanh toán ngay</span>
                          <ArrowRight className="w-3.5 h-3.5 text-black" />
                        </button>
                      )}
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}
      </div>

      {/* 2-Phase Cancellation Modal */}
      {cancellationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#090D14]/95 border border-white/20 text-white shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Xác Nhận Hủy Đơn #{cancellationTarget.order.orderCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellationTarget(null)}
                className="p-1.5 text-white/50 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Banner for 2 phases */}
            {(() => {
              const pStatus = (
                cancellationTarget.v2?.orderPaymentStatus ||
                (cancellationTarget.order.status === 'Created' ? 'Unpaid' : 'Paid')
              ).toLowerCase();

              const isPaid = pStatus === 'paid' || pStatus === 'refundpending';

              return isPaid ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Đơn hàng đã thanh toán qua PayOS</span>
                  </p>
                  <p className="text-white/70 leading-relaxed">
                    Yêu cầu hủy sẽ được chuyển sang bộ phận Quản trị để xét duyệt và thực hiện lệnh hoàn tiền theo chính sách.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Đơn hàng chưa thanh toán</span>
                  </p>
                  <p className="text-white/70 leading-relaxed">
                    Đơn hàng sẽ được hủy trực tiếp ngay lập tức mà không phát sinh thêm chi phí nào.
                  </p>
                </div>
              );
            })()}

            {cancellationError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cancellationError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/90">
                Lý do hủy đơn hàng <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn (tối thiểu 5 ký tự)..."
                className="w-full rounded-xl bg-[#0B0F17] border border-white/10 focus:border-cyan-400 p-3 text-xs text-white placeholder-white/30 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellationTarget(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling || cancellationReason.trim().length < 5}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác nhận hủy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Defect Report Modal */}
      {defectTarget && (
        <DefectReportModal
          isOpen={true}
          orderId={defectTarget.orderId}
          orderCode={defectTarget.orderCode}
          deliveredAtUtc={defectTarget.deliveredAtUtc}
          onClose={() => setDefectTarget(null)}
          onSuccess={() => {
            fetchOrders();
            setActionNotice({
              type: 'success',
              message: `Đã gửi hồ sơ khiếu nại sản phẩm lỗi cho đơn #${defectTarget.orderCode}. Ban Quản trị sẽ phản hồi trong 24h.`,
            });
            setTimeout(() => setActionNotice(null), 6000);
          }}
        />
      )}
    </div>
  );
}
