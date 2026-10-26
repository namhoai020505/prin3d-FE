import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layers,
  MapPin,
  Phone,
  User,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Loader2,
  Box,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import {
  createApproval,
  createQuote,
  checkoutOrderV2,
  createPaymentAttempt,
  getPaymentAttempts,
  type PaymentAttempt,
  type OrderV2,
} from '../../../services/orderService';
import {
  listPricingPackages,
  type PricingPackage,
} from '../../../services/pricingPackageService';
import { getAuthFullName } from '../../../lib/auth';
import { getMe } from '../../../services/authService';

export interface PrintOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    versionId?: string | null;
    name: string;
    glbUrl?: string | null;
    stlUrl?: string | null;
  };
  dimensions: { x: number; y: number; z: number };
  infillDensity?: number;
  layerHeightMm?: number;
  initialMaterial?: MaterialType;
}

export type MaterialType = 'PLA' | 'Resin SLA' | 'ABS';

interface MaterialConfig {
  name: MaterialType;
  label: string;
  tag: string;
  setupFee: number;
  infill: number;
  density: number; // g/cm³
  pricePerCm3: number;
  surfaceRate: number; // per cm²
}

const MATERIAL_PRESETS: Record<MaterialType, MaterialConfig> = {
  PLA: {
    name: 'PLA',
    label: 'Nhựa PLA Tiêu Chuẩn',
    tag: 'Tiêu chuẩn',
    setupFee: 35000,
    infill: 0.25,
    density: 1.25,
    pricePerCm3: 2500,
    surfaceRate: 150,
  },
  'Resin SLA': {
    name: 'Resin SLA',
    label: 'Resin SLA Chi Tiết Cao',
    tag: 'Siêu mịn',
    setupFee: 50000,
    infill: 0.85,
    density: 1.15,
    pricePerCm3: 6500,
    surfaceRate: 300,
  },
  ABS: {
    name: 'ABS',
    label: 'Nhựa Kỹ Thuật ABS/PETG',
    tag: 'Chịu lực',
    setupFee: 40000,
    infill: 0.40,
    density: 1.05,
    pricePerCm3: 3500,
    surfaceRate: 200,
  },
};

const STORAGE_KEY_SHIPPING = 'theboys_shipping_info';
const SHIPPING_FEE_VND = 30000;

