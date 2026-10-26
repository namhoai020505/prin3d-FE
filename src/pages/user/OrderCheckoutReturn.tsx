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
    } catch (err: unknown) {
      console.error('Lỗi tải dữ liệu biên lai:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrderData();
  }, [fetchOrderData]);

  // Handle PayOS return polling loop
  useEffect(() => {
    if (!orderId || !order) return;

    if (order.orderPaymentStatus === 'Paid') {
      setIsPollingActive(false);
      return;
    }

    if (isCancelledFlow) {
      setIsPollingActive(false);
      return;
    }

    setIsPollingActive(true);
    let attempts = 0;
    const maxAttempts = 6;

    const interval = setInterval(async () => {
      attempts += 1;
      setPollCount(attempts);

      try {
        const freshOrder = await orderService.getOrderById(orderId);
        if (freshOrder.orderPaymentStatus === 'Paid') {
          setOrder(freshOrder);
          setIsPollingActive(false);
          clearInterval(interval);
          toast.success('Đã nhận xác nhận thanh toán thành công!');
          return;
        }

        const freshAttempts = await paymentService.getPaymentAttempts(orderId).catch(() => []);
        setPaymentAttempts(freshAttempts);

        if (attempts >= maxAttempts) {
          setIsPollingActive(false);
          clearInterval(interval);
        }
      } catch {
        if (attempts >= maxAttempts) {
          setIsPollingActive(false);
          clearInterval(interval);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, order?.orderPaymentStatus, isCancelledFlow]);

  // Handle staff manual reconcile
  const handleReconcile = async () => {
    if (!orderId) return;
    setIsReconciling(true);
    try {
      const targetAttemptId = paymentAttempts[0]?.id || orderId;
      await paymentService.reconcilePaymentAttempt(targetAttemptId);
      await fetchOrderData();
      toast.success('Đã đối soát và xác nhận thanh toán thành công (Quyền Quản Trị)!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đối soát thanh toán thất bại.';
      toast.error(msg);
    } finally {
      setIsReconciling(false);
    }
  };

  // Handle retry payment attempt
  const handleCreateNewPayment = async () => {
    if (!orderId) return;
    setIsRetryingPayment(true);
    try {
      const newAttempt = await paymentService.createPaymentAttempt(
        orderId,
        `Thanh toan lai don in 3D ${order?.orderCode || ''}`
      );
      setPaymentAttempts((prev) => [newAttempt, ...prev]);

      if (newAttempt.checkoutUrl) {
        if (isQrImage(newAttempt.checkoutUrl)) {
          setActiveQrModal(newAttempt.checkoutUrl);
        } else {
          window.location.href = newAttempt.checkoutUrl;
        }
      } else {
        toast.info('Đã tạo phiên thanh toán mới, vui lòng kiểm tra mã QR.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo phiên thanh toán mới.';
      toast.error(msg);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await fetchOrderData();
    setIsLoading(false);
    toast.info('Đã làm mới thông tin đơn hàng.');
  };

  const formatVndSafe = (val?: number) => {
    if (val === undefined || val === null) return '0';
    return Number(val).toLocaleString('vi-VN');
  };

  const formatDateSafe = (dStr?: string | null) => {
    if (!dStr) return '—';
    try {
      return new Date(dStr).toLocaleString('vi-VN');
    } catch {
      return dStr;
    }
  };

  const isQrImage = (url?: string | null) => {
    if (!url) return false;
    return url.startsWith('data:image/') || url.includes('.png') || url.includes('.jpg') || url.includes('.svg');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex flex-col items-center justify-center p-4 text-[#231F1E]">
        <div className="w-10 h-10 border-2 border-[#B83B2A]/30 border-t-[#B83B2A] rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#7A706C] font-mono">Đang kiểm tra kết quả giao dịch PayOS...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex flex-col items-center justify-center p-4 text-[#231F1E] text-center">
        <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] shadow-sm max-w-md w-full flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#231F1E]">Không tìm thấy thông tin đơn hàng</h2>
          <p className="text-xs text-[#7A706C] mt-1 mb-6 leading-relaxed">
            Mã đơn hàng không hợp lệ hoặc bạn không có quyền truy cập đơn hàng này.
          </p>
          <button
            type="button"
            onClick={() => navigate('/create')}
            className="w-full py-2.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Quay lại 3D Studio
          </button>
        </div>
      </div>
    );
  }

  const isPaid = order.orderPaymentStatus === 'Paid';

  return (
    <div className="min-h-screen bg-[#F6F3EE] py-8 px-4 sm:px-6 lg:px-8 text-[#231F1E] text-left selection:bg-[#B83B2A]/15 selection:text-[#B83B2A]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2D9D0]">
          <div className="flex items-center gap-3">
            <img src={logoBoy} alt="THE BOYS" className="w-9 h-9 rounded-xl shadow-sm object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#231F1E] tracking-wide">
                  Kết Quả Thanh Toán Đơn Hàng In 3D
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#FDF2F0] text-[#B83B2A] border border-[#B83B2A]/20 text-[10px] font-mono font-semibold">
                  PayOS VietQR
                </span>
              </div>
              <span className="text-xs text-[#7A706C] font-mono">
                Đơn hàng: #{order?.orderCode || ''} · Ngày tạo: {formatDateSafe(order?.createdAtUtc)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/create')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs font-semibold text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
          >
            <span>Về 3D Studio</span>
          </button>
        </div>

        {/* TRẠNG THÁI 1: ĐANG THĂM DÒ (POLLING RADAR SPINNER) */}
        {isPollingActive && !isPaid && (
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] text-center flex flex-col items-center justify-center gap-3 shadow-sm">
            <div className="relative flex items-center justify-center w-12 h-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#B83B2A]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#231F1E] tracking-wide">
                Đang đồng bộ biên lai từ Cổng PayOS...
              </h3>
              <p className="text-xs text-[#7A706C] mt-1 font-mono">
                Lần kiểm tra {pollCount}/6 · Hệ thống đang lắng nghe webhook chuyển khoản VietQR
              </p>
            </div>
            <div className="w-full max-w-xs h-1.5 bg-[#EFEAE2] rounded-full overflow-hidden border border-[#E2D9D0]">
              <div
                className="h-full bg-[#B83B2A] transition-all duration-500"
                style={{ width: `${(pollCount / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* TRẠNG THÁI 2: THANH TOÁN THÀNH CÔNG (PAID RECEIPT) */}
        {isPaid ? (
          <TiltCard
            maxTilt={3}
            perspective={1100}
            className="p-6 sm:p-8 rounded-3xl bg-[#FFFFFF] border border-emerald-300 shadow-sm space-y-6"
          >
            {/* Top Congratulations Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#231F1E]">
                    Thanh Toán Đơn Hàng Thành Công!
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold">
                    PAID
                  </span>
                </div>
                <p className="text-xs text-[#7A706C] mt-1 leading-relaxed">
                  Cảm ơn bạn! Đơn hàng đã được thanh toán hoàn tất và chuyển tự động sang phân xưởng in 3D.
                </p>
              </div>
            </div>

            {/* Chi tiết Biên lai Điện Tử (Grid) */}
            <div
              className="p-4 sm:p-5 rounded-2xl bg-[#F6F3EE] border border-[#E2D9D0] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono shadow-inner"
              style={{ transform: 'translateZ(14px)' }}
            >
              <div className="space-y-1">
                <span className="text-[11px] text-[#7A706C] font-sans">Mã đơn hàng:</span>
                <div className="text-sm font-bold text-[#231F1E] flex items-center gap-2">
                  <span>#{order.orderCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.orderCode, 'orderCode')}
                    className="p-1 rounded hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E] cursor-pointer"
                  >
                    {copiedField === 'orderCode' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#7A706C] font-sans">Tổng tiền đã thanh toán:</span>
                <div className="text-sm font-bold text-emerald-700">
                  {formatVndSafe(order?.totalAmount)} đ
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#7A706C] font-sans">Quy cách in 3D:</span>
                <div className="text-[#231F1E]">
                  {order.materialSnapshot} · Cao {order.heightMmSnapshot} mm · SL: {order.quantity} bản
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#7A706C] font-sans">Trạng thái sản xuất:</span>
                <div className="text-[#B83B2A] font-semibold flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-[#B83B2A]" />
                  <span>{order.fulfillmentStatus || 'AwaitingAssignment'} (Chờ phân xưởng)</span>
                </div>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-[#E2D9D0] space-y-1 font-sans">
                <span className="text-[11px] text-[#7A706C]">Địa chỉ giao hàng:</span>
                <div className="text-[#231F1E] text-xs">
                  <strong>{order?.address?.receiverName ?? (order as unknown as Record<string, unknown>)?.receiverName as string ?? 'Khách hàng'}</strong> ({order?.address?.receiverPhone ?? (order as unknown as Record<string, unknown>)?.receiverPhone as string ?? '—'}) — {order?.address?.streetAddress ?? (order as unknown as Record<string, unknown>)?.streetAddress as string ?? ''}, {order?.address?.district ?? (order as unknown as Record<string, unknown>)?.district as string ?? ''}, {order?.address?.city ?? (order as unknown as Record<string, unknown>)?.city as string ?? ''}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2" style={{ transform: 'translateZ(20px)' }}>
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="h-12 w-full px-5 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#231F1E] text-xs sm:text-sm font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-98"
              >
                Tạo Thêm Mô Hình 3D
              </button>

              <button
                type="button"
                onClick={() => navigate('/my-bookings')}
                className="h-12 w-full px-5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
                <span>Xem Hành Trình Đơn Hàng</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </TiltCard>
        ) : isCancelledFlow ? (
          /* TRẠNG THÁI 4: HỦY THANH TOÁN (CANCELLED FLOW) */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFFFF] border border-amber-300 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                <Clock className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-[#231F1E]">
                  Phiên Thanh Toán Chưa Hoàn Tất
                </h2>
                <p className="text-xs text-[#7A706C] mt-1 leading-relaxed">
                  Bạn đã hủy giao dịch trên cổng PayOS hoặc phiên quét mã bị gián đoạn. Đơn hàng #{order.orderCode} của bạn vẫn được lưu giữ an toàn ở trạng thái Chờ thanh toán.
                </p>
              </div>
            </div>

            {/* Bảng tóm tắt đơn chờ */}
            <div className="p-4 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-[#7A706C]">Số tiền cần thanh toán:</span>
                <span className="ml-2 font-bold text-[#B83B2A] text-sm">
                  {formatVndSafe(order?.totalAmount)} đ
                </span>
              </div>
              <div>
                <span className="text-[#7A706C]">Trạng thái hiện tại:</span>
                <span className="ml-2 font-semibold text-amber-700">Chờ thanh toán (Unpaid)</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/my-bookings')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-xs font-semibold transition-colors cursor-pointer"
              >
                Xem danh sách đơn hàng
              </button>

              <button
                type="button"
                disabled={isRetryingPayment}
                onClick={handleCreateNewPayment}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                {isRetryingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                <span>Thanh Toán Lại Qua PayOS (VietQR)</span>
              </button>
            </div>
          </div>
        ) : (
          /* TRẠNG THÁI 3: CHƯA NHẬN ĐƯỢC XÁC NHẬN / ĐỐI SOÁT */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFFFF] border border-[#E2D9D0] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] shadow-sm shrink-0">
                <Clock className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-[#231F1E]">
                  Chưa Nhận Được Xác Nhận Thanh Toán Tức Thì
                </h2>
                <p className="text-xs text-[#7A706C] mt-1 leading-relaxed">
                  {payOsCode === '00' || payOsStatus === 'PAID'
                    ? 'Cổng PayOS đã chuyển hướng về thành công! Hệ thống đang chờ đồng bộ biên lai từ ngân hàng.'
                    : 'Nếu bạn vừa quét mã VietQR và trừ tiền trong tài khoản ngân hàng, vui lòng chờ 5-10 giây để cổng PayOS truyền biên lai webhook.'}
                </p>
              </div>
            </div>

            {/* Thông tin đơn */}
            <div className="p-4 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[#7A706C]">
                <span>Mã đơn hàng:</span>
                <span className="text-[#231F1E] font-bold">#{order.orderCode}</span>
              </div>
              <div className="flex justify-between items-center text-[#7A706C]">
                <span>Số tiền đơn hàng:</span>
                <span className="text-[#B83B2A] font-bold">{formatVndSafe(order?.totalAmount)} đ</span>
              </div>
              <div className="flex justify-between items-center text-[#7A706C]">
                <span>Trạng thái đơn:</span>
                <span className="text-amber-700 font-semibold">{order.orderPaymentStatus}</span>
              </div>
              {latestAttempt && (
                <div className="flex justify-between items-center text-[#7A706C] pt-1 border-t border-[#E2D9D0] text-[11px]">
                  <span>Mã tham chiếu PayOS:</span>
                  <span className="text-[#231F1E] font-medium">{latestAttempt.merchantReference}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#FDF2F0] hover:bg-[#fce8e5] text-[#B83B2A] border border-[#B83B2A]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isReconciling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-emerald-700" />
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D9D0]">
                <span className="text-xs font-bold text-[#231F1E]">Quét mã VietQR Thanh Toán</span>
                <button
                  type="button"
                  onClick={() => setActiveQrModal(null)}
                  className="p-1 rounded-lg text-[#7A706C] hover:text-[#231F1E] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl mx-auto inline-block shadow-sm">
                <img src={activeQrModal} alt="VietQR" className="w-56 h-56 object-contain" />
              </div>

              <p className="text-[11px] text-[#7A706C]">
                Mở ứng dụng Ngân hàng của bạn và quét mã QR để chuyển khoản chính xác số tiền.
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveQrModal(null);
                  void handleManualRefresh();
                }}
                className="w-full py-2.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
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
