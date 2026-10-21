import { useRef } from 'react';
import { useVTNavigate as useNavigate } from '../../../hooks/useVTNavigate';
import { motion, useInView } from 'framer-motion';

const FEATURED_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4';

export default function FeaturedVideoSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();

  return (
    <section
      ref={ref}
      className="bg-gradient-to-b from-[#04100d] via-[#041411] to-[#051814] pt-6 md:pt-10 pb-20 md:pb-32 px-6 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative rounded-3xl overflow-hidden aspect-video min-h-[340px] sm:min-h-[420px] shadow-[0_24px_70px_rgba(2,12,10,0.85)] border border-emerald-300/15"
        >
          <video
            src={FEATURED_VIDEO_URL}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />

          {/* Gradient overlay on video */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03100d]/75 via-transparent to-transparent"
            aria-hidden="true"
          />

          {/* Bottom overlay content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            {/* Left: liquid-glass card */}
            <div className="liquid-glass rounded-2xl p-6 md:p-8 max-w-md">
              <p className="text-emerald-200/70 text-xs tracking-widest uppercase mb-3">
                Công nghệ THE BOYS 7.1
              </p>
              <p className="text-white text-sm md:text-base leading-relaxed">
                Từ một bức ảnh chụp 2D hoặc bản phác thảo tay, hệ thống AI
                Spatial Mesh của chúng tôi tự động tái tạo hình học 3D kín nước
                (Watertight Manifold) với độ phân giải lên tới 1.5M đa giác, sẵn
                sàng đưa vào máy in 3D SLA và FDM.
              </p>
            </div>

            {/* Right: Explore more button */}
            <motion.button
              type="button"
              onClick={() => navigate('/create')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="liquid-glass rounded-full px-8 py-3 text-emerald-50 hover:text-white text-sm font-medium cursor-pointer shrink-0 shadow-[0_0_24px_rgba(45,212,191,0.15)]"
            >
              Trải nghiệm Studio 3D
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
