import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Cpu, ShieldCheck, FileCheck, Truck, Sparkles, ArrowRight } from 'lucide-react';
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
}

const STEPS: StoryStep[] = [
  {
    step: '01',
    title: 'Tải Ảnh hoặc Nhập Ý Tưởng',
    subtitle: 'Khởi đầu từ bất kỳ hình ảnh 2D hay bản vẽ nào',
    description:
      'Chỉ cần tải ảnh PNG/JPEG hoặc chọn mẫu có sẵn. Hệ thống tự động khử nhiễu và chuẩn hóa dữ liệu đầu vào.',
    icon: Upload,
    tag: 'INPUT RECOGNITION',
    stat: '< 2s',
    statLabel: 'Thời gian tải & nhận diện',
  },
  {
    step: '02',
    title: 'AI Tái Tạo Khối 3D Sắc Nét',
    subtitle: 'Meshy-6 Lite & Deep Generative Reconstruction',
    description:
      'Mạng nơ-ron đa chiều nội suy chiều sâu, tạo cấu trúc đa giác phong phú với độ phân giải lên đến 1.5M đa giác.',
    icon: Cpu,
    tag: 'NEURAL GENERATION',
    stat: '45s',
    statLabel: 'Tốc độ sinh hình 3D trung bình',
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
  },
  {
    step: '05',
    title: 'Sản Xuất SLA / FDM & Giao Tận Tay',
    subtitle: 'Máy in 3D công nghiệp độ chính xác micron',
    description:
      'Đơn in được điều phối tới hệ thống máy in SLA/FDM chuyên nghiệp, hoàn thiện bề mặt và đóng gói giao nhanh toàn quốc.',
    icon: Truck,
    tag: 'PRECISION PRINTING',
    stat: '±0.05mm',
    statLabel: 'Dung sai chi tiết in 3D',
  },
];

export const ScrollStory: React.FC = () => {
  const navigate = useNavigate();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const activeStep = STEPS[activeStepIndex];
  const ActiveIcon = activeStep.icon;

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative">
      {/* Section Header: Minimalist, Bold & High Contrast with Scroll Reveal */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium tracking-widest uppercase mb-4 shadow-[0_0_12px_rgba(0,240,255,0.12)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quy trình 5 bước</span>
        </div>
        <h2
          className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Từ Ý Tưởng 2D Đến Mô Hình Cầm Trên Tay
        </h2>
        <p className="mt-4 text-base sm:text-lg text-zinc-300 font-normal">
          Chu trình khép kín kết hợp sức mạnh trí tuệ nhân tạo và công nghệ in 3D công nghiệp chính xác.
        </p>
      </motion.div>

      {/* Scrollytelling Interactive Grid with Scroll Reveal */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
      >
        {/* Left Column: Interactive Step Selector */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStepIndex;
            return (
              <button
                key={step.step}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className={`relative w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-[#0c121d] border-cyan-400/50 shadow-[0_0_25px_rgba(0,240,255,0.15)] translate-x-1'
                    : 'bg-[#080c13]/70 border-white/8 hover:bg-[#0c1017] hover:border-white/15'
                }`}
              >
                {/* Active Indicator Bar on left */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r shadow-[0_0_10px_#00f0ff]" />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-semibold uppercase block">
                        {step.step} // {step.tag}
                      </span>
                      <h4
                        className={`text-base font-bold transition-colors ${
                          isActive ? 'text-white' : 'text-zinc-300'
                        }`}
                      >
                        {step.title}
                      </h4>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isActive ? 'text-cyan-400 translate-x-1' : 'text-zinc-600 opacity-0'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Dynamic Stage Visual Presentation Card */}
        <div className="lg:col-span-7 lg:sticky lg:top-24">
          <div className="relative rounded-3xl bg-[#0b0f17]/95 border border-cyan-500/30 p-6 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden">
            {/* Ambient Background Glow */}
            <div
              className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"
              aria-hidden="true"
            />

            {/* Ghost Watermark Index Number */}
            <span
              className="pointer-events-none absolute right-4 top-2 font-mono font-black text-8xl sm:text-9xl text-white/[0.04] select-none"
              aria-hidden="true"
            >
              {activeStep.step}
            </span>

            {/* Eyebrow & Tag */}
            <div className="relative z-[1] flex items-center justify-between gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold tracking-wider">
                BƯỚC {activeStep.step}
              </span>
              <span className="text-xs font-mono text-zinc-400">{activeStep.tag}</span>
            </div>

            {/* Display Icon & Title */}
            <div className="relative z-[1] flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-cyan-400/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                <ActiveIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {activeStep.title}
                </h3>
                <p className="text-sm text-cyan-300/80 font-medium">{activeStep.subtitle}</p>
              </div>
            </div>

            {/* Description Body: High contrast & readable */}
            <p className="relative z-[1] text-base sm:text-lg text-zinc-200 leading-relaxed mb-8 font-normal">
              {activeStep.description}
            </p>

            {/* Big Stat Odometer Callout */}
            <div className="relative z-[1] grid grid-cols-2 gap-4 p-5 rounded-2xl bg-[#070a0f]/90 border border-white/10 mb-8">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400 tracking-tight block">
                  {activeStep.stat}
                </span>
                <span className="text-xs text-zinc-400 font-medium block mt-1">
                  {activeStep.statLabel}
                </span>
              </div>
              <div className="border-l border-white/10 pl-4 flex flex-col justify-center">
                <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Chuẩn SLA / FDM
                </span>
                <span className="text-xs text-zinc-400 mt-1">Sẵn sàng xuất file STL &amp; OBJ</span>
              </div>
            </div>

            {/* Action CTA */}
            <div className="relative z-[1] flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="btn-pooled-cyan px-6 py-3 font-bold text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Trải Nghiệm Studio Ngay</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/ticket-prices')}
                className="px-5 py-3 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-sm font-semibold transition-all cursor-pointer"
              >
                Xem Bảng Giá In
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ScrollStory;

