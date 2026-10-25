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

      {/* Studio Dark Noir Overlays: Dims backdrop into an obsidian dark tone */}
      {/* 1. Left-to-right dark wash: ensures console, pills, and typography are crisp and ultra-readable */}
      <div
        className="fixed inset-y-0 right-0 left-[64px] md:left-[72px] z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #070a0f 0%, rgba(7, 10, 15, 0.92) 32%, rgba(7, 10, 15, 0.5) 54%, transparent 75%)',
        }}
        aria-hidden="true"
      />

      {/* 2. Character Spotlight Vignette */}
      <div
        className="fixed inset-y-0 right-0 left-[64px] md:left-[72px] z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 74% 45%, rgba(7, 10, 15, 0) 25%, rgba(7, 10, 15, 0.2) 60%, rgba(7, 10, 15, 0.8) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 3. Top and bottom cinema edge feathering */}
      <div
        className="fixed inset-y-0 right-0 left-[64px] md:left-[72px] z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(7, 10, 15, 0.5) 0%, transparent 16%, transparent 80%, #070a0f 100%)',
        }}
        aria-hidden="true"
      />

      {/* Foreground Content (z-index: 1) */}
      <div className="relative z-[1] w-full flex flex-col items-center">
        {/* Mainframe Hero + THE BOYS 3D Upload Console */}
        <HeroCreateSection />

        {/* Section Cách Hoạt Động: Scrollytelling 5 Bước */}
        <ScrollStory />

        {/* Community 3D Showcase Section with 3D Tilt */}
        <CommunitySection />
      </div>
    </div>
  );
}
