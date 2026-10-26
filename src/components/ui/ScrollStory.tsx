import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Cpu,
  ShieldCheck,
  FileCheck,
  Truck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';

interface StoryStep {
  step: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  tag: string;
  stat: string;
  statLabel: string;
  highlight: string;
}

const STEPS: StoryStep[] = [
  {
    step: '01',
    title: 'Tải Ảnh hoặc Nhập Ý Tưởng',
    subtitle: 'Khởi đầu từ bất kỳ hình ảnh 2D hay bản vẽ nào',
    description:
      'Chỉ cần tải ảnh PNG/JPEG hoặc chọn mẫu có sẵn. Hệ thống tự động khử nhiễu, tách nền và chuẩn hóa dữ liệu đầu vào.',
    icon: Upload,
    tag: 'INPUT RECOGNITION',
    stat: '< 2s',
    statLabel: 'Thời gian tải & nhận diện',
    highlight: 'Hỗ trợ đa định dạng ảnh PNG, JPG, WebP',
  },
  {
    step: '02',
    title: 'AI Tái Tạo Khối 3D Sắc Nét',
    subtitle: 'Meshy-6 Lite & Deep Generative Reconstruction',
    description:
      'Mạng nơ-ron đa chiều nội suy chiều sâu, tạo cấu trúc đa giác phong phú với độ phân giải lên đến 1.5 triệu mặt đa giác.',
    icon: Cpu,
    tag: 'NEURAL GENERATION',
    stat: '45s',
    statLabel: 'Tốc độ sinh hình 3D trung bình',
    highlight: 'Lưới đa giác chuẩn hóa Quad/Tri siêu chi tiết',
  },
  {
    step: '03',
    title: 'Tự Động Kiểm Định Lưới In 3D',
    subtitle: 'Đảm bảo 100% Watertight & Độ dày thành an toàn',
    description:
      'Thuật toán quét thể tích kiểm tra độ kín nước, độ dày tối thiểu và cảnh báo góc nghiêng trước khi đưa vào sản xuất.',
    icon: ShieldCheck,
    tag: 'MESH VERIFICATION',
    stat: '100%',
    statLabel: 'Khối kín nước Watertight',
    highlight: 'Tự động tạo Support thông minh chống sụp đổ',
  },
  {
    step: '04',
    title: 'Kỹ Thuật Duyệt & Chốt Mẫu In',
    subtitle: 'Bảo vệ quyền lợi bằng mã băm SHA-256 bất biến',
    description:
      'Kỹ thuật viên kiểm tra bản vẽ, khách hàng xác nhận cấu hình và nhận báo giá trong suốt 15 phút không phát sinh chi phí.',
    icon: FileCheck,
    tag: 'CUSTOMER APPROVAL',
    stat: 'SHA-256',
    statLabel: 'Tính toàn vẹn cấu hình',
    highlight: 'Bảo mật biên bản kỹ thuật & mã vận đơn',
  },
  {
    step: '05',
    title: 'Sản Xuất SLA / FDM & Giao Tận Tay',
    subtitle: 'Máy in 3D công nghiệp độ chính xác micron',
    description:
      'Đơn in được điều phối tới hệ thống máy in SLA/FDM chuyên nghiệp, khử độc, sấy cứng UV và đóng gói giao nhanh toàn quốc.',
    icon: Truck,
    tag: 'PRECISION PRINTING',
    stat: '±0.05mm',
    statLabel: 'Dung sai chi tiết in 3D',
    highlight: 'Đóng gói chống sốc đa tầng & bảo hành 7 ngày',
  },
];

