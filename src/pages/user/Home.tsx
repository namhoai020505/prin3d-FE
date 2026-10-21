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

      {/* Studio Dark Noir Overlays: Dims the crimson studio backdrop into an elegant cinema dark tone while highlighting the 3D character */}
      {/* 1. Left-to-right dark wash: ensures console, pills, and typography are crisp and ultra-readable */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #09090b 0%, rgba(9, 9, 11, 0.94) 34%, rgba(9, 9, 11, 0.72) 55%, rgba(9, 9, 11, 0.22) 78%, rgba(9, 9, 11, 0.42) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 2. Character Spotlight Vignette: soft vignette keeping the 3D boy highlighted at 74% 45% while subduing edge red */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 74% 45%, rgba(9, 9, 11, 0) 18%, rgba(9, 9, 11, 0.38) 52%, rgba(6, 6, 8, 0.88) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 3. Top and bottom cinema edge feathering */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(9, 9, 11, 0.55) 0%, transparent 16%, transparent 80%, #09090b 100%)',
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