export default function PrintOrderModal({
  isOpen,
  onClose,
  asset,
  dimensions,
  layerHeightMm = 0.2,
  initialMaterial = 'PLA',
}: PrintOrderModalProps) {
  // Modal Stages: 'configure' | 'submitting' | 'payment_qr' | 'success'
  const [stage, setStage] = useState<'configure' | 'submitting' | 'payment_qr' | 'success'>('configure');

  // Interactive Live Scale Slider: 0.5x to 2.0x (default 1.0x)
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);

  // Selected Material
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(initialMaterial);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (isOpen && initialMaterial) {
      setSelectedMaterial(initialMaterial);
    }
  }, [isOpen, initialMaterial]);

  // Pricing Packages fetched from backend
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  // Shipping details form (No hardcoded values: start clean with helpful placeholders)
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [city, setCity] = useState<string>('TP. Hồ Chí Minh');
  const [customerNote, setCustomerNote] = useState<string>('');

  // Payment states
  const [currentOrder, setCurrentOrder] = useState<OrderV2 | null>(null);
  const [paymentAttempt, setPaymentAttempt] = useState<PaymentAttempt | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Load saved shipping details or initialize from auth user
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIPPING);
      const userFullName = getAuthFullName() || localStorage.getItem('fullName') || '';
      if (saved) {
        const parsed = JSON.parse(saved);
        setReceiverName(parsed.receiverName || userFullName);
        setReceiverPhone(parsed.receiverPhone || '');
        setStreetAddress(parsed.streetAddress || '');
        setDistrict(parsed.district || '');
        setCity(parsed.city || 'TP. Hồ Chí Minh');
      } else {
        if (userFullName) setReceiverName(userFullName);
        setReceiverPhone('');
        setStreetAddress('');
        setDistrict('');
        setCity('TP. Hồ Chí Minh');
      }
    } catch {
      // Fallback cleanly
    }

    // Attempt to enrich name from profile
    void getMe()
      .then((me) => {
        if (me?.fullName) {
          setReceiverName((prev) => prev || me.fullName);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Pricing Packages
  useEffect(() => {
    let isMounted = true;
    listPricingPackages()
      .then((pkgs) => {
        if (!isMounted) return;
        if (pkgs && pkgs.length > 0) {
          setPackages(pkgs);
          setSelectedPackageId(pkgs[0].id);
        }
      })
      .catch(() => {
        // Fallback cleanly
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Base geometry calculations
  const baseWidthMm = dimensions.x || 85;
  const baseHeightMm = dimensions.y || 120;
  const baseDepthMm = dimensions.z || 85;

  const scaledWidthMm = Math.round(baseWidthMm * scaleFactor);
  const scaledHeightMm = Math.round(baseHeightMm * scaleFactor);
  const scaledDepthMm = Math.round(baseDepthMm * scaleFactor);

  const baseVolumeCm3 = useMemo(() => {
    const wCm = baseWidthMm / 10;
    const hCm = baseHeightMm / 10;
    const dCm = baseDepthMm / 10;
    return Math.max(5, (wCm * hCm * dCm) * 0.35);
  }, [baseWidthMm, baseHeightMm, baseDepthMm]);

  const baseAreaCm2 = useMemo(() => {
    const wCm = baseWidthMm / 10;
    const hCm = baseHeightMm / 10;
    const dCm = baseDepthMm / 10;
    return Math.max(10, 2 * (wCm * dCm + wCm * hCm + dCm * hCm) * 0.7);
  }, [baseWidthMm, baseHeightMm, baseDepthMm]);

  const volumeScaledCm3 = useMemo(() => {
    return baseVolumeCm3 * Math.pow(scaleFactor, 3);
  }, [baseVolumeCm3, scaleFactor]);

  const areaScaledCm2 = useMemo(() => {
    return baseAreaCm2 * Math.pow(scaleFactor, 2);
  }, [baseAreaCm2, scaleFactor]);

  const matConfig = MATERIAL_PRESETS[selectedMaterial];

  const estimatedWeightGrams = useMemo(() => {
    return Math.max(1, Math.round(volumeScaledCm3 * matConfig.infill * matConfig.density));
  }, [volumeScaledCm3, matConfig]);

  const unitPriceVnd = useMemo(() => {
    const raw = matConfig.setupFee +
      (volumeScaledCm3 * matConfig.infill * matConfig.pricePerCm3) +
      (areaScaledCm2 * matConfig.surfaceRate);
    return Math.round(raw / 1000) * 1000;
  }, [matConfig, volumeScaledCm3, areaScaledCm2]);

  const estimatedSubtotalVnd = unitPriceVnd * quantity;
  const estimatedTotalVnd = estimatedSubtotalVnd + SHIPPING_FEE_VND;


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

  // Background polling for payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!currentOrder) return;
    setIsVerifyingPayment(true);
    try {
      const attempts = await getPaymentAttempts(currentOrder.id);
      const isPaid = attempts.some(
        (a) =>
          a.status.toLowerCase() === 'captured' ||
          a.status.toLowerCase() === 'paid' ||
          a.status.toLowerCase() === 'success',
      );
      if (isPaid) {
        setStage('success');
      }
    } catch {
      // Ignore background poll errors
    } finally {
      setIsVerifyingPayment(false);
    }
  }, [currentOrder]);

  useEffect(() => {
    if (stage !== 'payment_qr' || !currentOrder) return;
    const pollInterval = setInterval(() => {
      void checkPaymentStatus();
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [stage, currentOrder, checkPaymentStatus]);

  // Handle checkout submission with full validation & friendly Vietnamese messages
  const handleProceedToPayment = async () => {
    if (!receiverName.trim() || !receiverPhone.trim() || !streetAddress.trim() || !district.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ họ tên, số điện thoại, số nhà và quận/huyện nhận hàng.');
      return;
    }

    setErrorMessage(null);
    setStage('submitting');

    try {
      // Persist shipping details
      localStorage.setItem(
        STORAGE_KEY_SHIPPING,
        JSON.stringify({ receiverName, receiverPhone, streetAddress, district, city }),
      );

      // Ensure pricing packages are resolved
      let currentPackages = packages;
      if (currentPackages.length === 0) {
        try {
          const fetched = await listPricingPackages();
          if (fetched && fetched.length > 0) {
            setPackages(fetched);
            currentPackages = fetched;
          }
        } catch {
          // ignore
        }
      }

      const matchedPackage =
        currentPackages.find(
          (p) =>
            scaledHeightMm >= p.minHeightMm &&
            scaledHeightMm <= p.maxHeightMm &&
            p.material.toLowerCase().includes(selectedMaterial.toLowerCase().slice(0, 3)),
        ) ||
        currentPackages.find(
          (p) => scaledHeightMm >= p.minHeightMm && scaledHeightMm <= p.maxHeightMm,
        ) ||
        currentPackages[0];

      if (!matchedPackage?.id) {
        setErrorMessage('Chưa thể kết nối tới bảng giá xưởng in lúc này. Vui lòng thử lại sau.');
        setStage('configure');
        return;
      }

      const targetVersionId = asset.versionId || asset.id;
      const isValidGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetVersionId,
      );

      if (!isValidGuid) {
        setErrorMessage(
          'Mô hình hiện tại đang ở chế độ xem trước cục bộ (chưa có mã phiên bản trên hệ thống). Vui lòng tạo mô hình từ ảnh trong Studio để tiến hành đặt in.',
        );
        setStage('configure');
        return;
      }

      const printConfig = {
        heightMm: scaledHeightMm,
        widthMm: scaledWidthMm,
        depthMm: scaledDepthMm,
        scale: scaleFactor,
        material: selectedMaterial,
        infillDensity: Math.round(matConfig.infill * 100),
        layerHeightMm,
        volumeCm3: Math.round(volumeScaledCm3 * 10) / 10,
        areaCm2: Math.round(areaScaledCm2 * 10) / 10,
        weightGrams: estimatedWeightGrams,
        unitPriceVnd,
      };

      // 1. Create Customer Approval
      await createApproval({
        versionId: targetVersionId,
        configuration: printConfig,
        policyVersion: 'v1.0',
      });

      // 2. Request Formal Quote
      const quote = await createQuote({
        versionId: targetVersionId,
        configuration: printConfig,
        pricingPackageId: matchedPackage.id || selectedPackageId,
        quantity,
        address: {
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),
          streetAddress: streetAddress.trim(),
          district: district.trim(),
          city: (city.trim() || 'TP. Hồ Chí Minh'),
          customerNote: customerNote.trim() || undefined,
        },
      });

      // 3. Checkout Quote to Order
      const order = await checkoutOrderV2({
        quoteId: quote.id,
      });
      setCurrentOrder(order);

      // 4. Create PayOS Payment Attempt
      const attempt = await createPaymentAttempt(order.id, {
        note: `Thanh toan don in 3D ${order.orderCode}`,
      });
      setPaymentAttempt(attempt);

      // 5. Open QR Modal
      setSecondsRemaining(15 * 60);
      setStage('payment_qr');
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { message?: string; detail?: string; error?: string; title?: string };
        };
        message?: string;
      };

      const serverMsg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.response?.data?.title;

      let friendlyMsg = 'Không thể khởi tạo đơn đặt in lúc này. Vui lòng kiểm tra lại thông tin và thử lại sau ít phút.';

      if (serverMsg) {
        if (serverMsg.includes('VersionNotFound') || serverMsg.includes('Không tìm thấy phiên bản')) {
          friendlyMsg = 'Mô hình này chưa được lưu trên hệ thống hoặc không thuộc tài khoản của bạn.';
        } else if (serverMsg.includes('ApprovalRequired') || serverMsg.includes('ReviewRequired')) {
          friendlyMsg = 'Mô hình đang chờ kỹ thuật viên kiểm duyệt trước khi có thể đặt in.';
        } else if (serverMsg.includes('InvalidAddress') || serverMsg.includes('Địa chỉ')) {
          friendlyMsg = 'Vui lòng kiểm tra lại địa chỉ giao hàng (cần đủ Họ tên, SĐT, Số nhà và Quận/Huyện).';
        } else if (serverMsg.includes('PackageNotFound')) {
          friendlyMsg = 'Gói in xưởng không hợp lệ. Vui lòng tải lại trang và chọn lại kích thước.';
        } else if (serverMsg.includes('HeightOutOfRange')) {
          friendlyMsg = serverMsg;
        } else if (!serverMsg.toLowerCase().includes('status code 400')) {
          friendlyMsg = serverMsg;
        }
      } else if (error.response?.status === 400) {
        friendlyMsg = 'Thông tin cấu hình in hoặc địa chỉ nhận hàng chưa hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.response?.status === 401) {
        friendlyMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
      }

      setErrorMessage(friendlyMsg);
      setStage('configure');
    }
  };

  const formatVnd = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        {/* Modal Window in 100% Light Wabi-Sabi & Vermilion Red Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl shadow-[0_20px_60px_rgba(35,31,30,0.14)] overflow-hidden text-[#231F1E] flex flex-col max-h-[92vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2D9D0] bg-[#EFEAE2]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] shadow-sm">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#231F1E] tracking-wide flex items-center gap-2">
                  <span>Đặt in 3D</span>
                  <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#FDF2F0] border border-[#B83B2A]/20 text-[#B83B2A] font-semibold">
                    PayOS VietQR
                  </span>
                </h2>
                <p className="text-[11px] text-[#7A706C] truncate max-w-sm">
                  {asset.name} · {scaledWidthMm}×{scaledHeightMm}×{scaledDepthMm} mm
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
              aria-label="Đóng bảng đặt in"
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
                className="p-3 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/30 flex items-center gap-2.5 text-xs text-[#B83B2A] font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#B83B2A]" />
                <span className="flex-1">{errorMessage}</span>
              </motion.div>
            )}

            {/* STAGE 1: CONFIGURE & VOLUMETRIC CALCULATOR */}
            {stage === 'configure' && (
              <div className="space-y-4">
                {/* Live Volumetric Calculator Telemetry Bar */}
                <div className="p-3.5 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#231F1E]">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#B83B2A]" />
                      <span>Kích thước &amp; Định lượng</span>
                    </span>
                    <span className="text-[10px] text-[#7A706C] font-mono tabular-nums">
                      Tỷ lệ: {Math.round(scaleFactor * 100)}%
                    </span>
                  </div>

                  {/* Live Scale Slider */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-[#7A706C]">
                      <span>0.5x (50%)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#231F1E]">
                        {scaleFactor.toFixed(2)}x ({scaledHeightMm} mm)
                      </span>
                      <span>2.0x (200%)</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={scaleFactor}
                      onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                      className="w-full accent-[#B83B2A] bg-[#EFEAE2] rounded-lg h-2 cursor-pointer border border-[#E2D9D0]"
                    />
                  </div>

                  {/* 4 Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E2D9D0]">
                    <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0]">
                      <div className="text-[10px] text-[#7A706C]">Kích thước</div>
                      <div className="text-xs font-mono tabular-nums font-semibold text-[#231F1E] mt-0.5">
                        {scaledWidthMm}×{scaledDepthMm}×{scaledHeightMm} mm
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0]">
                      <div className="text-[10px] text-[#7A706C]">Thể tích</div>
                      <div className="text-xs font-mono tabular-nums font-semibold text-[#B83B2A] mt-0.5">
                        {volumeScaledCm3.toFixed(1)} cm³
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0]">
                      <div className="text-[10px] text-[#7A706C]">Diện tích bề mặt</div>
                      <div className="text-xs font-mono tabular-nums font-semibold text-[#231F1E] mt-0.5">
                        {areaScaledCm2.toFixed(1)} cm²
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0]">
                      <div className="text-[10px] text-[#7A706C]">Trọng lượng</div>
                      <div className="text-xs font-mono tabular-nums font-semibold text-[#B83B2A] mt-0.5">
                        ~{estimatedWeightGrams} g
                      </div>
                    </div>
                  </div>
                </div>

                {/* Material Selection: 3 Cards strictly matching Section 2 specification */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#231F1E] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#B83B2A]" />
                    <span>Chọn chất liệu in 3D</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(Object.keys(MATERIAL_PRESETS) as MaterialType[]).map((matKey) => {
                      const item = MATERIAL_PRESETS[matKey];
                      const isSelected = selectedMaterial === matKey;
                      return (
                        <button
                          key={matKey}
                          type="button"
                          onClick={() => setSelectedMaterial(matKey)}
                          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-[#FDF2F0] border-[#B83B2A] ring-1 ring-[#B83B2A]/40 shadow-sm'
                              : 'bg-[#FFFFFF] border-[#E2D9D0] hover:border-[#B83B2A]/40 hover:bg-[#EFEAE2]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-[#231F1E]">{item.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                                isSelected
                                  ? 'bg-[#B83B2A] text-white border-[#B83B2A]'
                                  : 'bg-[#EFEAE2] text-[#7A706C] border-[#E2D9D0]'
                              }`}
                            >
                              {item.tag}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#E2D9D0] flex justify-between items-center text-[11px] font-mono tabular-nums">
                            <span className="text-[#7A706C]">Infill {Math.round(item.infill * 100)}%</span>
                            <span className="text-[#B83B2A] font-bold">
                              {formatVnd(item.pricePerCm3)}/cm³
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity & Layer Height */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#7A706C]">Số lượng bản in</label>
                    <div className="flex items-center justify-between bg-[#FFFFFF] px-3 py-1.5 rounded-xl border border-[#E2D9D0]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-lg bg-[#F6F3EE] hover:bg-[#EFEAE2] text-[#231F1E] flex items-center justify-center font-bold text-sm cursor-pointer border border-[#E2D9D0] transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold font-mono tabular-nums text-[#231F1E]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        className="w-7 h-7 rounded-lg bg-[#F6F3EE] hover:bg-[#EFEAE2] text-[#231F1E] flex items-center justify-center font-bold text-sm cursor-pointer border border-[#E2D9D0] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#7A706C]">Độ mịn lớp in (Layer Height)</label>
                    <div className="flex items-center justify-between bg-[#FFFFFF] px-3 py-2 rounded-xl border border-[#E2D9D0] text-xs font-mono tabular-nums text-[#231F1E]">
                      <span>{layerHeightMm} mm</span>
                      <span className="text-[10px] text-[#7A706C] font-sans">Chuẩn xưởng TheBoys</span>
                    </div>
                  </div>
                </div>

                {/* Shipping & Contact Form */}
                <div className="space-y-2.5 pt-2 border-t border-[#E2D9D0]">
                  <div className="text-xs font-semibold text-[#231F1E] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#B83B2A]" />
                    <span>Địa chỉ giao hàng &amp; liên hệ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#7A706C]" />
                      <input
                        type="text"
                        placeholder="Họ và tên người nhận"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#7A706C]" />
                      <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường..."
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Quận / Huyện"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 focus:outline-none transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Tỉnh / Thành phố"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 focus:outline-none transition-colors"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Ghi chú in & giao hàng (tuỳ chọn)..."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* STAGE 2: SUBMITTING SPINNER */}
            {stage === 'submitting' && (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#B83B2A]" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#231F1E]">
                    Đang tính toán báo giá &amp; tạo mã PayOS VietQR...
                  </h3>
                  <p className="text-xs text-[#7A706C]">
                    Hệ thống đang khóa cấu hình kỹ thuật và tạo phiên thanh toán bảo mật.
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 3: PAYOS VIETQR DYNAMIC DISPLAY */}
            {stage === 'payment_qr' && paymentAttempt && currentOrder && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-4 py-2 text-center"
              >
                {/* Countdown Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF2F0] border border-[#B83B2A]/20 text-xs font-mono tabular-nums text-[#B83B2A]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Mã QR có hiệu lực trong:{' '}
                    <span className="font-bold">
                      {formatCountdown(secondsRemaining)}
                    </span>
                  </span>
                </div>

                {/* QR Container */}
                <div className="relative p-3 rounded-2xl bg-[#FFFFFF] shadow-md border border-[#E2D9D0]">
                  {paymentAttempt.qrCode ? (
                    <img
                      src={paymentAttempt.qrCode}
                      alt="PayOS VietQR"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-[#F6F3EE] rounded-lg text-[#7A706C] text-xs gap-2">
                      <QrCode className="w-10 h-10 text-[#B83B2A] animate-pulse" />
                      <span>Đang tải mã VietQR...</span>
                    </div>
                  )}
                </div>

                {/* Order Meta Info */}
                <div className="w-full max-w-sm space-y-2 p-3.5 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] text-xs text-left">
                  <div className="flex justify-between items-center text-[#7A706C]">
                    <span>Mã đơn hàng:</span>
                    <span className="font-mono tabular-nums font-bold text-[#231F1E]">
                      {currentOrder.orderCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#7A706C]">
                    <span>Chất liệu &amp; số lượng:</span>
                    <span className="font-medium text-[#231F1E]">
                      {selectedMaterial} · {scaledHeightMm}mm ({quantity} cái)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#7A706C]">
                    <span>Số tiền thanh toán:</span>
                    <span className="font-mono tabular-nums font-bold text-[#B83B2A] text-sm">
                      {formatVnd(paymentAttempt.amountVnd || currentOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#7A706C] pt-1.5 border-t border-[#E2D9D0]">
                    <span>Phương thức:</span>
                    <span className="text-[#231F1E] font-medium">Chuyển khoản 24/7 PayOS VietQR</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full max-w-sm flex gap-2">
                  {paymentAttempt.checkoutUrl && (
                    <a
                      href={paymentAttempt.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#231F1E] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#7A706C]" />
                      <span>Cổng PayOS</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => void checkPaymentStatus()}
                    disabled={isVerifyingPayment}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isVerifyingPayment ? (
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
            {stage === 'success' && currentOrder && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#FDF2F0] border border-[#B83B2A]/30 flex items-center justify-center text-[#B83B2A] shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#231F1E]">Thanh Toán Thành Công!</h3>
                  <p className="text-xs text-[#7A706C] max-w-sm leading-relaxed">
                    Đơn hàng{' '}
                    <span className="text-[#231F1E] font-mono tabular-nums font-bold">
                      {currentOrder.orderCode}
                    </span>{' '}
                    đã được thanh toán. Đội ngũ xưởng sẽ tiếp nhận xử lý mô hình và đưa vào in ấn ngay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 px-6 py-2 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Hoàn tất &amp; Quay lại Studio
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer Bar (Only for Configure Stage) */}
          {stage === 'configure' && (
            <div className="px-5 py-3.5 border-t border-[#E2D9D0] bg-[#EFEAE2]/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#7A706C]">
                  Tổng thanh toán (gồm ship {formatVnd(SHIPPING_FEE_VND)}):
                </div>
                <div className="text-sm sm:text-base font-bold text-[#B83B2A] font-mono tabular-nums">
                  {formatVnd(estimatedTotalVnd)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleProceedToPayment()}
                  className="px-4 py-1.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Xác nhận &amp; Lấy mã VietQR</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
