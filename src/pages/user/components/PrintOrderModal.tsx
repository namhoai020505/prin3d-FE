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
  description: string;
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
    description: 'Bền, thân thiện môi trường, chi phí tối ưu cho mô hình tĩnh & decor.',
  },
  'Resin SLA': {
    name: 'Resin SLA',
    label: 'Resin SLA Chi Tiết Cao',
    tag: 'Siêu nét',
    setupFee: 50000,
    infill: 0.85,
    density: 1.15,
    pricePerCm3: 6500,
    surfaceRate: 300,
    description: 'Bề mặt láng mịn tuyệt đối, sắc nét từng milimet cho figure & chi tiết phức tạp.',
  },
  ABS: {
    name: 'ABS',
    label: 'Nhựa Kỹ Thuật ABS/PETG',
    tag: 'Chịu lực & nhiệt',
    setupFee: 40000,
    infill: 0.40,
    density: 1.05,
    pricePerCm3: 3500,
    surfaceRate: 200,
    description: 'Độ bền cơ học cao, chịu nhiệt và va đập tốt cho linh kiện chức năng.',
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

  // Shipping details form
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [district, setDistrict] = useState<string>('Quận 1');
  const [city, setCity] = useState<string>('TP. Hồ Chí Minh');
  const [customerNote, setCustomerNote] = useState<string>('');

  // Payment states
  const [currentOrder, setCurrentOrder] = useState<OrderV2 | null>(null);
  const [paymentAttempt, setPaymentAttempt] = useState<PaymentAttempt | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Load saved shipping details
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIPPING);
      const userFullName = localStorage.getItem('fullName') || '';
      if (saved) {
        const parsed = JSON.parse(saved);
        setReceiverName(parsed.receiverName || userFullName);
        setReceiverPhone(parsed.receiverPhone || '');
        setStreetAddress(parsed.streetAddress || '');
        setDistrict(parsed.district || 'Quận 1');
        setCity(parsed.city || 'TP. Hồ Chí Minh');
      } else if (userFullName) {
        setReceiverName(userFullName);
      }
    } catch {
      // Fallback cleanly
    }
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

  // Volumetric Pricing Formula (Section 4 Specification):
  // V_base = (w_cm * h_cm * d_cm) * 0.35 (solid ratio)
  // A_base = 2 * (w_cm*d_cm + w_cm*h_cm + d_cm*h_cm) * 0.7
  // V_scaled = V_base * (Scale)^3
  // A_scaled = A_base * (Scale)^2
  // Weight = V_scaled * Infill * Density
  // Total Unit Price = SetupFee + (V_scaled * Infill * PricePerCm3) + (A_scaled * SurfaceRate)
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

  // Find or match package ID for backend checkout
  const activePackage = useMemo(() => {
    if (packages.length === 0) return null;
    const matched = packages.find(
      (p) =>
        scaledHeightMm >= p.minHeightMm &&
        scaledHeightMm <= p.maxHeightMm &&
        (p.material.toLowerCase().includes(selectedMaterial.toLowerCase().slice(0, 3))),
    );
    return matched || packages.find((p) => scaledHeightMm >= p.minHeightMm && scaledHeightMm <= p.maxHeightMm) || packages[0];
  }, [packages, scaledHeightMm, selectedMaterial]);

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

  // Handle checkout submission
  const handleProceedToPayment = async () => {
    if (!receiverName.trim() || !receiverPhone.trim() || !streetAddress.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ giao hàng.');
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

      const targetVersionId = asset.versionId || asset.id;
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
        pricingPackageId: activePackage?.id || selectedPackageId || '00000000-0000-0000-0000-000000000000',
        quantity,
        address: {
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),
          streetAddress: streetAddress.trim(),
          district: district.trim(),
          city: city.trim(),
          customerNote: customerNote.trim() || null,
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
      const error = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
      setErrorMessage(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Không thể khởi tạo đơn hàng PayOS lúc này. Vui lòng thử lại sau ít phút.',
      );
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        {/* Modal Window in 100% Wabi-Sabi Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl bg-[#181816] border border-[#33322E] rounded-2xl shadow-2xl overflow-hidden text-[#E2DFD7] flex flex-col max-h-[92vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#33322E] bg-[#22221F]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#22221F] border border-[#33322E] flex items-center justify-center text-[#4A5D4E] shadow-sm">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#E2DFD7] tracking-wide flex items-center gap-2">
                  <span>Đặt In 3D Chi Tiết</span>
                  <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#22221F] border border-[#33322E] text-[#8C8881]">
                    PayOS VietQR
                  </span>
                </h2>
                <p className="text-[11px] text-[#8C8881] truncate max-w-sm">
                  {asset.name} · {scaledWidthMm}×{scaledHeightMm}×{scaledDepthMm} mm
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8C8881] hover:text-[#E2DFD7] hover:bg-[#22221F] transition-colors cursor-pointer"
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
                className="p-3 rounded-xl bg-[#A85448]/15 border border-[#A85448]/40 flex items-center gap-2.5 text-xs text-[#E2DFD7]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#A85448]" />
                <span className="flex-1">{errorMessage}</span>
              </motion.div>
            )}

            {/* STAGE 1: CONFIGURE & VOLUMETRIC CALCULATOR */}
            {stage === 'configure' && (
              <div className="space-y-4">
                {/* Live Volumetric Calculator Telemetry Bar */}
                <div className="p-3.5 rounded-xl bg-[#22221F] border border-[#33322E] flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#E2DFD7]">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#4A5D4E]" />
                      <span>Thông số kỹ thuật & Khối lượng tính toán (Live)</span>
                    </span>
                    <span className="text-[10px] text-[#8C8881] font-mono tabular-nums">
                      Tỷ lệ phóng đại: {Math.round(scaleFactor * 100)}%
                    </span>
                  </div>

                  {/* Live Scale Slider */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-[#8C8881]">
                      <span>Thu nhỏ (0.5x / 50%)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#E2DFD7]">
                        {scaleFactor.toFixed(2)}x ({scaledHeightMm} mm)
                      </span>
                      <span>Phóng to (2.0x / 200%)</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={scaleFactor}
                      onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                      className="w-full accent-[#4A5D4E] bg-[#181816] rounded-lg h-2 cursor-pointer border border-[#33322E]"
                    />
                  </div>

                  {/* 4 Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#33322E]">
                    <div className="p-2 rounded-lg bg-[#181816] border border-[#33322E]">
                      <div className="text-[10px] text-[#8C8881]">Kích thước thực</div>
                      <div className="text-xs font-mono tabular-nums font-medium text-[#E2DFD7] mt-0.5">
                        {scaledWidthMm}×{scaledDepthMm}×{scaledHeightMm} mm
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#181816] border border-[#33322E]">
                      <div className="text-[10px] text-[#8C8881]">Thể tích (V_scaled)</div>
                      <div className="text-xs font-mono tabular-nums font-medium text-[#4A5D4E] mt-0.5">
                        {volumeScaledCm3.toFixed(1)} cm³
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#181816] border border-[#33322E]">
                      <div className="text-[10px] text-[#8C8881]">Diện tích bề mặt</div>
                      <div className="text-xs font-mono tabular-nums font-medium text-[#E2DFD7] mt-0.5">
                        {areaScaledCm2.toFixed(1)} cm²
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#181816] border border-[#33322E]">
                      <div className="text-[10px] text-[#8C8881]">Trọng lượng ước tính</div>
                      <div className="text-xs font-mono tabular-nums font-medium text-[#4A5D4E] mt-0.5">
                        ~{estimatedWeightGrams} g
                      </div>
                    </div>
                  </div>
                </div>

                {/* Material Selection: 3 Materials per TEAM_STATE.md */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#E2DFD7] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#4A5D4E]" />
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
                          className={`p-3 rounded-xl border text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-[#22221F] border-[#4A5D4E] ring-1 ring-[#4A5D4E]/40 shadow-sm'
                              : 'bg-[#22221F]/60 border-[#33322E] hover:border-[#4A5D4E]/40 hover:bg-[#22221F]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#E2DFD7]">{item.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#181816] border border-[#33322E] text-[#8C8881]">
                                {item.tag}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#8C8881] mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="pt-1.5 border-t border-[#33322E] flex justify-between items-center text-[10px] font-mono tabular-nums text-[#8C8881]">
                            <span>Infill {Math.round(item.infill * 100)}%</span>
                            <span className="text-[#4A5D4E] font-medium">
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
                    <label className="text-[11px] font-medium text-[#8C8881]">Số lượng bản in</label>
                    <div className="flex items-center justify-between bg-[#22221F] px-3 py-1.5 rounded-xl border border-[#33322E]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-lg bg-[#181816] hover:bg-[#33322E] text-[#E2DFD7] flex items-center justify-center font-bold text-sm cursor-pointer border border-[#33322E]"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold font-mono tabular-nums text-[#E2DFD7]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        className="w-7 h-7 rounded-lg bg-[#181816] hover:bg-[#33322E] text-[#E2DFD7] flex items-center justify-center font-bold text-sm cursor-pointer border border-[#33322E]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#8C8881]">Độ mịn lớp in (Layer Height)</label>
                    <div className="flex items-center justify-between bg-[#22221F] px-3 py-2 rounded-xl border border-[#33322E] text-xs font-mono tabular-nums text-[#E2DFD7]">
                      <span>{layerHeightMm} mm</span>
                      <span className="text-[10px] text-[#8C8881] font-sans">Chuẩn xưởng</span>
                    </div>
                  </div>
                </div>

                {/* Shipping & Contact Form */}
                <div className="space-y-2.5 pt-2 border-t border-[#33322E]">
                  <div className="text-xs font-semibold text-[#E2DFD7] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#4A5D4E]" />
                    <span>Địa chỉ giao hàng & liên hệ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8C8881]" />
                      <input
                        type="text"
                        placeholder="Họ và tên người nhận"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-[#E2DFD7] placeholder:text-[#8C8881] focus:border-[#4A5D4E] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8C8881]" />
                      <input
                        type="tel"
                        placeholder="Số điện thoại di động"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-[#E2DFD7] placeholder:text-[#8C8881] focus:border-[#4A5D4E] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Địa chỉ số nhà, tên đường..."
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-[#E2DFD7] placeholder:text-[#8C8881] focus:border-[#4A5D4E] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Quận / Huyện"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-[#E2DFD7] placeholder:text-[#8C8881] focus:border-[#4A5D4E] focus:outline-none transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Tỉnh / Thành phố"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-[#E2DFD7] placeholder:text-[#8C8881] focus:border-[#4A5D4E] focus:outline-none transition-colors"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Ghi chú in & giao hàng (tuỳ chọn)..."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-[#E2DFD7] placeholder:text-[#8C8881] focus:border-[#4A5D4E] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* STAGE 2: SUBMITTING SPINNER */}
            {stage === 'submitting' && (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#4A5D4E]" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#E2DFD7]">
                    Đang tính toán báo giá volumetric & tạo mã PayOS VietQR...
                  </h3>
                  <p className="text-xs text-[#8C8881]">
                    Hệ thống đang khóa thông số kỹ thuật 3D và tạo phiên thanh toán bảo mật.
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 3: PAYOS VIETQR DYNAMIC DISPLAY */}
            {stage === 'payment_qr' && paymentAttempt && currentOrder && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-4 py-2 text-center"
              >
                {/* Countdown Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#22221F] border border-[#33322E] text-xs font-mono tabular-nums text-[#8C8881]">
                  <Clock className="w-3.5 h-3.5 text-[#4A5D4E]" />
                  <span>
                    Mã QR có hiệu lực trong:{' '}
                    <span className="text-[#E2DFD7] font-semibold">
                      {formatCountdown(secondsRemaining)}
                    </span>
                  </span>
                </div>

                {/* QR Container */}
                <div className="relative p-3 rounded-2xl bg-[#FFFFFF] shadow-xl border border-[#33322E]">
                  {paymentAttempt.qrCode ? (
                    <img
                      src={paymentAttempt.qrCode}
                      alt="PayOS VietQR"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-[#181816] rounded-lg text-[#8C8881] text-xs gap-2">
                      <QrCode className="w-10 h-10 text-[#4A5D4E] animate-pulse" />
                      <span>Đang tải mã VietQR...</span>
                    </div>
                  )}
                </div>

                {/* Order Meta Info */}
                <div className="w-full max-w-sm space-y-2 p-3 rounded-xl bg-[#22221F] border border-[#33322E] text-xs text-left">
                  <div className="flex justify-between items-center text-[#8C8881]">
                    <span>Mã đơn hàng:</span>
                    <span className="font-mono tabular-nums font-semibold text-[#E2DFD7]">
                      {currentOrder.orderCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#8C8881]">
                    <span>Chất liệu & kích thước:</span>
                    <span className="font-medium text-[#E2DFD7]">
                      {selectedMaterial} · {scaledHeightMm}mm ({quantity} cái)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#8C8881]">
                    <span>Số tiền thanh toán:</span>
                    <span className="font-mono tabular-nums font-bold text-[#4A5D4E] text-sm">
                      {formatVnd(paymentAttempt.amountVnd || currentOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#8C8881] pt-1.5 border-t border-[#33322E]">
                    <span>Phương thức:</span>
                    <span className="text-[#E2DFD7]">Chuyển khoản 24/7 PayOS VietQR</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full max-w-sm flex gap-2">
                  {paymentAttempt.checkoutUrl && (
                    <a
                      href={paymentAttempt.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-[#22221F] hover:bg-[#33322E] border border-[#33322E] text-[#E2DFD7] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#8C8881]" />
                      <span>Cổng PayOS Web</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => void checkPaymentStatus()}
                    disabled={isVerifyingPayment}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#4A5D4E] hover:bg-[#3d4d40] text-[#E2DFD7] text-xs font-medium border border-[#33322E] flex items-center justify-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer disabled:opacity-50"
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
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#4A5D4E]/20 border border-[#4A5D4E] flex items-center justify-center text-[#4A5D4E] shadow-lg">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[#E2DFD7]">Thanh Toán Thành Công!</h3>
                  <p className="text-xs text-[#8C8881] max-w-sm">
                    Đơn hàng{' '}
                    <span className="text-[#E2DFD7] font-mono tabular-nums font-semibold">
                      {currentOrder.orderCode}
                    </span>{' '}
                    đã được thanh toán. Đội ngũ kỹ thuật xưởng TheBoys sẽ tiến hành xử lý mô hình và đưa vào dây chuyền in 3D ngay lập tức.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 px-6 py-2 rounded-xl bg-[#4A5D4E] hover:bg-[#3d4d40] text-[#E2DFD7] font-medium text-xs border border-[#33322E] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer"
                >
                  Hoàn tất & Quay lại Studio
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer Bar (Only for Configure Stage) */}
          {stage === 'configure' && (
            <div className="px-5 py-3.5 border-t border-[#33322E] bg-[#22221F]/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#8C8881]">
                  Tổng thanh toán (gồm ship {formatVnd(SHIPPING_FEE_VND)}):
                </div>
                <div className="text-sm sm:text-base font-bold text-[#4A5D4E] font-mono tabular-nums">
                  {formatVnd(estimatedTotalVnd)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#8C8881] hover:text-[#E2DFD7] hover:bg-[#22221F] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleProceedToPayment()}
                  className="px-4 py-1.5 rounded-xl bg-[#4A5D4E] hover:bg-[#3d4d40] text-[#E2DFD7] font-medium text-xs border border-[#33322E] flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Xác Nhận & Lấy Mã VietQR</span>
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
