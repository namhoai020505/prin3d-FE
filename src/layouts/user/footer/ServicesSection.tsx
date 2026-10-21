import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const SERVICE_CARDS = [
  {
    tag: 'AI Image-to-3D Studio',
    title: 'Khởi tạo Mô hình 3D từ Ảnh 2D & Phác thảo',
    description:
      'Tải lên ảnh nhân vật Chibi, tượng nghệ thuật, phụ kiện Cosplay hoặc mẫu sản phẩm để AI tự động tái tạo khối 3D đa góc nhìn cùng vật liệu PBR chân thực.',
    videoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
  },
  {
    tag: 'SLA 8K & FDM Printing',
    title: 'Đặt In 3D Theo Yêu Cầu & Xử lý Hoàn thiện',
    description:
      'Chuyển trực tiếp mô hình 3D vừa tạo sang dây chuyền in Resin SLA 8K siêu mịn hoặc nhựa kỹ thuật FDM bền bỉ, kiểm duyệt lỗi lưới tự động và giao tận tay.',
    videoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4',
  },
] as const;

export default function ServicesSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();

  return (
    <section
      ref={ref}
      className="relative bg-gradient-to-b from-[#041612] via-[#03120f] to-[#030d0b] py-28 md:py-40 px-6 overflow-hidden"
    >
      {/* Subtle emerald radial gradient */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.04)_0%,_transparent_65%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex items-end justify-between mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl text-white tracking-tight">
            Hệ sinh thái chế tác 3D
          </h2>
          <span className="hidden md:inline-block text-emerald-200/55 text-sm">
            Dịch vụ cốt lõi · THE BOYS
          </span>
        </motion.div>

        {/* Two-card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {SERVICE_CARDS.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{
                duration: 0.8,
                delay: idx * 0.15,
                ease: 'easeOut',
              }}
              onClick={() => navigate('/create')}
              className="liquid-glass rounded-3xl overflow-hidden group cursor-pointer shadow-[0_20px_50px_rgba(2,10,8,0.75)]"
            >
              {/* Card video area */}
              <div className="relative aspect-video overflow-hidden">
                <video
                  src={card.videoUrl}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030d0b]/70 to-transparent"
                  aria-hidden="true"
                />
              </div>

              {/* Card body */}
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="uppercase tracking-widest text-emerald-200/60 text-xs">
                    {card.tag}
                  </span>
                  <span className="liquid-glass rounded-full p-2 text-emerald-100 group-hover:text-white inline-flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
                <h3 className="text-white text-xl md:text-2xl mb-3 tracking-tight group-hover:text-emerald-100 transition-colors">
                  {card.title}
                </h3>
                <p className="text-emerald-50/60 text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
