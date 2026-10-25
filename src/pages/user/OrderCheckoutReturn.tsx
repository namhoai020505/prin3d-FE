import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ArrowRight,
  RefreshCw,
  Zap,
  QrCode,
  Box,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import logoBoy from '../../assets/LOGOTheBoy.png';
import { orderService, type OrderV2Dto } from '../../services/orderService';
import { paymentService, type PaymentAttemptDto } from '../../services/paymentService';
import { getRoleFromAccessToken, isAdminRole, isManagerRole, isStaffRole } from '../../lib/auth';
import { IdempotencyManager } from '../../lib/idempotency';
import TiltCard from '../../components/ui/TiltCard';

export default function OrderCheckoutReturn() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve target order ID from params, query, or sessionStorage
  const orderId = useMemo(() => {
    if (id && id.trim()) return id.trim();
    const queryId = searchParams.get('orderId');
    if (queryId && queryId.trim()) return queryId.trim();
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('idea2model_last_order_id');
      if (stored && stored.trim()) return stored.trim();
    }
    return '';
  }, [id, searchParams]);

  // Read PayOS query params
  const payOsCode = searchParams.get('code'); // e.g. '00'
  const payOsStatus = searchParams.get('status'); // e.g. 'PAID', 'CANCELLED'
  const payOsCancel = searchParams.get('cancel'); // e.g. 'true', 'false'

  // Is this a cancellation route or cancel param?
  const isCancelledFlow = useMemo(() => {
    return (
      location.pathname.includes('checkout-cancel') ||
      location.pathname.includes('/cancel') ||
      payOsCancel === 'true' ||
      payOsStatus === 'CANCELLED'
    );
  }, [location.pathname, payOsCancel, payOsStatus]);

  // Component states
  const [order, setOrder] = useState<OrderV2Dto | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttemptDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [activeQrModal, setActiveQrModal] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check Staff / Admin role for quick reconcile
  const isStaffOrAdmin = useMemo(() => {
    const role = getRoleFromAccessToken();
    return isAdminRole(role) || isManagerRole(role) || isStaffRole(role);
  }, []);

  const latestAttempt = useMemo(() => {
    return paymentAttempts.length > 0 ? paymentAttempts[0] : null;
  }, [paymentAttempts]);

  // Clipboard copy helper
  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.info(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fetch initial order & attempts
  const fetchOrderData = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    try {
      const [orderData, attemptsData] = await Promise.all([
        orderService.getOrderById(orderId),
        paymentService.getPaymentAttempts(orderId).catch(() => []),
      ]);

      setOrder(orderData);
      setPaymentAttempts(attemptsData);
      return orderData;
    } catch {
      // Order might not be found or network error
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  // Initial load
  useEffect(() => {
    void fetchOrderData().then((fetched) => {
      // If not cancelled and not paid, trigger polling
      if (fetched && fetched.orderPaymentStatus !== 'Paid' && !isCancelledFlow) {
        setIsPollingActive(true);
      }
    });
  }, [fetchOrderData, isCancelledFlow]);

  // Auto-polling mechanism: up to 6 times (every 2 seconds)
  useEffect(() => {
    if (!isPollingActive || !orderId || isCancelledFlow) return;

    if (pollCount >= 6) {
      setIsPollingActive(false);
      return;
    }

    const timer = setTimeout(async () => {
      setPollCount((prev) => prev + 1);
      try {
        const updated = await orderService.getOrderById(orderId);
        setOrder(updated);

        if (updated.orderPaymentStatus === 'Paid') {
          setIsPollingActive(false);
          toast.success('Thanh toán thành công! Đơn hàng đã được xác nhận.');
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isPollingActive, pollCount, orderId, isCancelledFlow]);

  // Manual Refresh
  const handleManualRefresh = async () => {
    setPollCount(0);
    setIsPollingActive(true);
    await fetchOrderData();
  };

  // Staff / Admin Reconcile action
  const handleReconcile = async () => {
    if (!latestAttempt) {
      toast.warn('Chưa có lượt thanh toán nào để đối soát.');
      return;
    }

    setIsReconciling(true);
    try {
      await paymentService.reconcilePaymentAttempt(latestAttempt.id);
      toast.success('Đối soát thành công! Đơn hàng đã chuyển sang trạng thái Đã Thanh Toán.');
      await fetchOrderData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể đối soát.';
      toast.error(msg);
    } finally {
      setIsReconciling(false);
    }
  };

  // Re-create Payment Attempt
  const handleCreateNewPayment = async () => {
    if (!order) return;
    setIsRetryingPayment(true);
    try {
      IdempotencyManager.refreshKey(`payment:attempt:${order.id}`);
      const newAttempt = await paymentService.createPaymentAttempt(
        order.id,
        `Thanh toán lại đơn hàng ${order.orderCode} qua PayOS`,
      );
      setPaymentAttempts((prev) => [newAttempt, ...prev]);
      toast.success('Đã tạo phiên thanh toán mới!');

      if (newAttempt.checkoutUrl) {
        if (
          newAttempt.checkoutUrl.includes('vietqr') ||
          newAttempt.checkoutUrl.endsWith('.png') ||
          newAttempt.checkoutUrl.endsWith('.jpg')
        ) {
          setActiveQrModal(newAttempt.checkoutUrl);
        } else {
          window.open(newAttempt.checkoutUrl, '_blank');
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể tạo phiên thanh toán.';
      toast.error(msg);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  // Helper check if checkoutUrl is image
  const isQrImage = (url?: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('vietqr') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.includes('/img/')
    );
  };

  const formatDateSafe = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
    } catch {
      return '—';
    }
  };

  const formatVndSafe = (val?: number | null) => {
    if (typeof val !== 'number' || isNaN(val)) return '0';
    return val.toLocaleString('vi-VN');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d14] flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-3" />
        <h3 className="text-base font-bold text-white tracking-wide">
          Đang truy vấn trạng thái đơn hàng...
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-mono">Đồng bộ dữ liệu từ cổng PayOS V2</p>
      </div>
    );
  }

  // Not found state
  if (!order) {
    return (
      <div className="min-h-screen bg-[#090d14] flex flex-col items-center justify-center p-4 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Không tìm thấy thông tin đơn hàng</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
          Mã đơn hàng không hợp lệ hoặc bạn không có quyền truy cập đơn hàng này.
        </p>
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="btn-pooled-cyan px-6 py-2.5 text-xs font-bold"
        >
          Quay lại 3D Studio
        </button>
      </div>
    );
  }

  const isPaid = order.orderPaymentStatus === 'Paid';

  return (
    <div className="min-h-screen bg-[#090d14] py-8 px-4 sm:px-6 lg:px-8 text-white text-left selection:bg-cyan-500/30">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logoBoy} alt="THE BOYS" className="w-9 h-9 rounded-xl shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Kết Quả Thanh Toán Đơn Hàng In 3D
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono font-semibold">
                  PayOS V2
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Đơn hàng: #{order?.orderCode || ''} · Ngày tạo: {formatDateSafe(order?.createdAtUtc)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/create')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>Về 3D Studio</span>
          </button>
        </div>

        {/* ====================================================
            TRẠNG THÁI 1: ĐANG THĂM DÒ (POLLING RADAR SPINNER)
            ==================================================== */}
        {isPollingActive && !isPaid && (
          <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-center flex flex-col items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
            <div className="relative flex items-center justify-center w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-cyan-300 tracking-wide">
                Đang đồng bộ biên lai từ Cổng PayOS...
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Lần kiểm tra {pollCount}/6 · Hệ thống đang lắng nghe webhook chuyển khoản VietQR
              </p>
            </div>
            <div className="w-full max-w-xs h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${(pollCount / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ====================================================
            TRẠNG THÁI 2: THANH TOÁN THÀNH CÔNG (PAID RECEIPT)
            ==================================================== */}
        {isPaid ? (
          <TiltCard
            maxTilt={3}
            perspective={1100}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0a1e17]/90 via-[#08151c]/92 to-[#060c14]/96 border border-emerald-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl space-y-6"
          >
            {/* Top Congratulations Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] shrink-0">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Thanh Toán Đơn Hàng Thành Công!
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-mono font-bold">
                    PAID
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Cảm ơn bạn! Đơn hàng đã được thanh toán hoàn tất và chuyển tự động sang phân xưởng in 3D.
                </p>
              </div>
            </div>

            {/* Chi tiết Biên lai Điện Tử (Grid) */}
            <div
              className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]"
              style={{ transform: 'translateZ(14px)' }}
            >
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-sans">Mã đơn hàng:</span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>#{order.orderCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.orderCode, 'orderCode')}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {copiedField === 'orderCode' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-sans">Tổng tiền đã thanh toán:</span>
                <div className="text-sm font-bold text-emerald-300">
                  {formatVndSafe(order?.totalAmount)} đ
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-sans">Quy cách in 3D:</span>
                <div className="text-white">
                  {order.materialSnapshot} · Cao {order.heightMmSnapshot} mm · SL: {order.quantity} bản
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-sans">Trạng thái sản xuất:</span>
                <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{order.fulfillmentStatus || 'AwaitingAssignment'} (Chờ phân xưởng)</span>
                </div>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-white/5 space-y-1 font-sans">
                <span className="text-[11px] text-slate-400">Địa chỉ giao hàng:</span>
                <div className="text-slate-200 text-xs">
                  <strong>{order?.address?.receiverName ?? (order as any)?.receiverName ?? 'Khách hàng'}</strong> ({order?.address?.receiverPhone ?? (order as any)?.receiverPhone ?? '—'}) — {order?.address?.streetAddress ?? (order as any)?.streetAddress ?? ''}, {order?.address?.district ?? (order as any)?.district ?? ''}, {order?.address?.city ?? (order as any)?.city ?? ''}
                </div>
              </div>
            </div>

            {/* Action Buttons: 2 nút đồng đều hoàn hảo về kích thước, chiều cao, visual weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2" style={{ transform: 'translateZ(20px)' }}>
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="h-12 w-full px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-cyan-400/40 text-slate-200 hover:text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center cursor-pointer backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] active:scale-95"
              >
                Tạo Thêm Mô Hình 3D
              </button>

              <button
                type="button"
                onClick={() => navigate('/my-bookings')}
                className="btn-pooled-cyan h-12 w-full px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_22px_rgba(0,240,255,0.35)] rounded-xl active:scale-95 transition-all"
              >
                <span>Xem Hành Trình Đơn Hàng</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </TiltCard>
        ) : isCancelledFlow ? (
          /* ====================================================
             TRẠNG THÁI 4: HỦY THANH TOÁN (CANCELLED FLOW)
             ==================================================== */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0f18]/95 border border-amber-500/30 backdrop-blur-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)] shrink-0">
                <Clock className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Phiên Thanh Toán Chưa Hoàn Tất
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Bạn đã hủy giao dịch trên cổng PayOS hoặc phiên quét mã bị gián đoạn. Đơn hàng #{order.orderCode} của bạn vẫn được lưu giữ an toàn ở trạng thái Chờ thanh toán.
                </p>
              </div>
            </div>

            {/* Bảng tóm tắt đơn chờ */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-400">Số tiền cần thanh toán:</span>
                <span className="ml-2 font-bold text-cyan-300 text-sm">
                  {formatVndSafe(order?.totalAmount)} đ
                </span>
              </div>
              <div>
                <span className="text-slate-400">Trạng thái hiện tại:</span>
                <span className="ml-2 font-semibold text-amber-300">Chờ thanh toán (Unpaid)</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Xem danh sách đơn hàng
              </button>

              <button
                type="button"
                disabled={isRetryingPayment}
                onClick={handleCreateNewPayment}
                className="btn-pooled-cyan w-full sm:w-auto py-2.5 px-6 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)] disabled:opacity-50"
              >
                {isRetryingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                <span>Thanh Toán Lại Qua PayOS (VietQR)</span>
              </button>
            </div>
          </div>
        ) : (
          /* ====================================================
             TRẠNG THÁI 3: CHƯA NHẬN ĐƯỢC XÁC NHẬN / ĐỐI SOÁT
             ==================================================== */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0f18]/95 border border-cyan-500/30 backdrop-blur-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.2)] shrink-0">
                <Clock className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Chưa Nhận Được Xác Nhận Thanh Toán Tức Thì
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {payOsCode === '00' || payOsStatus === 'PAID'
                    ? 'Cổng PayOS đã chuyển hướng về thành công! Do hệ thống đang chạy trong môi trường thử nghiệm (Localhost), máy chủ backend đang chờ xác nhận giao dịch hoặc cần một chạm đối soát.'
                    : 'Nếu bạn vừa quét mã VietQR và trừ tiền trong tài khoản ngân hàng, vui lòng chờ 5-10 giây để cổng PayOS truyền biên lai webhook.'}
                </p>
              </div>
            </div>

            {/* Thông tin đơn */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/8 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-300">
                <span>Mã đơn hàng:</span>
                <span className="text-white font-bold">#{order.orderCode}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Số tiền đơn hàng:</span>
                <span className="text-cyan-300 font-bold">{formatVndSafe(order?.totalAmount)} đ</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Trạng thái đơn:</span>
                <span className="text-amber-300 font-semibold">{order.orderPaymentStatus}</span>
              </div>
              {latestAttempt && (
                <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/5 text-[11px]">
                  <span>Mã tham chiếu PayOS:</span>
                  <span className="text-white/80">{latestAttempt.merchantReference}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kiểm tra lại trạng thái</span>
                </button>

                {latestAttempt?.checkoutUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isQrImage(latestAttempt.checkoutUrl)) {
                        setActiveQrModal(latestAttempt.checkoutUrl!);
                      } else {
                        window.open(latestAttempt.checkoutUrl!, '_blank');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Mở lại mã QR</span>
                  </button>
                )}
              </div>

              {/* Staff / Admin Instant Reconcile Button */}
              {isStaffOrAdmin && (
                <button
                  type="button"
                  disabled={isReconciling}
                  onClick={handleReconcile}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50"
                >
                  {isReconciling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>⚡ [Quyền Staff/Admin] Đối soát xác nhận Đã Thanh Toán</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Xem lại mã QR (nếu mở lại từ nút) */}
        {activeQrModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative bg-[#0c1017] border border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white">Quét mã VietQR Thanh Toán</span>
                <button
                  type="button"
                  onClick={() => setActiveQrModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white rounded-2xl mx-auto inline-block shadow-md">
                <img src={activeQrModal} alt="VietQR" className="w-56 h-56 object-contain" />
              </div>

              <p className="text-[11px] text-slate-300">
                Mở ứng dụng Ngân hàng của bạn và quét mã QR để chuyển khoản chính xác số tiền.
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveQrModal(null);
                  void handleManualRefresh();
                }}
                className="btn-pooled-cyan w-full py-2.5 text-xs font-bold"
              >
                Tôi đã chuyển khoản xong
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
