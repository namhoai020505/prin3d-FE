import { useState } from 'react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Box,
  Truck,
  Layers,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import CreditTopUpModal from './components/CreditTopUpModal';

interface AiCreditPackage {
  id: 'starter' | 'creator' | 'studio';
  name: string;
  priceVnd: number;
  credits: number;
  unitPrice: string;
  badge?: string;
  isPopular?: boolean;
  desc: string;
}

const AI_PACKAGES: AiCreditPackage[] = [
  {
    id: 'starter',
    name: 'Gói Khởi Đầu',
    priceVnd: 50000,
    credits: 3,
    unitPrice: '~16.6k / lượt',
    desc: 'Phù hợp thử nghiệm ý tưởng ban đầu và tạo mô hình nhỏ',
  },
  {
    id: 'creator',
    name: 'Gói Sáng Tạo',
    priceVnd: 120000,
    credits: 10,
    unitPrice: '~12k / lượt',
    badge: 'Phổ biến nhất',
    isPopular: true,
    desc: 'Tiết kiệm 28% chi phí, lý tưởng cho nhà thiết kế cá nhân',
  },
  {
    id: 'studio',
    name: 'Gói Studio',
    priceVnd: 290000,
    credits: 30,
    unitPrice: '~9.6k / lượt',
    badge: 'Tiết kiệm 42%',
    desc: 'Tối ưu chi phí cho xưởng in và dự án sản xuất hàng loạt',
  },
];

interface PrintMaterialItem {
  id: string;
  name: string;
  unitPriceVnd: number;
  tag: string;
  setupFee: number;
  highlight: string;
  features: string[];
}

const MATERIAL_PRICES: PrintMaterialItem[] = [
  {
    id: 'pla',
    name: 'Nhựa PLA',
    unitPriceVnd: 2500,
    tag: 'Tiêu chuẩn',
    setupFee: 35000,
    highlight: 'Chi phí tối ưu, thân thiện môi trường',
    features: [
      'Công nghệ in FDM tiêu chuẩn',
      'Độ chính xác ±0.15mm',
      'Phù hợp decor & mô hình tĩnh',
      'Đã gồm xử lý support cơ bản',
    ],
  },
  {
    id: 'abs',
    name: 'Nhựa ABS / PETG',
    unitPriceVnd: 3500,
    tag: 'Chịu lực & nhiệt',
    setupFee: 40000,
    highlight: 'Độ bền cơ học cao, chống va đập',
    features: [
      'Vật liệu kỹ thuật cao cấp',
      'Chịu nhiệt độ lên đến 80°C',
      'Phù hợp linh kiện chức năng & vỏ hộp',
      'Kiểm định độ bền cấu trúc trước in',
    ],
  },
  {
    id: 'resin',
    name: 'Resin SLA',
    unitPriceVnd: 6500,
    tag: 'Siêu mịn cao cấp',
    setupFee: 50000,
    highlight: 'Độ sắc nét vượt trội, bề mặt láng mịn',
    features: [
      'Công nghệ quang hóa Resin 8K',
      'Độ dày lớp in 0.05mm siêu mịn',
      'Tối ưu cho figure, trang sức & chi tiết nhỏ',
      'Khử độc, sấy cứng UV và phủ bóng',
    ],
  },
];

