import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative bg-gradient-to-b from-[#0a0102] via-[#060c0b] to-[#04100d] pt-28 md:pt-36 pb-10 md:pb-14 px-6 overflow-hidden"
    >
      {/* Subtle radial transition glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(45,212,191,0.04)_0%,_transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-emerald-200/60 text-sm tracking-widest uppercase mb-6"
        >
          Về THE BOYS · Idea2Model
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.15] tracking-tight"
        >
          Tiên phong công nghệ{' '}
          <em
            className="italic text-emerald-200/75 font-normal"
            style={{ fontFamily: "'Instrument Serif', 'Plus Jakarta Sans', serif" }}
          >
            AI Image-to-3D
          </em>{' '}
          cho <br className="hidden md:block" />
          nhà sáng tạo{' '}
          <em
            className="italic text-emerald-200/75 font-normal"
            style={{ fontFamily: "'Instrument Serif', 'Plus Jakarta Sans', serif" }}
          >
            dựng hình, tạo mẫu và in 3D thực tế.
          </em>
        </motion.h2>
      </div>
    </section>
  );
}
