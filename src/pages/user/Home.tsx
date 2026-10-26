import { useEffect, useRef } from 'react';
import HeroCreateSection from './components/HeroCreateSection';
import ScrollStory from '../../components/ui/ScrollStory';
import CommunitySection from './components/CommunitySection';

const VIDEO_SRC = '/videos/hero_character.mp4';
const SENSITIVITY = 0.8;

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevXRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  // Mouse-scrub controlled background video
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        prevXRef.current = e.clientX;
        return;
      }

      if (prevXRef.current === null) {
        prevXRef.current = e.clientX;
        return;
      }

      const delta = e.clientX - prevXRef.current;
      prevXRef.current = e.clientX;

      const timeOffset =
        (delta / Math.max(1, window.innerWidth)) * SENSITIVITY * video.duration;
      const nextTime = Math.min(
        video.duration,
        Math.max(0, targetTimeRef.current + timeOffset)
      );
      targetTimeRef.current = nextTime;

      if (!isSeekingRef.current) {
        isSeekingRef.current = true;
        video.currentTime = nextTime;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleVideoSeeked = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) {
      isSeekingRef.current = false;
      return;
    }

    if (Math.abs(targetTimeRef.current - video.currentTime) > 0.015) {
      video.currentTime = targetTimeRef.current;
    } else {
      isSeekingRef.current = false;
    }
  };

  return (
    <div className="theboys-home-stage w-full flex flex-col items-center min-h-[calc(100vh-60px)]">
      {/* Full-Screen Mouse-Scrub Controlled Background Video - Fixed strictly to right of sidebar */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        onSeeked={handleVideoSeeked}
        className="fixed inset-y-0 right-0 left-[64px] md:left-[72px] z-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ objectPosition: '70% center' }}
      />

      {/* Studio Light Wabi-Sabi Overlays - Clear Right Side so 3D Character is 100% Crisp & Sharp */}
      {/* Left-to-right light wash: protects text & console readability on the left (0-45%), then transitions to 100% transparent by 56%, leaving the 3D character completely unobstructed with zero blur and zero fog */}
      <div
        className="fixed inset-y-0 right-0 left-[64px] md:left-[72px] z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #F6F3EE 0%, rgba(246, 243, 238, 0.98) 35%, rgba(246, 243, 238, 0.65) 45%, rgba(246, 243, 238, 0) 56%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Foreground Content (z-index: 1) */}
      <div className="relative z-[1] w-full flex flex-col items-center">
        {/* Mainframe Hero + THE BOYS 3D Upload Console */}
        <HeroCreateSection />

        {/* Section Cách Hoạt Động: Scrollytelling 3 Bước Tinh Gọn */}
        <ScrollStory />

        {/* Community 3D Showcase Section with 3D Tilt */}
        <CommunitySection />
      </div>
    </div>
  );
}
