import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import { Globe } from 'lucide-react';
import AboutSection from './footer/AboutSection';
import FeaturedVideoSection from './footer/FeaturedVideoSection';
import PhilosophySection from './footer/PhilosophySection';
import ServicesSection from './footer/ServicesSection';
import FOOTER_HERO_VIDEO_URL from '../../assets/videos/Cat In The Swamp Live Wallpaper 4K - Dark Animated Background.mp4';

export default function Footer() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const isFadingOutRef = useRef<boolean>(false);
  const hasInitialFadeInRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<number | null>(null);

  // Vanilla JS video opacity animation via requestAnimationFrame (no CSS transitions)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = '0';

    const cancelCurrentAnimation = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const animateOpacity = (from: number, to: number, durationMs: number) => {
      cancelCurrentAnimation();
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / durationMs));
        const currentOpacity = from + (to - from) * progress;
        video.style.opacity = String(currentOpacity);

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          rafIdRef.current = null;
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    };

    const handleCanPlay = () => {
      if (hasInitialFadeInRef.current) return;
      hasInitialFadeInRef.current = true;
      isFadingOutRef.current = false;
      void video.play().catch(() => {});
      animateOpacity(0, 1, 500);
    };

    const handleTimeUpdate = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      const remaining = video.duration - video.currentTime;
      if (remaining <= 0.55 && !isFadingOutRef.current) {
        isFadingOutRef.current = true;
        const currentOpacity = parseFloat(video.style.opacity || '1');
        animateOpacity(Number.isFinite(currentOpacity) ? currentOpacity : 1, 0, 500);
      }
    };

    const handleEnded = () => {
      cancelCurrentAnimation();
      video.style.opacity = '0';
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }
      restartTimeoutRef.current = window.setTimeout(() => {
        video.currentTime = 0;
        isFadingOutRef.current = false;
        void video.play().catch(() => {});
        animateOpacity(0, 1, 500);
      }, 100);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    if (video.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      cancelCurrentAnimation();
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <footer className="asme-footer-stage relative z-10 -ml-[64px] md:-ml-[72px] pl-[64px] md:pl-[72px] w-[calc(100%+64px)] md:w-[calc(100%+72px)] bg-[#0A0A0A] text-white select-none">
      {/* Vùng chuyển sắc mượt mà (Smooth Gradient Fade) từ nền sáng (#F6F3EE) xuống Footer đen (#0A0A0A) */}
      <div
        className="w-full h-44 md:h-56 pointer-events-none -mb-px relative z-20"
        style={{
          background:
            'linear-gradient(180deg, #F6F3EE 0%, rgba(246, 243, 238, 0.95) 15%, rgba(140, 133, 123, 0.4) 50%, rgba(20, 20, 20, 0.85) 82%, #0A0A0A 100%)',
        }}
        aria-hidden="true"
      />
      {/* SECTION 2 -- ABOUT SECTION */}
      <div id="footer-about">
        <AboutSection />
      </div>

      {/* SECTION 3 -- FEATURED VIDEO */}
      <div id="footer-featured">
        <FeaturedVideoSection />
      </div>

      {/* SECTION 4 -- PHILOSOPHY / AI SPATIAL MESH x 3D PRINTING */}
      <div id="footer-philosophy">
        <PhilosophySection />
      </div>

      {/* SECTION 5 -- SERVICES / HỆ SINH THÁI CHẾ TÁC 3D */}
      <div id="footer-services">
        <ServicesSection />
      </div>

      {/* FINAL LIQUID-GLASS VIDEO FOOTER PORTAL — Cat In The Swamp 4K Live Wallpaper */}
      <div className="min-h-[86vh] overflow-hidden relative flex flex-col justify-between bg-[#030d0b]">
        {/* Background video with seamless vanilla JS requestAnimationFrame crossfade */}
        <video
          ref={videoRef}
          src={FOOTER_HERO_VIDEO_URL}
          muted
          autoPlay
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          style={{ opacity: 0 }}
        />

        {/* Smooth top & bottom emerald-swamp blending gradients */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#030d0b] via-[#030d0b]/55 to-transparent z-[1]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(3,13,11,0.28)_0%,rgba(2,10,8,0.62)_100%)] z-[1]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#020907]/90 via-[#030d0b]/45 to-transparent z-[1]"
          aria-hidden="true"
        />

        {/* Center CTA Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-emerald-200/80 text-xs tracking-widest uppercase mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            THE BOYS 7.1 · AI SPATIAL MESH &amp; 3D PRINTING
          </p>

          <h2
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap font-normal mb-6 drop-shadow-[0_8px_28px_rgba(2,12,10,0.85)]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Create it{' '}
            <em className="italic text-[#7ef7e1]">all</em> in 3D.
          </h2>

          {/* Subtitle */}
          <p className="max-w-xl text-emerald-50/90 text-sm md:text-base leading-relaxed px-4 mb-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            Biến ảnh chụp và bản phác thảo 2D thành mô hình 3D độ chính xác cao
            — sẵn sàng xuất file STL, OBJ, GLB và đặt in 3D SLA/FDM thực tế cùng
            đội ngũ THE BOYS · Idea2Model.
          </p>

          {/* CTA button synchronized with Emerald Swamp glow */}
          <button
            type="button"
            onClick={() => navigate('/create')}
            className="liquid-glass rounded-full px-8 py-3.5 text-white hover:text-[#7ef7e1] text-sm font-semibold hover:bg-emerald-400/10 shadow-[0_8px_30px_rgba(16,185,129,0.22)] transition-all duration-300 cursor-pointer"
          >
            Khởi tạo Mô hình 3D ngay
          </button>
        </div>

        {/* Social icons footer + Project Contact & Quick Links */}
        <div className="relative z-10 flex flex-col items-center gap-5 pb-10 px-6">
          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/nam.hoai.711250/"
              target="_blank"
              rel="noreferrer"
              aria-label="Cộng đồng THE BOYS 3D"
              className="liquid-glass rounded-full p-4 text-emerald-100/85 hover:text-[#7ef7e1] hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/Nina11122005"
              target="_blank"
              rel="noreferrer"
              aria-label="Kênh tin tức THE BOYS 3D"
              className="liquid-glass rounded-full p-4 text-emerald-100/85 hover:text-[#7ef7e1] hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <Link
              to="/create"
              aria-label="Mở Studio 3D"
              className="liquid-glass rounded-full p-4 text-emerald-100/85 hover:text-[#7ef7e1] hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all"
            >
              <Globe className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-100/60 text-center">
            <span>© 2026 THE BOYS · Idea2Model (AI Image-to-3D &amp; 3D Printing)</span>
            <span>Hotline: 1900 1234</span>
            <span>studio@idea2model.com</span>
            <Link to="/create" viewTransition className="hover:text-[#7ef7e1] transition-colors">
              AI 3D Studio
            </Link>
            <Link to="/profile" viewTransition className="hover:text-[#7ef7e1] transition-colors">
              Hồ sơ cá nhân
            </Link>
            <Link to="/my-bookings" viewTransition className="hover:text-[#7ef7e1] transition-colors">
              Đơn hàng &amp; Lịch sử in 3D
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
