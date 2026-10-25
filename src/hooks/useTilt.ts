import { useState, useRef, useCallback, useEffect } from 'react';

interface TiltOptions {
  maxTilt?: number; // in degrees, default 6
  perspective?: number; // default 1000
  scale?: number; // default 1.02
  speed?: number; // ms, default 300
}

export function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 6,
  perspective = 1000,
  scale = 1.02,
  speed = 300,
}: TiltOptions = {}) {
  const ref = useRef<T | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transformStyle: 'preserve-3d',
  });
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      media.addEventListener('change', listener);

      const pointerMedia = window.matchMedia('(pointer: coarse)');
      setIsTouchDevice(pointerMedia.matches);

      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      if (isReducedMotion || isTouchDevice || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((centerY - y) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      const glareX = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const glareY = Math.max(0, Math.min(100, (y / rect.height) * 100));
      setGlarePosition({ x: glareX, y: glareY });

      setStyle({
        transform: `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, 1)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
      });
    },
    [isReducedMotion, isTouchDevice, maxTilt, perspective, scale]
  );

  const handleMouseEnter = useCallback(() => {
    if (isReducedMotion || isTouchDevice) return;
    setIsHovered(true);
  }, [isReducedMotion, isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transformStyle: 'preserve-3d',
      transition: `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`,
    });
  }, [perspective, speed]);

  return { ref, style, glarePosition, isHovered, handleMouseMove, handleMouseEnter, handleMouseLeave };
}

export default useTilt;

