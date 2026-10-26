import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  QrCode,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  createTopUpPayment,
  type TopUpPackageId,
  type TopUpPaymentResponse,
} from '../../../services/orderService';
import { getMe } from '../../../services/authService';

export interface CreditTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCreditBalance: number) => void;
  initialBalance?: number | null;
}

interface TopUpPackageInfo {
  id: TopUpPackageId;
  name: string;
  priceVnd: number;
  credits: number;
  unitPriceTag: string;
  badge?: string;
  discountBadge?: string;
  isPopular?: boolean;
}

const TOPUP_PACKAGES: TopUpPackageInfo[] = [
  {
    id: 'starter',
    name: 'Gói Khởi Đầu',
    priceVnd: 50000,
    credits: 3,
    unitPriceTag: '~16.6k / lượt',
    badge: 'Khởi đầu',
    isPopular: false,
  },
  {
    id: 'creator',
    name: 'Gói Sáng Tạo',
    priceVnd: 120000,
    credits: 10,
    unitPriceTag: '~12k / lượt',
    badge: 'Khuyên dùng',
    discountBadge: 'Tiết kiệm 28%',
    isPopular: true,
  },
  {
    id: 'studio',
    name: 'Gói Studio',
    priceVnd: 290000,
    credits: 30,
    unitPriceTag: '~9.6k / lượt',
    badge: 'Tiết kiệm nhất',
    discountBadge: 'Tiết kiệm 42%',
    isPopular: false,
  },
];