export default function TicketPrices() {
  const navigate = useNavigate();
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const formatVnd = (val: number) => val.toLocaleString('vi-VN') + ' đ';

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-[#231F1E]">
      {/* Page Header */}
      <section className="relative overflow-hidden pt-12 pb-12 px-4 sm:px-6 lg:px-8 border-b border-[#E2D9D0] bg-[#FFFFFF]">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F0] border border-[#B83B2A]/20 text-[#B83B2A] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Biểu Phí Minh Bạch &amp; Tiết Kiệm</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#231F1E] tracking-tight">
            Bảng Giá Dịch Vụ
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#7A706C] leading-relaxed">
            Hệ thống cung cấp giải pháp toàn diện từ lượt tạo mô hình 3D bằng AI đến dịch vụ gia công in thực tế tận tay.
          </p>
        </div>
      </section>

      {/* Main Tables Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        {/* BẢNG 1: GÓI LƯỢT TẠO AI */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E2D9D0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A]">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#231F1E]">
                  Bảng 1: Gói Lượt Tạo AI
                </h2>
              </div>
              <p className="text-xs text-[#7A706C] mt-1">
                Tạo mô hình 3D từ ảnh chụp hoặc chữ. Mỗi lượt tạo thành công tương ứng 1 mô hình hoàn chỉnh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className="text-xs font-bold text-[#B83B2A] hover:text-[#9E2F20] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Nạp nhanh VietQR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {AI_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 border ${
                  pkg.isPopular
                    ? 'bg-[#FFFFFF] border-[#B83B2A] shadow-md ring-1 ring-[#B83B2A]/30'
                    : 'bg-[#FFFFFF] border-[#E2D9D0] shadow-sm hover:border-[#B83B2A]/40'
                }`}
              >
                {pkg.badge && (
                  <div
                    className={`absolute -top-3 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      pkg.isPopular
                        ? 'bg-[#B83B2A] text-white shadow-sm'
                        : 'bg-[#EFEAE2] text-[#7A706C] border border-[#E2D9D0]'
                    }`}
                  >
                    {pkg.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[#231F1E]">{pkg.name}</h3>
                    <p className="text-xs text-[#7A706C] mt-0.5">{pkg.desc}</p>
                  </div>

                  <div className="py-3 border-y border-[#E2D9D0]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#B83B2A] font-mono tabular-nums">
                        {formatVnd(pkg.priceVnd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1 text-[#7A706C]">
                      <span className="font-semibold text-[#231F1E]">{pkg.credits} lượt tạo AI</span>
                      <span className="font-mono">{pkg.unitPrice}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-[#7A706C]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Không giới hạn thời gian sử dụng</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Xuất định dạng file OBJ, GLB, STL</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Hỗ trợ tạo trực tiếp từ ảnh chụp 2D</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-5 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsTopUpOpen(true)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      pkg.isPopular
                        ? 'bg-[#B83B2A] hover:bg-[#9E2F20] text-white shadow-sm'
                        : 'bg-[#F6F3EE] hover:bg-[#EFEAE2] text-[#231F1E] border border-[#E2D9D0]'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Nạp gói này</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BẢNG 2: ĐƠN GIÁ VẬT LIỆU IN 3D */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E2D9D0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A]">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#231F1E]">
                  Bảng 2: Đơn Giá Vật Liệu In 3D
                </h2>
              </div>
              <p className="text-xs text-[#7A706C] mt-1">
                Chi phí sản xuất thực tế tại xưởng tính theo thể tích và vật liệu sử dụng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="text-xs font-bold text-[#B83B2A] hover:text-[#9E2F20] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Vào Studio tính giá tự động</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MATERIAL_PRICES.map((mat) => (
              <div
                key={mat.id}
                className="rounded-2xl p-6 bg-[#FFFFFF] border border-[#E2D9D0] shadow-sm hover:border-[#B83B2A]/40 flex flex-col justify-between transition-all duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#231F1E]">{mat.name}</h3>
                      <p className="text-xs text-[#7A706C] mt-0.5">{mat.highlight}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#EFEAE2] text-[#7A706C] font-semibold border border-[#E2D9D0]">
                      {mat.tag}
                    </span>
                  </div>

                  <div className="py-3 border-y border-[#E2D9D0]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#B83B2A] font-mono tabular-nums">
                        {formatVnd(mat.unitPriceVnd)}
                      </span>
                      <span className="text-xs text-[#7A706C]">/ cm³</span>
                    </div>
                    <div className="text-[11px] text-[#7A706C] mt-1 font-mono">
                      Phí thiết lập xưởng: {formatVnd(mat.setupFee)}
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-[#7A706C]">
                    {mat.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 mt-5">
                  <button
                    type="button"
                    onClick={() => navigate('/create')}
                    className="w-full py-2.5 rounded-xl bg-[#F6F3EE] hover:bg-[#EFEAE2] text-[#231F1E] hover:text-[#B83B2A] border border-[#E2D9D0] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Chọn in vật liệu này</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 Summary Features */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E2D9D0]">
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FDF2F0] text-[#B83B2A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#231F1E]">Kiểm Tra Kỹ Thuật Tự Động</h4>
              <p className="text-[11px] text-[#7A706C] mt-0.5">Quét độ dày thành và độ kín khối trước khi in.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FDF2F0] text-[#B83B2A] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#231F1E]">Giao Hàng Toàn Quốc</h4>
              <p className="text-[11px] text-[#7A706C] mt-0.5">Đóng gói chống sốc và giao nhanh trong 2-3 ngày.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FDF2F0] text-[#B83B2A] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#231F1E]">Bảo Hành Thành Phẩm</h4>
              <p className="text-[11px] text-[#7A706C] mt-0.5">Hỗ trợ in lại hoặc hoàn tiền trong 7 ngày nếu lỗi xưởng.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Credit Top-Up Modal */}
      {isTopUpOpen && (
        <CreditTopUpModal
          isOpen={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
        />
      )}
    </div>
  );
}
