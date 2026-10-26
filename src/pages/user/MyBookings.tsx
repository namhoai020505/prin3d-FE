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
        const tl = await fulfillmentService.getOrderTimeline(orderId);
        setTimelinesMap((prev) => ({ ...prev, [orderId]: tl }));
      } catch {
        // Fallback silently if timeline has no events yet
      } finally {
        setLoadingTimelineIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    }
  };

  const handleOpenCancelModal = (order: OrderItem) => {
    const v2 = v2DetailsMap[order.id];
    setCancellationTarget({ order, v2 });
    setCancellationReason('');
    setCancellationError(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationTarget) return;
    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      setCancellationError('Vui lòng nhập lý do hủy đơn (tối thiểu 5 ký tự).');
      return;
    }

    setIsCancelling(true);
    setCancellationError(null);

    try {
      const res: CancelOrderResult = await cancelOrderV2(
        cancellationTarget.order.id,
        cancellationReason.trim()
      );

      setCancellationTarget(null);

      if (res.cancellationStatus === 'CancelledDirectly' || res.fulfillmentStatus === 'Cancelled') {
        setActionNotice({
          type: 'success',
          message: `Đơn hàng #${cancellationTarget.order.orderCode} đã được hủy thành công.`,
        });
      } else {
        setActionNotice({
          type: 'info',
          message: `Yêu cầu hủy đơn #${cancellationTarget.order.orderCode} đã được gửi và đang chờ Ban Quản trị phê duyệt hoàn tiền.`,
        });
      }

      await fetchOrders();
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Không thể thực hiện hủy đơn lúc này.';
      setCancellationError(errorMsg);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatVnd = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Badges & helpers in Light Wabi-Sabi palette
  const getPaymentBadge = (paymentStatus?: string) => {
    const norm = (paymentStatus || 'Unpaid').toLowerCase();
    if (norm === 'paid') {
      return {
        label: 'Đã thanh toán',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
      };
    }
    if (norm === 'refundpending') {
      return {
        label: 'Chờ hoàn tiền',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: RotateCcw,
      };
    }
    if (norm === 'refunded' || norm === 'partiallyrefunded') {
      return {
        label: norm === 'refunded' ? 'Đã hoàn tiền' : 'Hoàn tiền 1 phần',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: CheckCircle2,
      };
    }
    if (norm === 'needsattention') {
      return {
        label: 'Cần chú ý',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertCircle,
      };
    }
    return {
      label: 'Chờ thanh toán',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    };
  };

  const getFulfillmentBadge = (status?: string) => {
    const s = status || 'PendingPayment';
    switch (s) {
      case 'PendingPayment':
        return { label: 'Chờ thanh toán', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock };
      case 'AwaitingAssignment':
        return { label: 'Chờ gán xưởng in', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock };
      case 'Assigned':
        return { label: 'Đã nhận lệnh in', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Box };
      case 'Printing':
      case 'PrintingStarted':
        return { label: 'Đang in 3D', color: 'bg-[#FDF2F0] text-[#B83B2A] border-[#B83B2A]/30', icon: Printer };
      case 'PostProcessing':
        return { label: 'Hậu kỳ & Xử lý bề mặt', color: 'bg-[#FDF2F0] text-[#B83B2A] border-[#B83B2A]/30', icon: Layers };
      case 'QualityCheck':
        return { label: 'Kiểm định QC', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShieldAlert };
      case 'Packaged':
        return { label: 'Đã đóng gói', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Package };
      case 'InTransit':
      case 'Shipping':
      case 'Shipped':
        return { label: 'Đang vận chuyển', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Truck };
      case 'Delivered':
        return { label: 'Đã giao thành công', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'Cancelled':
        return { label: 'Đã hủy đơn', color: 'bg-stone-100 text-stone-600 border-stone-200', icon: XCircle };
      default:
        return { label: s, color: 'bg-[#EFEAE2] text-[#231F1E] border-[#E2D9D0]', icon: Clock };
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

  const FILTER_TABS = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'UNPAID', label: 'Chờ thanh toán' },
    { id: 'PRODUCTION', label: 'Đang in' },
    { id: 'SHIPPING_DELIVERED', label: 'Giao hàng' },
    { id: 'CANCELLED_REFUND', label: 'Đã hủy' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-[#231F1E]">
      {/* Top Banner Header */}
      <section className="relative overflow-hidden pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-[#E2D9D0] bg-[#FFFFFF]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#231F1E] flex items-center gap-3">
              <img src={logoTheBoy} alt="Idea2Model Logo" className="w-8 h-8 object-contain" />
              <span>Đơn Hàng In 3D Của Tôi</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#B83B2A]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-5 py-2.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
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
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : actionNotice.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {actionNotice.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              {actionNotice.type === 'info' && <Clock className="w-4 h-4 text-blue-600 shrink-0" />}
              <span>{actionNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="p-1 text-[#7A706C] hover:text-[#231F1E] rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 5 Filter Tabs with Vermilion Red Pill */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-[#E2D9D0]">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#B83B2A] text-white shadow-sm font-bold'
                  : 'bg-[#FFFFFF] hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E] border border-[#E2D9D0] font-semibold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders State Views */}
        {isLoading && orders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#B83B2A]" />
            <p className="text-xs text-[#7A706C] font-medium">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-rose-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchOrders}
              className="px-4 py-1.5 text-xs font-semibold bg-[#F6F3EE] hover:bg-[#EFEAE2] text-[#231F1E] rounded-xl border border-[#E2D9D0] transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] text-center space-y-4 p-8 shadow-sm">
            <Box className="w-12 h-12 text-[#7A706C]/40 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#231F1E]">Không có đơn hàng nào trong mục này</h3>
              <p className="text-xs text-[#7A706C] max-w-sm mx-auto">
                Hiện không có đơn hàng nào khớp với bộ lọc đã chọn. Hãy tạo mẫu in 3D mới cùng AI Studio!
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-5 py-2 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              Bắt đầu tạo mô hình
            </button>
          </div>
        ) : (
          <div className="space-y-5">
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
                <div
                  key={order.id}
                  className="rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] p-5 sm:p-6 shadow-sm space-y-5 text-[#231F1E] transition-all hover:border-[#B83B2A]/40"
                >
                  {/* Top Bar: Code, Date & Dual-Axis Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2D9D0]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#7A706C]">Mã đơn:</span>
                        <span className="text-base font-extrabold text-[#B83B2A] font-mono">
                          #{order.orderCode}
                        </span>
                        {v2?.quoteId && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#F6F3EE] border border-[#E2D9D0] text-[#7A706C] font-mono">
                            Báo giá: {v2.quoteId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#7A706C]">
                        Thời gian tạo: {formatDateTime(order.createdAtUtc)}
                      </p>
                    </div>

                    {/* Dual-Axis Badges */}
                    <div className="flex flex-wrap items-center gap-2">
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

                      {/* Tracking Number pill */}
                      {(order.trackingNumber || timeline?.trackingNumber) && (
                        <div className="px-2.5 py-1 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] text-[#231F1E] text-xs font-mono font-semibold flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#B83B2A]" />
                          <span>Vận đơn: {order.trackingNumber || timeline?.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6-Step Visual Stepper */}
                  <div className="bg-[#F6F3EE] rounded-xl p-4 border border-[#E2D9D0] space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#231F1E]">
                      <span className="flex items-center gap-1.5 text-[#B83B2A]">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Tiến trình hoàn thiện đơn hàng:</span>
                      </span>
                      {currentStep === -1 ? (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Đơn hàng đã hủy
                        </span>
                      ) : (
                        <span className="text-xs text-[#7A706C]">
                          Bước {currentStep}/6
                        </span>
                      )}
                    </div>

                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                      {STEPPER_STAGES.map((st) => {
                        const isPast = currentStep > st.step;
                        const isCurrent = currentStep === st.step;
                        const isCancelled = currentStep === -1;

                        let stageColor = 'border-[#E2D9D0] bg-[#FFFFFF] text-[#7A706C]';
                        if (isCancelled) {
                          stageColor = 'border-[#E2D9D0] bg-[#EFEAE2]/50 text-[#7A706C]/50';
                        } else if (isPast) {
                          stageColor = 'border-emerald-200 bg-emerald-50 text-emerald-800';
                        } else if (isCurrent) {
                          stageColor = 'border-[#B83B2A] bg-[#FDF2F0] text-[#B83B2A] ring-1 ring-[#B83B2A]/30 font-bold';
                        }

                        return (
                          <div
                            key={st.step}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${stageColor}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {isPast ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : isCurrent ? (
                                <div className="w-2 h-2 rounded-full bg-[#B83B2A]" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-[#E2D9D0]" />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Specs / Items Snapshot */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-[#231F1E] flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-[#B83B2A]" />
                        <span>Mẫu in &amp; Thông số</span>
                      </h4>
                      <div className="text-xs text-[#231F1E] space-y-1.5 bg-[#F6F3EE] p-3.5 rounded-xl border border-[#E2D9D0]">
                        <div className="flex justify-between">
                          <span className="text-[#7A706C]">Vật liệu:</span>
                          <strong className="font-mono">{order.material}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A706C]">Kích thước:</span>
                          <strong className="font-mono">
                            {order.dimensions?.widthMm ?? 0}×{order.dimensions?.depthMm ?? 0}×{order.dimensions?.heightMm ?? 0} mm
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A706C]">Số lượng:</span>
                          <strong className="text-[#B83B2A] font-mono">{order.quantity} cái</strong>
                        </div>
                        {v2?.items && v2.items.length > 0 && (
                          <div className="pt-1.5 border-t border-[#E2D9D0] text-[11px] text-[#7A706C]">
                            {v2.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between py-0.5">
                                <span>Phiên bản: #{item.lineNumber}</span>
                                <span className="font-mono text-[#231F1E]">{item.heightMm}mm</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-[#231F1E] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#B83B2A]" />
                        <span>Địa chỉ giao hàng</span>
                      </h4>
                      <div className="text-xs text-[#231F1E] space-y-1.5 bg-[#F6F3EE] p-3.5 rounded-xl border border-[#E2D9D0]">
                        <p className="font-bold text-[#231F1E] flex items-center gap-1.5">
                          <span>{order.receiverName}</span>
                          <span className="text-[#7A706C]">•</span>
                          <span className="font-mono text-[#B83B2A]">{order.receiverPhone}</span>
                        </p>
                        <p className="text-[#7A706C] line-clamp-2 leading-relaxed">
                          {order.streetAddress}, {order.district}, {order.city}
                        </p>
                        {order.customerNote && (
                          <p className="text-[11px] text-amber-800 italic pt-1 border-t border-[#E2D9D0]">
                            Ghi chú: {order.customerNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price & Summary */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#231F1E] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#B83B2A]" />
                          <span>Chi phí thanh toán</span>
                        </h4>
                        <div className="text-xs text-[#231F1E] space-y-1.5 bg-[#F6F3EE] p-3.5 rounded-xl border border-[#E2D9D0]">
                          <div className="flex justify-between">
                            <span className="text-[#7A706C]">Đơn giá in:</span>
                            <span className="font-mono">{formatVnd(order.unitPriceVnd)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7A706C]">Phí giao hàng:</span>
                            <span className="text-emerald-700 font-mono">
                              {order.shippingFeeVnd === 0 ? 'Miễn phí' : formatVnd(order.shippingFeeVnd)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-[#231F1E] pt-1.5 border-t border-[#E2D9D0]">
                            <span>Tổng cộng:</span>
                            <span className="text-[#B83B2A] font-mono text-base">{formatVnd(order.totalVnd)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Timeline Section */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-[#E2D9D0] space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#231F1E] uppercase tracking-wider flex items-center gap-2">
                          <Printer className="w-4 h-4 text-[#B83B2A]" />
                          <span>Nhật ký xưởng &amp; Vận chuyển chi tiết</span>
                        </h4>
                        {isLoadingTimeline && (
                          <div className="flex items-center gap-2 text-xs text-[#B83B2A]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang tải tiến trình...</span>
                          </div>
                        )}
                      </div>

                      {timeline ? (
                        <div className="space-y-3 text-xs">
                          {/* Partner Lab Assignment */}
                          <div className="p-3.5 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] space-y-2">
                            <div className="flex items-center justify-between font-semibold text-[#231F1E]">
                              <span className="text-[#B83B2A] flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5" />
                                <span>Xưởng in gia công tiếp nhận:</span>
                              </span>
                              <span className="font-mono text-[#231F1E]">
                                {timeline.assignments?.[0]?.labName || timeline.assignments?.[0]?.partnerLabName || 'The Boys Smart 3D Hub'}
                              </span>
                            </div>
                            {timeline.assignments?.[0] && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#7A706C] pt-1">
                                <div>
                                  <span>Trạng thái: </span>
                                  <strong className="text-[#231F1E]">{timeline.assignments[0].status}</strong>
                                </div>
                                <div>
                                  <span>Ngày giao việc: </span>
                                  <strong className="text-[#231F1E]">{formatDateTime(timeline.assignments[0].assignedAtUtc || timeline.assignments[0].createdAtUtc)}</strong>
                                </div>
                                <div>
                                  <span>Hạn giao hàng: </span>
                                  <strong className="text-[#231F1E]">{formatDateTime(timeline.assignments[0].dueAtUtc)}</strong>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Production Runs */}
                          {timeline.assignments?.[0]?.productionRuns && timeline.assignments[0].productionRuns.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] space-y-2">
                              <span className="font-bold text-[#B83B2A] flex items-center gap-1.5">
                                <Printer className="w-3.5 h-3.5" />
                                <span>Nhật ký các đợt in:</span>
                              </span>
                              <div className="space-y-2 pt-1">
                                {timeline.assignments[0].productionRuns.map((run) => (
                                  <div key={run.id} className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] space-y-1">
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="font-bold text-[#231F1E]">Đợt in #{run.runNo ?? 1} ({run.status})</span>
                                      <span className="text-[#7A706C]">{formatDateTime(run.startedAtUtc)}</span>
                                    </div>
                                    {run.qcNote && (
                                      <p className="text-[11px] text-amber-800">Ghi chú QC: {run.qcNote}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shipments with Tracking Events */}
                          {timeline.shipments && timeline.shipments.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] space-y-2">
                              <span className="font-bold text-[#B83B2A] flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" />
                                <span>Hành trình vận chuyển:</span>
                              </span>
                              {timeline.shipments.map((ship) => (
                                <div key={ship.id} className="space-y-2 pt-1">
                                  <div className="flex flex-wrap items-center justify-between text-[11px] p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0]">
                                    <span>Đơn vị giao: <strong className="text-[#231F1E]">{ship.carrier}</strong></span>
                                    <span className="font-mono text-[#B83B2A] font-bold">Mã: {ship.trackingNumber}</span>
                                    <span>Xuất kho: <strong className="text-[#231F1E]">{formatDateTime(ship.shippedAtUtc || ship.createdAtUtc)}</strong></span>
                                  </div>
                                  {ship.events && ship.events.length > 0 && (
                                    <div className="pl-3 border-l-2 border-[#B83B2A]/40 space-y-2">
                                      {ship.events.map((ev, idx) => (
                                        <div key={idx} className="text-[11px] space-y-0.5">
                                          <div className="flex justify-between text-[#7A706C]">
                                            <span className="font-semibold text-[#231F1E]">{ev.status}</span>
                                            <span>{formatDateTime(ev.occurredAtUtc)}</span>
                                          </div>
                                          {ev.note && <p className="text-[#7A706C]">{ev.note}</p>}
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
                            <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/20 space-y-2">
                              <span className="font-bold text-[#B83B2A] flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-[#B83B2A]" />
                                <span>Hồ sơ khiếu nại bảo hành:</span>
                              </span>
                              {timeline.defectReports.map((def) => (
                                <div key={def.id} className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] space-y-1 text-[11px]">
                                  <div className="flex justify-between font-bold">
                                    <span className="text-[#B83B2A]">Trạng thái: {def.status}</span>
                                    <span className="text-[#7A706C]">{formatDateTime(def.createdAtUtc)}</span>
                                  </div>
                                  <p className="text-[#231F1E]">Lý do: {def.reason}</p>
                                  {def.resolutionNote && (
                                    <p className="text-emerald-700 font-medium">Phản hồi BQT: {def.resolutionNote}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : !isLoadingTimeline ? (
                        <p className="text-xs text-[#7A706C] italic">Chưa có thông tin cập nhật bổ sung từ xưởng.</p>
                      ) : null}
                    </div>
                  )}

                  {/* Action Bar (Pay Now, Cancel, Defect Report, Toggle Timeline) */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2D9D0]">
                    <button
                      type="button"
                      onClick={() => handleToggleTimeline(order.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F6F3EE] hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E] border border-[#E2D9D0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                          className="px-3.5 py-1.5 rounded-xl border border-[#B83B2A]/30 text-[#B83B2A] hover:bg-[#FDF2F0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#B83B2A]" />
                          <span>Khiếu nại sản phẩm lỗi</span>
                        </button>
                      )}

                      {/* Cancel Order 2-Phase Button */}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(order)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#E2D9D0] text-[#7A706C] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Hủy đơn hàng
                        </button>
                      )}

                      {/* Pay Now Button (Unpaid orders) */}
                      {isUnpaid && (
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${order.id}/checkout-return`)}
                          className="px-4 py-1.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] font-bold text-xs text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        >
                          <span>Thanh toán ngay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2-Phase Cancellation Modal */}
      {cancellationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] text-[#231F1E] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D9D0]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-[#231F1E]">
                  Xác Nhận Hủy Đơn #{cancellationTarget.order.orderCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellationTarget(null)}
                className="p-1.5 text-[#7A706C] hover:text-[#231F1E] rounded-lg cursor-pointer"
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
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Đơn hàng đã thanh toán qua PayOS</span>
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Yêu cầu hủy sẽ được chuyển sang bộ phận Quản trị để xét duyệt và thực hiện hoàn tiền theo quy định.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                    <span>Đơn hàng chưa thanh toán</span>
                  </p>
                  <p className="text-blue-800 leading-relaxed">
                    Đơn hàng sẽ được hủy trực tiếp ngay lập tức mà không phát sinh thêm chi phí nào.
                  </p>
                </div>
              );
            })()}

            {cancellationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{cancellationError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#231F1E]">
                Lý do hủy đơn hàng <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn (tối thiểu 5 ký tự)..."
                className="w-full rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] focus:border-[#B83B2A] p-3 text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellationTarget(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A706C] hover:text-[#231F1E] transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling || cancellationReason.trim().length < 5}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
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
