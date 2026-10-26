import { useState, useEffect } from 'react';

interface ParallaxOptions {
  speed?: number; // negative moves opposite, positive moves along
  maxOffset?: number;
}

export function useParallax({ speed = 0.2, maxOffset = 100 }: ParallaxOptions = {}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    // Check pointer: coarse (touch screens)
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    if (pointerQuery.matches) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const calculated = Math.max(-maxOffset, Math.min(maxOffset, scrollY * speed));
          setOffset(calculated);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, maxOffset]);

  return offset;
}

export default useParallax;

