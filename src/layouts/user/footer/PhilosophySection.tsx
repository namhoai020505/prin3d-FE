import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const PHILOSOPHY_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4';

export default function PhilosophySection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="bg-gradient-to-b from-[#051814] via-[#051b17] to-[#041612] py-28 md:py-40 px-6 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-5xl md:text-7xl lg:text-8xl text-white tracking-tight mb-16 md:mb-24"
        >
          AI Spatial Mesh{' '}
          <em
            className="italic text-emerald-300/65 font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            x
          </em>{' '}
          3D Printing
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Video */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
            className="rounded-3xl overflow-hidden aspect-[4/3] border border-emerald-300/15 shadow-[0_20px_60px_rgba(2,12,10,0.8)]"
          >
            <video
              src={PHILOSOPHY_VIDEO_URL}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Right: Two text blocks separated by divider */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
            className="flex flex-col justify-center gap-8"
          >
            <div>
              <p className="text-emerald-200/60 text-xs tracking-widest uppercase mb-4">
                Tối ưu lưới đa giác (Quad &amp; Manifold Topology)
              </p>
              <p className="text-emerald-50/75 text-base md:text-lg leading-relaxed">
                Mỗi mô hình 3D được khởi tạo từ THE BOYS đều tự động chuẩn hóa
                cấu trúc lưới đa giác từ 50k (tối ưu cho Game Engine) đến 1.5M
                faces (siêu chi tiết), kèm UV map 4K và hỗ trợ xuất trực tiếp ra
                file STL, OBJ, GLB và FBX.
              </p>
            </div>

            <div className="w-full h-px bg-emerald-200/15" />

            <div>
              <p className="text-emerald-200/60 text-xs tracking-widest uppercase mb-4">
                Xưởng gia công In 3D SLA Resin 8K &amp; FDM
              </p>
              <p className="text-emerald-50/75 text-base md:text-lg leading-relaxed">
                Không chỉ dừng lại ở file kỹ thuật số, nền tảng kết nối trực
                tiếp với xưởng in 3D của THE BOYS tại Hà Nội và TP.HCM — hỗ trợ
                làm rỗng mẫu (Hollowing), tách khớp lắp ghép và gia công thành
                phẩm thực tế sắc nét đến từng chi tiết.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
