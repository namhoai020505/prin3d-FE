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
    <div className="min-h-screen bg-[#090D14] text-white selection:bg-cyan-500/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-[#0b0f17] to-[#090d14] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dịch vụ tạo 3D AI & Gia công In 3D Thực tế</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            Bảng Giá In 3D &amp; Gói Sản Xuất
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-white/70 font-medium leading-relaxed">
            Biến ý tưởng và mô hình 3D do AI tạo thành hiện vật thực tế với chất liệu nhựa Resin SLA cao cấp và sợi nhựa FDM bền bỉ, độ chuẩn xác tới từng milimet.
          </p>
        </div>
      </section>

      {/* Pricing Packages List */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm text-cyan-100/70 font-medium">Đang tải biểu phí dịch vụ in 3D...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#0c1017] border border-rose-500/30 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="font-bold text-base text-white">Lỗi kết nối</h3>
            <p className="text-xs text-rose-200/80">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {packages.map((pkg, idx) => {
              const isSla = pkg.name.toLowerCase().includes('sla') || pkg.material.toLowerCase().includes('resin');
              return (
                <div
                  key={pkg.id || idx}
                  className={`relative rounded-3xl border transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between backdrop-blur-xl ${
                    isSla
                      ? 'bg-gradient-to-b from-cyan-950/30 via-[#0c1017] to-[#090d14] border-cyan-400/50 shadow-[0_0_35px_rgba(0,240,255,0.15)] hover:border-cyan-300'
                      : 'bg-[#0c1017]/80 border-white/10 hover:border-white/30 hover:bg-[#0c1017]'
                  }`}
                >
                  {isSla && (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-cyan-400 text-black text-[11px] font-black shadow-lg shadow-cyan-950/60 tracking-wider uppercase font-mono">
                      Khuyên Dùng • SLA Cao Cấp
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        isSla ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300' : 'bg-white/10 border-white/20 text-white'
                      }`}>
                        {isSla ? <Sparkles className="w-6 h-6 text-cyan-400" /> : <Printer className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{pkg.name}</h2>
                        <p className="text-xs text-white/60 font-medium">
                          Chất liệu: <span className="text-cyan-300 font-semibold">{pkg.material}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 pb-4 border-b border-white/10">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
                          {formatCurrency(pkg.priceVnd)}
                        </span>
                        <span className="text-xs text-white/50 font-medium">/ 1 mẫu phẩm</span>
                      </div>
                      <p className="text-xs text-cyan-300/80 mt-1">
                        Đã bao gồm chi phí kiểm duyệt lưới &amp; xử lý hỗ trợ Support kỹ thuật
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Thông số kỹ thuật &amp; Lợi ích</h4>
                      <ul className="space-y-2.5 text-xs text-white/75">
                        <li className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Phù hợp chiều cao: <strong className="text-white font-mono">{pkg.heightRangeCm || `${pkg.minHeightMm}-${pkg.maxHeightMm} mm`}</strong></span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Độ phân giải lớp in: <strong className="text-white">{isSla ? '0.05 mm (Siêu mịn)' : '0.12 mm (Tiêu chuẩn)'}</strong></span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Đảm bảo mô hình kín nước (Watertight), chịu lực và chống biến dạng</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Tự động xuất tệp chuẩn STL / GLB gia công máy in 3D công nghiệp</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate('/create')}
                      className={`w-full py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSla
                          ? 'btn-pooled-cyan text-black shadow-lg shadow-cyan-950/50 hover:scale-[1.02]'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:scale-[1.02]'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>Tạo mô hình &amp; Đặt in ngay</span>
                    </button>
                    <p className="text-[11px] text-center text-white/40">Thời gian gia công: 24 - 48 giờ làm việc</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 pt-12 border-t border-white/10">
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Kiểm tra kích thước tự động</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Hệ thống tự động tính toán thể tích và kích thước hộp bao Bounding Box để báo giá chuẩn xác tức thì.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
              <Box className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Hỗ trợ file STL / GLB</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Bạn có thể tải trực tiếp file mô hình 3D về máy để tự in hoặc chỉnh sửa trên Blender tùy thích.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
              <Truck className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Đóng gói an toàn &amp; Giao hàng</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Mẫu vật được khử độc, bọc xốp chống sốc đa tầng và giao đến tận nơi theo địa chỉ bạn đăng ký.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
