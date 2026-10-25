import { useEffect, useState } from 'react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  Box,
  CheckCircle,
  HelpCircle,
  Printer,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';
import {
  listPricingPackages,
  type PricingPackage,
} from '../../services/pricingPackageService';
import TiltCard from '../../components/ui/TiltCard';

export default function TicketPrices() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPackages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listPricingPackages();
        if (isMounted) {
          setPackages(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Không thể tải danh sách gói in 3D lúc này.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + ' đ';

  return (
    <div className="min-h-screen bg-[#070a0f] text-white selection:bg-cyan-500/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#0c1017]/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-[#0c1017] to-[#070a0f] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(0,240,255,0.12)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>01 // GÓI GIA CÔNG SẢN XUẤT THỰC TẾ</span>
          </div>
          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Bảng Giá In 3D &amp; Gói Sản Xuất
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-200 font-normal leading-relaxed">
            Biến mô hình 3D AI thành hiện vật thực tế với độ phân giải cao bằng công nghệ in Resin SLA siêu mịn và FDM PLA bền bỉ.
          </p>
        </div>
      </section>

      {/* Pricing Packages List */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm text-cyan-200 font-medium">Đang tải biểu phí dịch vụ in 3D...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#0c1017] border border-rose-500/30 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="font-bold text-base text-white">Lỗi kết nối</h3>
            <p className="text-xs text-rose-200/80">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {packages.map((pkg, idx) => {
              const isSla = pkg.name.toLowerCase().includes('sla') || pkg.material.toLowerCase().includes('resin');
              return (
                <TiltCard
                  key={pkg.id || idx}
                  maxTilt={5}
                  scale={1.015}
                  className={`relative rounded-3xl border transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between backdrop-blur-xl ${
                    isSla
                      ? 'bg-gradient-to-b from-cyan-950/40 via-[#0c1017] to-[#070a0f] border-cyan-400/50 shadow-[0_0_35px_rgba(0,240,255,0.18)]'
                      : 'bg-[#0c1017]/90 border-white/12 hover:border-white/25 shadow-lg'
                  }`}
                >
                  {isSla && (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-cyan-400 text-black text-[11px] font-black shadow-lg shadow-cyan-950/60 tracking-wider uppercase font-mono">
                      Khuyên Dùng • SLA Cao Cấp
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                        isSla ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'bg-white/10 border-white/20 text-white'
                      }`}>
                        {isSla ? <Sparkles className="w-7 h-7 text-cyan-400" /> : <Printer className="w-7 h-7 text-white" />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{pkg.name}</h2>
                        <p className="text-xs text-zinc-300 font-medium mt-0.5">
                          Chất liệu: <span className="text-cyan-300 font-bold">{pkg.material}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 pb-4 border-b border-white/10">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
                          {formatCurrency(pkg.priceVnd)}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">/ 1 mẫu phẩm</span>
                      </div>
                      <p className="text-xs text-cyan-300 font-medium mt-1">
                        ✓ Đã bao gồm kiểm định mesh &amp; tạo Support kỹ thuật tự động
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">Thông số &amp; Cam kết chất lượng</h4>
                      <ul className="space-y-3 text-sm text-zinc-200">
                        <li className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Chiều cao tương thích: <strong className="text-white font-mono">{pkg.heightRangeCm || `${pkg.minHeightMm}-${pkg.maxHeightMm} mm`}</strong></span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Độ dày lớp in: <strong className="text-white">{isSla ? '0.05 mm (Siêu chi tiết)' : '0.12 mm (Tiêu chuẩn)'}</strong></span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Khối kín nước 100% Watertight, chịu lực và chống cong vênh</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Được bảo vệ bằng mã băm Hash cấu hình SHA-256 bất biến</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate('/create')}
                      className={`w-full py-3.5 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSla
                          ? 'btn-pooled-cyan shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:scale-[1.01]'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:scale-[1.01]'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-cyan-300" />
                      <span>Tạo Mô Hình &amp; Đặt In Ngay</span>
                    </button>
                    <p className="text-[11px] text-center text-zinc-400 font-medium">Thời gian gia công: 24 - 48 giờ làm việc</p>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* Feature Highlights: 3D Tilt Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 pt-12 border-t border-white/10">
          <TiltCard maxTilt={4} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.15)]">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-base text-white">Kiểm tra kích thước tự động</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              Hệ thống tự động tính toán thể tích và kích thước hộp bao Bounding Box để báo giá chuẩn xác tức thì.
            </p>
          </TiltCard>

          <TiltCard maxTilt={4} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.15)]">
              <Box className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-base text-white">Hỗ trợ file STL / GLB</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              Tải trực tiếp file mô hình 3D về máy để tự in hoặc chỉnh sửa trên Blender tùy ý sau khi kiểm duyệt.
            </p>
          </TiltCard>

          <TiltCard maxTilt={4} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.15)]">
              <Truck className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-base text-white">Đóng gói an toàn &amp; Giao hàng</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              Mẫu vật được khử độc, bọc xốp chống sốc đa tầng và giao đến tận nơi theo địa chỉ bạn đăng ký.
            </p>
          </TiltCard>
        </div>
      </section>
    </div>
  );
}
