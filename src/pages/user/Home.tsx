import { useEffect, useRef } from 'react';
import HeroCreateSection from './components/HeroCreateSection';
import CommunitySection from './components/CommunitySection';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_041744_63efcd78-bf7d-4039-99e2-2461e8a61903.mp4';
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
      {/* Full-Screen Mouse-Scrub Controlled Background Video (z-index: 0) */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        onSeeked={handleVideoSeeked}
        className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ objectPosition: '70% center' }}
      />

      {/* Subtle studio crimson vignette: keeps the 3D character on the right (70% center) vivid & unobstructed */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 74% 45%, rgba(42, 4, 8, 0.02) 0%, rgba(34, 3, 7, 0.24) 55%, rgba(22, 2, 5, 0.52) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Foreground Content (z-index: 1) */}
      <div className="relative z-[1] w-full flex flex-col items-center">
        {/* Mainframe Hero + THE BOYS 3D Upload Console */}
        <HeroCreateSection />

        {/* Community 3D Showcase Section */}
        <CommunitySection />
      </div>
    </div>
  );
}
