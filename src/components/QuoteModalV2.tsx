import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Zap,
  MapPin,
  Package,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { toast } from 'react-toastify';
import logoBoy from '../assets/LOGOTheBoy.png';
import {
  createQuote,
  type QuoteDto,
  type ShippingAddressDto,
} from '../services/quoteService';
import {
  approvalAndReviewService,
  buildCanonicalPrintConfig,
  type CanonicalPrintConfig,
} from '../services/approvalAndReviewService';
import {
  listPricingPackages,
  type PricingPackage,
} from '../services/pricingPackageService';
import {
  orderService,
  type OrderV2Dto,
} from '../services/orderService';
import {
  paymentService,
  type PaymentAttemptDto,
} from '../services/paymentService';
import {
  getRoleFromAccessToken,
  isAdminRole,
  isManagerRole,
  isStaffRole,
} from '../lib/auth';
import { AI_CONSENT_POLICY_VERSION } from '../lib/env';
import { IdempotencyManager } from '../lib/idempotency';

export interface QuoteModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  versionId: string;
  modelName?: string;
  initialHeightMm?: number;
  initialMaterial?: string;
  initialScale?: number;
  approvedConfigHash?: string;
  onProceedToPayment?: (quote: QuoteDto) => void;
}

export default function QuoteModalV2({
  isOpen,
  onClose,
  versionId,
  modelName = 'Mô hình 3D',
  initialHeightMm = 100,
  initialMaterial = 'Resin',
  initialScale = 1,
  approvedConfigHash = '',
  onProceedToPayment,
}: QuoteModalV2Props) {
  const navigate = useNavigate();

  // Form Configuration states
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [heightMm, setHeightMm] = useState<number>(() =>
    Math.min(120, Math.max(100, Math.round(initialHeightMm || 100))),
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [configHash, setConfigHash] = useState<string>(approvedConfigHash);

  // Shipping Address states
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [city, setCity] = useState<string>('Thành phố Hồ Chí Minh');
  const [customerNote, setCustomerNote] = useState<string>('');

  // Processing & Quote states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState<QuoteDto | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [reviewRequiredError, setReviewRequiredError] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Step 3 / Payment View states
  const [isPaymentView, setIsPaymentView] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderV2Dto | null>(null);
  const [paymentAttempt, setPaymentAttempt] = useState<PaymentAttemptDto | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check management privileges (Admin / Manager / Staff)
  const isStaffOrAdmin = useMemo(() => {
    const role = getRoleFromAccessToken();
    return isAdminRole(role) || isManagerRole(role) || isStaffRole(role);
  }, []);

  // Selected package details
  const currentPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId),
    [packages, selectedPackageId],
  );

  // Load pricing packages on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingPackages(true);

    void listPricingPackages()
      .then((data) => {
        if (!isMounted) return;
        setPackages(data);
        if (data.length > 0) {
          const matched = data.find(
            (p) =>
              p.material?.toLowerCase().includes(initialMaterial.toLowerCase()) ||
              p.name?.toLowerCase().includes(initialMaterial.toLowerCase()),
          );
          setSelectedPackageId(matched ? matched.id : data[0].id);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallbackPkgs: PricingPackage[] = [
          {
            id: '99999999-9999-9999-9999-999999999991',
            name: 'Tượng Demo 10–12 cm - Resin Siêu Mịn',
            material: 'Resin',
            priceVnd: 390000,
            minHeightMm: 100,
            maxHeightMm: 120,
            heightRangeCm: '10 - 12 cm',
          },
          {
            id: '99999999-9999-9999-9999-999999999992',
            name: 'Mô hình Kỹ Thuật 10–12 cm - PLA Nhựa Bền',
            material: 'PLA',
            priceVnd: 280000,
            minHeightMm: 100,
            maxHeightMm: 120,
            heightRangeCm: '10 - 12 cm',
          },
        ];
        setPackages(fallbackPkgs);
        setSelectedPackageId(fallbackPkgs[0].id);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPackages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialMaterial]);

  // Sync initial height clamp
  useEffect(() => {
    if (initialHeightMm) {
      setHeightMm(Math.min(120, Math.max(100, Math.round(initialHeightMm))));
    }
  }, [initialHeightMm]);

  // Sync initial hash
  useEffect(() => {
    if (approvedConfigHash) {
      setConfigHash(approvedConfigHash);
    }
  }, [approvedConfigHash]);

  // 15-minute quote countdown timer
  useEffect(() => {
    if (!quote?.expiresAtUtc) return;

    const timer = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((new Date(quote.expiresAtUtc).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(diff);
      if (diff === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quote]);

  // Format seconds to MM:SS
  const countdownFormatted = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [remainingSeconds]);

  // Handle Close with Reset
  const handleClose = useCallback(() => {
    setReviewRequiredError(false);
    setIsPaymentView(false);
    onClose();
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Clipboard copy helper
  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.info(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Submit Quote Calculation
  const handleCalculateQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!receiverName.trim()) {
      toast.warn('Vui lòng nhập họ và tên người nhận hàng.');
      return;
    }
    if (!receiverPhone.trim() || receiverPhone.trim().length < 9) {
      toast.warn('Vui lòng nhập số điện thoại người nhận hợp lệ.');
      return;
    }
    if (!streetAddress.trim()) {
      toast.warn('Vui lòng nhập địa chỉ số nhà, tên đường.');
      return;
    }
    if (!district.trim()) {
      toast.warn('Vui lòng nhập quận / huyện nhận hàng.');
      return;
    }
    if (!selectedPackageId) {
      toast.warn('Vui lòng chọn một gói in sản xuất.');
      return;
    }

    const targetMaterial = currentPackage?.material || initialMaterial || 'Resin';
    const canonicalConfig: CanonicalPrintConfig = buildCanonicalPrintConfig({
      material: targetMaterial,
      heightMm,
      scale: initialScale,
    });

    setIsSubmitting(true);
    setReviewRequiredError(false);
    setCreatedOrder(null);
    setPaymentAttempt(null);
    setIsPaymentView(false);

    try {
      const approvalDto = await approvalAndReviewService.createCustomerApproval({
        versionId,
        configuration: canonicalConfig,
        policyVersion: AI_CONSENT_POLICY_VERSION,
      });
      if (approvalDto?.configurationHash) {
        setConfigHash(approvalDto.configurationHash);
      }

      const addressDto: ShippingAddressDto = {
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        streetAddress: streetAddress.trim(),
        district: district.trim(),
        city: city.trim() || 'Thành phố Hồ Chí Minh',
        customerNote: customerNote.trim() || undefined,
      };

      const quoteResult = await createQuote({
        versionId,
        configuration: canonicalConfig,
        pricingPackageId: selectedPackageId,
        quantity,
        address: addressDto,
      });

      setQuote(quoteResult);
      toast.success('Đã tính báo giá thành công! Báo giá được giữ nguyên trong 15 phút.');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          status?: number;
          data?: {
            title?: string;
            detail?: string;
            message?: string;
          };
        };
      };

      const status = errorObj.response?.status;
      const detail =
        errorObj.response?.data?.detail ||
        errorObj.response?.data?.message ||
        errorObj.response?.data?.title ||
        '';

      if (
        status === 409 ||
        detail.includes('ReviewRequired') ||
        detail.includes('phê duyệt in') ||
        detail.includes('kỹ thuật viên')
      ) {
        setReviewRequiredError(true);
        toast.info('Cấu hình chốt in đã được ghi nhận. Đang chờ Kỹ thuật viên duyệt in.');
      } else {
        toast.error(detail || 'Không thể tính báo giá. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Staff/Admin Quick Review Action
  const handleQuickStaffReview = async () => {
    setIsReviewing(true);
    const targetMaterial = currentPackage?.material || initialMaterial || 'Resin';
    const canonicalConfig = buildCanonicalPrintConfig({
      material: targetMaterial,
      heightMm,
      scale: initialScale,
    });

    try {
      await approvalAndReviewService.createPrintReview({
        versionId,
        decision: 'Approved',
        checklist: {
          orientation: 'default',
          supportConfirmation: true,
          material: targetMaterial,
          printHeightMm: heightMm,
          buildVolumeConfirmation: true,
          slicingSoftware: 'Idea2Model-GPU-Slicer',
        },
        configuration: canonicalConfig,
        note: 'Duyệt kỹ thuật in 3D trực tiếp từ QuoteModal (Admin / Staff Demo).',
      });

      toast.success('Đã duyệt kỹ thuật mẫu in thành công! Đang tự động xuất báo giá...');
      setReviewRequiredError(false);
      await handleCalculateQuote();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể duyệt kỹ thuật.';
      toast.error(msg);
    } finally {
      setIsReviewing(false);
    }
  };

  // Step 3: Proceed to Checkout (Order + PayOS Payment Attempt)
  const handleProceedToPayment = async () => {
    if (!quote) return;
    if (remainingSeconds === 0 || quote.isExpired) {
      toast.warn('Báo giá đã hết hạn 15 phút. Vui lòng bấm Tính lại báo giá.');
      return;
    }

    try {
      sessionStorage.setItem('idea2model_active_quote', JSON.stringify(quote));
    } catch {
      // Ignore storage errors
    }

    if (onProceedToPayment) {
      onProceedToPayment(quote);
      return;
    }

    setIsProcessingCheckout(true);
    try {
      // 1. Tạo đơn hàng V2 từ quoteId (hoặc tái sử dụng đơn hàng vừa tạo)
      let order = createdOrder;
      if (!order) {
        order = await orderService.checkoutQuote(quote.id);
        setCreatedOrder(order);
        sessionStorage.setItem('idea2model_last_order_id', order.id);
      }

      // 2. Tạo lượt thanh toán PayOS
      const attempt = await paymentService.createPaymentAttempt(
        order.id,
        `Thanh toán đơn hàng ${order.orderCode} qua PayOS`,
      );
      setPaymentAttempt(attempt);
      setIsPaymentView(true);
      toast.success(`Đã khởi tạo đơn hàng #${order.orderCode} và phiên thanh toán PayOS!`);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể khởi tạo thanh toán.';
      toast.error(msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Retry creating payment attempt if failed
  const handleRetryPaymentAttempt = async () => {
    if (!createdOrder) return;
    setIsProcessingCheckout(true);
    try {
      IdempotencyManager.refreshKey(`payment:attempt:${createdOrder.id}`);
      const attempt = await paymentService.createPaymentAttempt(
        createdOrder.id,
        `Thanh toán lại đơn hàng ${createdOrder.orderCode} qua PayOS`,
      );
      setPaymentAttempt(attempt);
      toast.success('Đã tạo phiên thanh toán mới!');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể tạo lại phiên thanh toán.';
      toast.error(msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Staff/Admin Reconcile Payment immediately on localhost
  const handleQuickReconcile = async () => {
    if (!paymentAttempt || !createdOrder) return;
    setIsReconciling(true);
    try {
      await paymentService.reconcilePaymentAttempt(paymentAttempt.id);
      toast.success('Đối soát thành công! Đơn hàng đã được xác nhận thanh toán.');
      handleClose();
      navigate(`/orders/${createdOrder.id}/checkout-return`);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể đối soát giao dịch.';
      toast.error(msg);
    } finally {
      setIsReconciling(false);
    }
  };

  // Helper check if checkoutUrl is a QR image
  const isQrImage = (url?: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('vietqr') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.includes('/img/')
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#090d14]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.12)] backdrop-blur-2xl text-white overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-r from-cyan-950/40 via-transparent to-cyan-950/20">
          <div className="flex items-center gap-3">
            <img src={logoBoy} alt="THE BOYS" className="w-8 h-8 rounded-lg shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {isPaymentView
                    ? 'Thanh Toán Đơn Hàng In 3D (PayOS / VietQR)'
                    : 'Báo Giá Gia Công & Sản Xuất In 3D'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono font-semibold">
                  {isPaymentView ? 'Cổng PayOS' : 'V2'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                <span className="truncate max-w-[200px] sm:max-w-xs text-white/90 font-sans font-medium">
                  {modelName}
                </span>
                <span>•</span>
                <span>ID: {versionId.slice(0, 8)}...</span>
                {createdOrder && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">
                      Đơn #{createdOrder.orderCode}
                    </span>
                  </>
                )}
                {!createdOrder && configHash && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400" title={configHash}>
                      Hash: #{configHash.slice(0, 8)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Phân nhánh giữa Màn hình Báo giá (Quote View) và Màn hình Thanh toán (Payment View) */}
        {!isPaymentView ? (
          /* =========================================
             MÀN HÌNH BÁO GIÁ (2 CỘT)
             ========================================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            {/* CỘT 1: Cấu hình Gói In & Địa chỉ (7 cột trên lg) */}
            <form onSubmit={handleCalculateQuote} className="lg:col-span-7 flex flex-col gap-4">
              {/* Gói in & Chiều cao */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-cyan-400" />
                    Gói in & Quy cách vật liệu
                  </span>
                  {isLoadingPackages && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  )}
                </div>

                {/* Package Radio Selector */}
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <label
                      key={pkg.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedPackageId === pkg.id
                          ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.12)]'
                          : 'bg-black/30 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="pricingPackage"
                          value={pkg.id}
                          checked={selectedPackageId === pkg.id}
                          onChange={() => setSelectedPackageId(pkg.id)}
                          className="accent-cyan-400 w-4 h-4"
                        />
                        <div>
                          <div className="text-xs font-semibold text-white">{pkg.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {pkg.material} · Giới hạn: {pkg.minHeightMm}–{pkg.maxHeightMm} mm
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {pkg.priceVnd.toLocaleString('vi-VN')} đ
                      </span>
                    </label>
                  ))}
                </div>

                {/* Chiều cao in & Số lượng */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Chiều cao in (mm)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={currentPackage?.minHeightMm || 100}
                        max={currentPackage?.maxHeightMm || 120}
                        value={heightMm}
                        onChange={(e) => setHeightMm(Number(e.target.value))}
                        className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono">mm</span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 mt-0.5 block">
                      Chuẩn: 100 – 120 mm
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Số lượng mẫu
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, Math.min(10, Number(e.target.value))))
                        }
                        className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono">bản</span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 mt-0.5 block">Tối đa 10 mẫu/lượt</span>
                  </div>
                </div>
              </div>

              {/* Thông tin giao hàng */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-3">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Địa chỉ nhận hàng (Giao tận nơi)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] text-slate-300 mb-1">
                      Họ và tên người nhận <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-300 mb-1">
                      Số điện thoại <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] text-slate-300 mb-1">
                      Số nhà, tên đường, phường/xã <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="123 Nguyễn Huệ, Phường Bến Nghé"
                      className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-300 mb-1">
                      Quận / Huyện <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Quận 1"
                      className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-300 mb-1">Tỉnh / Thành phố</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] text-slate-300 mb-1">
                      Ghi chú gia công (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Ví dụ: Đóng gói cẩn thận các chi tiết nhô mỏng"
                      className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-pooled-cyan w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tính toán chi phí & tạo báo giá...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Tính Báo Giá Chính Thức (Khóa giá 15 phút)</span>
                  </>
                )}
              </button>
            </form>

            {/* CỘT 2: Bảng chiết tính & Đếm ngược 15 phút (5 cột trên lg) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Box Lỗi Chờ duyệt ReviewRequired */}
              {reviewRequiredError && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        Chờ Kỹ thuật viên duyệt in 3D
                      </h4>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed mt-1">
                        Mẫu 3D đã được chốt cấu hình thành công! Hiện mẫu đang chờ Kỹ thuật viên
                        (Staff/Admin) kiểm tra tính kín nước và độ vững trước khi xuất báo giá.
                      </p>
                    </div>
                  </div>

                  {isStaffOrAdmin && (
                    <button
                      type="button"
                      onClick={handleQuickStaffReview}
                      disabled={isReviewing}
                      className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50"
                    >
                      {isReviewing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>⚡ [Quyền Staff/Admin] Duyệt kỹ thuật mẫu in này ngay</span>
                    </button>
                  )}
                </div>
              )}

              {/* Chi tiết Báo Giá khi đã có Quote */}
              {quote ? (
                <div className="p-4 rounded-xl bg-white/[0.04] border border-cyan-500/30 space-y-4">
                  {/* Countdown Timer */}
                  <div className="p-3 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`w-4 h-4 ${
                          remainingSeconds < 120
                            ? 'text-rose-400 animate-pulse'
                            : 'text-cyan-400'
                        }`}
                      />
                      <span className="text-xs text-slate-300 font-medium">Thời hạn giữ giá:</span>
                    </div>
                    <span
                      className={`font-mono text-sm font-bold tracking-wider ${
                        remainingSeconds < 120
                          ? 'text-rose-400 animate-pulse'
                          : 'text-cyan-300'
                      }`}
                    >
                      {remainingSeconds === 0 ? 'ĐÃ HẾT HẠN' : countdownFormatted}
                    </span>
                  </div>

                  {/* Breakdown Table */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">
                        Đơn giá ({quote.packageName || 'Gói in'} × {quote.quantity}):
                      </span>
                      <span className="font-mono font-semibold text-white">
                        {quote.subTotalVnd.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Phí vận chuyển tiêu chuẩn:</span>
                      <span className="font-mono text-slate-400">
                        {quote.shippingFeeRaw.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-emerald-400">
                      <span className="text-emerald-400/90">Trợ giá vận chuyển (THE BOYS):</span>
                      <span className="font-mono font-medium">
                        -{quote.platformShippingSubsidy.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Phí vận chuyển thực trả:</span>
                      <span className="font-mono font-semibold text-white">
                        {quote.finalShippingFee === 0
                          ? 'Miễn phí'
                          : `${quote.finalShippingFee.toLocaleString('vi-VN')} đ`}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-cyan-500/20 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Tổng Thanh Toán:
                      </span>
                      <span className="text-xl font-black text-cyan-300 font-mono tracking-tight">
                        {quote.totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Hash & Commitments */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1 text-[10px] text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Mã bảo toàn giá:</span>
                      <span className="text-cyan-400">#{quote.hash.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trạng thái:</span>
                      <span className="text-emerald-400 font-sans font-semibold">
                        ✓ Đã bảo lưu chi phí 15 phút
                      </span>
                    </div>
                  </div>

                  {/* Proceed Button or Expired Button */}
                  {remainingSeconds > 0 && !quote.isExpired ? (
                    <button
                      type="button"
                      disabled={isProcessingCheckout}
                      onClick={handleProceedToPayment}
                      className="btn-pooled-cyan w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)] disabled:opacity-50"
                    >
                      {isProcessingCheckout ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Đang khởi tạo đơn hàng & cổng PayOS...</span>
                        </>
                      ) : (
                        <>
                          <span>Xác Nhận Đặt Hàng & Thanh Toán PayOS</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCalculateQuote()}
                      className="w-full py-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-500/30 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Báo giá đã hết hạn — Tạo lại báo giá mới</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[260px] p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                    <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Chưa có bản chiết tính giá</h4>
                    <p className="text-[11px] text-slate-400 max-w-[240px] mt-1 leading-relaxed">
                      Vui lòng chọn gói in và điền địa chỉ giao hàng ở bên trái, sau đó bấm &quot;Tính
                      Báo Giá Chính Thức&quot;.
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Cam kết minh bạch 100% · Không phụ phí ẩn
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =========================================
             MÀN HÌNH THANH TOÁN PAYOS / VIETQR (STEP 3)
             ========================================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 text-left animate-in fade-in duration-200">
            {createdOrder && paymentAttempt && (
              <>
                {/* 1. Thông tin giao dịch & Mã đơn */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Mã đơn hàng */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400">Mã đơn hàng</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-sm font-bold text-white">
                        #{createdOrder.orderCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdOrder.orderCode, 'orderCode')}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Sao chép mã đơn"
                      >
                        {copiedField === 'orderCode' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Số tiền cần thanh toán */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-400/40 flex flex-col justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                    <span className="text-[11px] text-cyan-200/80">Số tiền cần thanh toán</span>
                    <div className="font-mono text-lg font-black text-cyan-300 mt-1">
                      {paymentAttempt.amountVnd.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  {/* Mã tham chiếu PayOS & Cổng */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Tham chiếu PayOS</span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                        {paymentAttempt.gateway}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs font-semibold text-white/90 truncate max-w-[170px]">
                        {paymentAttempt.merchantReference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentAttempt.merchantReference, 'ref')}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Sao chép mã tham chiếu"
                      >
                        {copiedField === 'ref' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Khung Quét mã QR / Link Cổng Thanh Toán */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-cyan-500/30 flex flex-col items-center justify-center text-center gap-4">
                  {/* Trạng thái lỗi nếu có */}
                  {paymentAttempt.status === 'Failed' || paymentAttempt.status === 'NeedsAttention' ? (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200 w-full space-y-2">
                      <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Phiên thanh toán gặp trục trặc</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {paymentAttempt.failureReason || 'Cổng thanh toán không phản hồi hoặc đã bị gián đoạn.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleRetryPaymentAttempt}
                        disabled={isProcessingCheckout}
                        className="mt-2 py-1.5 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Thử tạo lại phiên thanh toán mới
                      </button>
                    </div>
                  ) : isQrImage(paymentAttempt.checkoutUrl) ? (
                    /* Chế độ Ảnh VietQR */
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white rounded-2xl shadow-2xl border border-slate-200">
                        <img
                          src={paymentAttempt.checkoutUrl!}
                          alt="Mã QR VietQR"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
                          <QrCode className="w-4 h-4 text-emerald-400" />
                          <span>Mở ứng dụng Ngân hàng bất kỳ để quét mã VietQR</span>
                        </div>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Hệ thống sẽ tự động đối soát và chuyển trạng thái đơn hàng ngay khi tiền vào tài khoản.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Chế độ Web Link PayOS (pay.payos.vn) */
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
                        <CreditCard className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">
                          Cổng Thanh Toán Trực Tuyến PayOS (VietQR)
                        </h4>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Nhấn nút bên dưới để mở giao diện thanh toán an toàn của PayOS trong tab mới.
                        </p>
                      </div>

                      {paymentAttempt.checkoutUrl && (
                        <a
                          href={paymentAttempt.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-pooled-cyan py-3 px-6 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                        >
                          <span>Mở Trang Thanh Toán PayOS</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => setIsPaymentView(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại xem báo giá</span>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    {/* Nút đặc quyền Staff/Admin đối soát ngay trên localhost */}
                    {isStaffOrAdmin && (
                      <button
                        type="button"
                        onClick={handleQuickReconcile}
                        disabled={isReconciling}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isReconciling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>⚡ [Quyền Staff/Admin] Đối soát thanh toán ngay</span>
                      </button>
                    )}

                    {/* Nút kiểm tra kết quả */}
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate(`/orders/${createdOrder.id}/checkout-return`);
                      }}
                      className="btn-pooled-cyan w-full sm:w-auto py-2.5 px-5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                    >
                      <span>Tôi đã thanh toán ➔ Kiểm tra kết quả</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