export const ScrollStory: React.FC = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const nextStep = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % STEPS.length);
  }, []);

  const prevStep = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + STEPS.length) % STEPS.length);
  }, []);

  const goToStep = (idx: number) => {
    setActiveIndex(idx);
  };

  // Timer 10s decoupled: Chạy đúng tuần tự từng bước 1 -> 2 -> 3 -> 4 -> 5 -> 1
  // Tuyệt đối không gọi setState bên trong updater của state khác để tránh nhảy 2 bước
  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % STEPS.length);
    }, 10000);

    return () => clearTimeout(timer);
  }, [activeIndex, isPaused]);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative overflow-hidden">
      {/* Background Ambient Radial Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.12)_0%,rgba(168,85,247,0.08)_40%,transparent_70%)] blur-3xl -z-10"
        aria-hidden="true"
      />

      {/* Section Header: Minimalist, Bold & High Contrast */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,240,255,0.15)] backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>QUY TRÌNH 5 BƯỚC KHÉP KÍN</span>
        </div>
        <h2
          className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Từ Ý Tưởng 2D Đến Mô Hình Cầm Trên Tay
        </h2>
        <p className="mt-3 text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto font-normal">
          Hệ thống tự động điều phối chu trình sáng tạo từ tạo khối nơ-ron đến in ấn chính xác 100% Watertight.
        </p>

        {/* 5-Step Progress Tabs with CSS Keyframe 10s Timer */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8 flex-wrap">
          {STEPS.map((step, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={step.step}
                type="button"
                onClick={() => goToStep(idx)}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all duration-300 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'text-white border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.25)] bg-cyan-500/15'
                    : 'text-zinc-400 hover:text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
              >
                {/* 10-second CSS keyframe animation fill bar (Smooth 60fps, no React re-render lag) */}
                {isActive && (
                  <span
                    key={activeIndex}
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/35 via-cyan-400/25 to-purple-500/35 pointer-events-none -z-10"
                    style={{
                      animation: isPaused ? 'none' : 'stepProgressBar 10s linear forwards',
                    }}
                  />
                )}
                <span>
                  {step.step} // {step.tag.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 3D Coverflow Carousel Stage */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative w-full h-[540px] sm:h-[500px] flex items-center justify-center perspective-[1200px] select-none"
      >
        {/* Navigation Arrow Left */}
        <button
          type="button"
          onClick={prevStep}
          aria-label="Bước trước đó"
          className="absolute left-2 sm:left-6 z-40 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center backdrop-blur-xl transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-cyan-200" />
        </button>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          onClick={nextStep}
          aria-label="Bước kế tiếp"
          className="absolute right-2 sm:right-6 z-40 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center backdrop-blur-xl transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95 group"
        >
          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform text-cyan-200" />
        </button>

        {/* 5 Cards Positioned on 3D Ring/Coverflow */}
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;

          // Tính toán offset tương đối trong vòng lặp 5 phần tử: [-2, -1, 0, 1, 2]
          let offset = idx - activeIndex;
          if (offset < -2) offset += STEPS.length;
          if (offset > 2) offset -= STEPS.length;

          const isCenter = offset === 0;
          const isLeft = offset === -1;
          const isRight = offset === 1;
          const isOffstage = Math.abs(offset) > 1;

          // Tọa độ 3D Coverflow mượt mà:
          // 5 (nhỏ) -> 1 (to) -> 2 (nhỏ)
          let xTranslation = '0%';
          let zTranslation = 0;
          let yRotation = 0;
          let scale = 1;
          let opacity = 1;
          let zIndex = 30;

          if (isCenter) {
            xTranslation = '0%';
            zTranslation = 80;
            yRotation = 0;
            scale = 1.08;
            opacity = 1;
            zIndex = 30;
          } else if (isLeft) {
            xTranslation = '-68%';
            zTranslation = -40;
            yRotation = 16;
            scale = 0.84;
            opacity = 0.52;
            zIndex = 20;
          } else if (isRight) {
            xTranslation = '68%';
            zTranslation = -40;
            yRotation = -16;
            scale = 0.84;
            opacity = 0.52;
            zIndex = 20;
          } else {
            // Offstage (ở cánh gà chờ trượt vào)
            xTranslation = offset < 0 ? '-120%' : '120%';
            zTranslation = -120;
            yRotation = offset < 0 ? 25 : -25;
            scale = 0.65;
            opacity = 0;
            zIndex = 10;
          }

          return (
            <motion.div
              key={step.step}
              animate={{
                x: xTranslation,
                z: zTranslation,
                rotateY: yRotation,
                scale,
                opacity,
                zIndex,
              }}
              transition={{
                // Giảm tốc độ animation từ 0.8s lên 1.3s với curve mượt mà để user nhìn rõ chuyển động chuyển card
                duration: 1.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                transformStyle: 'preserve-3d',
                pointerEvents: isOffstage ? 'none' : 'auto',
                WebkitFontSmoothing: 'antialiased',
              }}
              onClick={() => {
                if (isLeft || isRight) goToStep(idx);
              }}
              className={`absolute w-full max-w-[480px] sm:max-w-[540px] px-2 ${
                isCenter ? 'cursor-default' : 'cursor-pointer hover:opacity-75'
              }`}
            >
              {/* Glass Card 3D Frame (Nền kính đậm đà giữ nguyên theo yêu cầu) */}
              <div className="glass-card-3d p-6 sm:p-8 text-white relative">
                {/* Floating 3D Specular Sheen */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gradient-to-br from-cyan-400/20 via-purple-500/10 to-transparent blur-2xl"
                  aria-hidden="true"
                />

                {/* Top Row: Floating Star/Step Badge & 3D Tag */}
                <div className="relative z-10 flex items-center justify-between gap-3 mb-5">
                  {/* Floating Glass Icon Badge: Nét căng, không bị mờ nhòe */}
                  <div
                    className="w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/30 backdrop-blur-xl flex items-center justify-center text-cyan-300 shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
                    style={{ transform: 'translateZ(30px)' }}
                  >
                    <StepIcon className="w-7 h-7 text-cyan-300 stroke-[2.2]" />
                  </div>

                  <div className="flex items-center gap-2" style={{ transform: 'translateZ(20px)' }}>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/50 text-[11px] font-mono font-bold text-cyan-300 tracking-wider uppercase">
                      BƯỚC {step.step}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/25 text-[10px] font-mono font-bold text-white backdrop-blur-md">
                      3D
                    </span>
                  </div>
                </div>

                {/* Step Title & Subtitle: Làm nét chữ và tăng tương phản */}
                <div className="relative z-10 mb-4" style={{ transform: 'translateZ(24px)' }}>
                  <span className="text-[10.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-1">
                    {step.tag}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-cyan-300 font-bold mt-1 tracking-wide">
                    {step.subtitle}
                  </p>
                </div>

                {/* Description Body: Chữ rõ ràng sắc nét */}
                <p
                  className="relative z-10 text-xs sm:text-sm text-slate-100 leading-relaxed font-normal mb-5 line-clamp-3"
                  style={{ transform: 'translateZ(18px)' }}
                >
                  {step.description}
                </p>

                {/* Big Stat Callout Badge: Khối Dark Obsidian tương phản cao */}
                <div
                  className="relative z-10 grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#060a14]/95 border border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.6)] mb-6"
                  style={{ transform: 'translateZ(22px)' }}
                >
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-300 tracking-tight block drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                      {step.stat}
                    </span>
                    <span className="text-[11px] text-slate-200 font-semibold block mt-0.5">
                      {step.statLabel}
                    </span>
                  </div>
                  <div className="border-l border-white/15 pl-3 flex flex-col justify-center">
                    <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      ✓ Đạt chuẩn
                    </span>
                    <span className="text-[10.5px] text-slate-200 font-medium mt-0.5 line-clamp-2">
                      {step.highlight}
                    </span>
                  </div>
                </div>

                {/* Luminous Organic Wave SVG Graphic at Bottom (Image 1 Style) */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 opacity-35 overflow-hidden">
                  <svg viewBox="0 0 500 80" className="w-full h-full text-cyan-400" fill="none">
                    <path
                      d="M0 40 Q 125 15, 250 45 T 500 35"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeOpacity="0.8"
                    />
                    <path
                      d="M0 55 Q 125 35, 250 60 T 500 50"
                      stroke="url(#wave-grad)"
                      strokeWidth="1"
                      strokeOpacity="0.5"
                    />
                    <defs>
                      <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00F0FF" />
                        <stop offset="50%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Action Buttons (Center Active Card) */}
                <div
                  className={`relative z-10 flex items-center gap-3 transition-opacity duration-300 ${
                    isCenter ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  style={{ transform: 'translateZ(26px)' }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/create');
                    }}
                    className="btn-pooled-cyan px-5 py-2.5 h-11 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)] flex-1 justify-center"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Mở Studio 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/ticket-prices');
                    }}
                    className="liquid-glass px-4 py-2.5 h-11 text-xs font-semibold text-white/90 hover:text-white border border-white/20 hover:border-cyan-400/50 rounded-xl transition-all cursor-pointer flex-1 text-center"
                  >
                    Bảng Giá In
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Controls: Pause/Play & Dot Indicators */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isPaused ? 'Tiếp tục tự động chuyển' : 'Tạm dừng 10s'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-cyan-300" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goToStep(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex
                  ? 'w-8 bg-cyan-400 shadow-[0_0_10px_#00f0ff]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Chuyển đến bước ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScrollStory;