export default function CreditTopUpModal({
  isOpen,
  onClose,
  onSuccess,
  initialBalance = null,
}: CreditTopUpModalProps) {
  // Modal Stages: 'select_package' | 'creating_qr' | 'payment_qr' | 'success'
  const [stage, setStage] = useState<'select_package' | 'creating_qr' | 'payment_qr' | 'success'>('select_package');
  const [selectedPackageId, setSelectedPackageId] = useState<TopUpPackageId>('creator');
  const [paymentData, setPaymentData] = useState<TopUpPaymentResponse | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [baselineCredits, setBaselineCredits] = useState<number>(initialBalance ?? 0);
  const [updatedCredits, setUpdatedCredits] = useState<number>(initialBalance ?? 0);

  const baselineRef = useRef<number>(initialBalance ?? 0);

  // Sync initial baseline balance
  useEffect(() => {
    if (isOpen) {
      setStage('select_package');
      setErrorMessage(null);
      setPaymentData(null);
      setSecondsRemaining(15 * 60);

      void getMe().then((me) => {
        if (me) {
          const total = (me.freeTrialRemaining ?? 0) + (me.purchasedRemaining ?? 0);
          setBaselineCredits(total);
          baselineRef.current = total;
          setUpdatedCredits(total);
        }
      }).catch(() => {
        // Fallback to prop
      });
    }
  }, [isOpen]);

  const selectedPackage = TOPUP_PACKAGES.find((p) => p.id === selectedPackageId) || TOPUP_PACKAGES[1];

  const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 15-minute QR Countdown timer
  useEffect(() => {
    if (stage !== 'payment_qr') return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  // Handle PayOS VietQR generation
  const handleCreatePayment = async (pkgId?: TopUpPackageId) => {
    const targetId = pkgId || selectedPackageId;
    setErrorMessage(null);
    setStage('creating_qr');

    try {
      const response = await createTopUpPayment({ packageId: targetId });
      if (response && response.success) {
        setPaymentData(response);
        setSecondsRemaining(15 * 60);
        setStage('payment_qr');
      } else {
        throw new Error('Cổng thanh toán PayOS không phản hồi thành công. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          'Không thể khởi tạo mã QR PayOS lúc này. Vui lòng thử lại sau ít phút.',
      );
      setStage('select_package');
    }
  };

  // Background check balance for successful top-up
  const checkPaymentStatus = useCallback(async (manual = false) => {
    if (manual) setIsVerifying(true);
    try {
      const me = await getMe();
      if (me) {
        const total = (me.freeTrialRemaining ?? 0) + (me.purchasedRemaining ?? 0);
        if (total > baselineRef.current) {
          setUpdatedCredits(total);
          setStage('success');
          if (onSuccess) {
            onSuccess(total);
          }
          return true;
        }
      }
    } catch {
      // Ignore background poll errors
    } finally {
      if (manual) setIsVerifying(false);
    }
    return false;
  }, [onSuccess]);

  // Poll every 3.5s when on payment_qr stage
  useEffect(() => {
    if (stage !== 'payment_qr') return;
    const pollInterval = setInterval(() => {
      void checkPaymentStatus(false);
    }, 3500);
    return () => clearInterval(pollInterval);
  }, [stage, checkPaymentStatus]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl shadow-xl overflow-hidden text-[#231F1E] flex flex-col max-h-[92vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2D9D0] bg-[#EFEAE2]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/30 flex items-center justify-center text-[#B83B2A] shadow-sm">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#231F1E] tracking-wide flex items-center gap-2">
                  <span>Nạp Thêm Lượt Tạo 3D</span>
                  <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C]">
                    PayOS VietQR
                  </span>
                </h2>
                <p className="text-[11px] text-[#7A706C]">
                  Số dư:{' '}
                  <span className="font-mono tabular-nums text-[#231F1E] font-medium">
                    {baselineCredits} lượt
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/40 flex items-center gap-2.5 text-xs text-[#231F1E]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#B83B2A]" />
                <span className="flex-1">{errorMessage}</span>
              </motion.div>
            )}

            {/* STAGE 1: SELECT PACKAGE */}
            {stage === 'select_package' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TOPUP_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`relative p-3.5 rounded-xl border text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#FDF2F0] border-[#B83B2A] ring-1 ring-[#B83B2A]/40 shadow-sm'
                            : 'bg-[#FFFFFF] border-[#E2D9D0] hover:border-[#B83B2A]/40 hover:bg-[#F6F3EE]'
                        }`}
                      >
                        {pkg.isPopular && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-[#B83B2A] text-white border-0 tracking-tight shadow-sm">
                            {pkg.badge}
                          </span>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-[#7A706C]">{pkg.name}</h3>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#B83B2A]" />
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-bold font-mono tabular-nums text-[#231F1E]">
                              {pkg.credits}
                            </span>
                            <span className="text-[11px] text-[#7A706C]">lượt</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-[#7A706C] font-mono tabular-nums">
                              {pkg.unitPriceTag}
                            </span>
                            {pkg.discountBadge && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FDF2F0] border border-[#B83B2A]/30 text-[#B83B2A] text-[9.5px] font-semibold whitespace-nowrap">
                                {pkg.discountBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-[#E2D9D0] flex items-center justify-end">
                          <span className="text-base font-semibold font-mono tabular-nums text-[#231F1E]">
                            {formatVnd(pkg.priceVnd)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAGE 2: CREATING QR SPINNER */}
            {stage === 'creating_qr' && (
              <div className="py-14 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#B83B2A]" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#231F1E]">
                    Đang khởi tạo mã PayOS VietQR...
                  </h3>
                  <p className="text-xs text-[#7A706C]">
                    Vui lòng chờ trong giây lát để hệ thống tạo cổng chuyển khoản bảo mật.
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 3: PAYMENT QR */}
            {stage === 'payment_qr' && paymentData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-4 py-1 text-center"
              >
                {/* Countdown Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6F3EE] border border-[#E2D9D0] text-xs font-mono tabular-nums text-[#7A706C]">
                  <Clock className="w-3.5 h-3.5 text-[#B83B2A]" />
                  <span>
                    Mã QR có hiệu lực trong:{' '}
                    <span className="text-[#231F1E] font-semibold">
                      {formatCountdown(secondsRemaining)}
                    </span>
                  </span>
                </div>

                {/* VietQR Frame */}
                <div className="relative p-3 rounded-2xl bg-[#FFFFFF] shadow-sm border border-[#E2D9D0]">
                  {paymentData.qrCode ? (
                    <img
                      src={paymentData.qrCode}
                      alt="PayOS VietQR"
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-52 h-52 flex flex-col items-center justify-center bg-[#F6F3EE] rounded-lg text-[#7A706C] text-xs gap-2">
                      <QrCode className="w-10 h-10 text-[#B83B2A] animate-pulse" />
                      <span>Đang tải mã VietQR...</span>
                    </div>
                  )}
                </div>

                {/* Package Meta Info */}
                <div className="w-full max-w-sm space-y-2 p-3 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] text-xs text-left">
                  <div className="flex justify-between items-center text-[#7A706C]">
                    <span>Gói đã chọn:</span>
                    <span className="font-semibold text-[#231F1E]">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#7A706C]">
                    <span>Số lượt cộng thêm:</span>
                    <span className="font-mono tabular-nums font-bold text-[#B83B2A]">
                      +{paymentData.credits} lượt
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#7A706C]">
                    <span>Số tiền cần chuyển:</span>
                    <span className="font-mono tabular-nums font-bold text-[#231F1E] text-sm">
                      {formatVnd(paymentData.amountVnd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#7A706C] pt-1.5 border-t border-[#E2D9D0]">
                    <span>Mã tham chiếu:</span>
                    <span className="font-mono tabular-nums text-[11px] text-[#7A706C] truncate max-w-[190px]">
                      {paymentData.merchantReference}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-sm flex gap-2">
                  {paymentData.checkoutUrl && (
                    <a
                      href={paymentData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#231F1E] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#7A706C]" />
                      <span>Cổng PayOS Web</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => void checkPaymentStatus(true)}
                    disabled={isVerifying}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white text-xs font-medium border border-[#B83B2A] flex items-center justify-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Kiểm tra thanh toán</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: SUCCESS CELEBRATION */}
            {stage === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center justify-center gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#FDF2F0] border border-[#B83B2A] flex items-center justify-center text-[#B83B2A] shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[#231F1E]">
                    Nạp Lượt Thành Công!
                  </h3>
                  <p className="text-xs text-[#7A706C] max-w-sm">
                    Tài khoản của bạn đã được cộng{' '}
                    <span className="font-mono tabular-nums text-[#B83B2A] font-bold">
                      +{selectedPackage.credits} lượt tạo 3D
                    </span>
                    .
                  </p>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] text-xs text-[#231F1E] font-mono tabular-nums">
                      Tổng số dư khả dụng: <span className="font-bold text-[#B83B2A]">{updatedCredits} lượt</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 px-6 py-2 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-medium text-xs border border-[#B83B2A] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer shadow-sm"
                >
                  Bắt đầu tạo mô hình 3D ngay
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer Bar (Only for select_package stage) */}
          {stage === 'select_package' && (
            <div className="px-5 py-3.5 border-t border-[#E2D9D0] bg-[#EFEAE2]/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#7A706C]">Thanh toán:</div>
                <div className="text-sm font-bold font-mono tabular-nums text-[#231F1E]">
                  {formatVnd(selectedPackage.priceVnd)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
                >
                  Để sau
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreatePayment()}
                  className="px-4 py-1.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-medium text-xs border border-[#B83B2A] flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo mã VietQR PayOS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
