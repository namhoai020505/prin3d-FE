import React from 'react';
import { useTilt } from '../../hooks/useTilt';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  glare?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  maxTilt = 5,
  perspective = 1000,
  scale = 1.015,
  glare = true,
  className = '',
  style: propStyle,
  ...props
}) => {
  const { ref, style, glarePosition, isHovered, handleMouseMove, handleMouseEnter, handleMouseLeave } =
    useTilt<HTMLDivElement>({ maxTilt, perspective, scale });

  return (
    <div
      ref={ref}
      style={{ ...style, ...propStyle }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl transition-all duration-300 will-change-transform ${
        isHovered
          ? 'shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(0,240,255,0.18)]'
          : 'shadow-md'
      } ${className}`}
      {...props}
    >
      {/* Dynamic Specular Sheen (Glides smoothly across surface tracking pointer) */}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-10 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 350px at ${glarePosition.x}% ${glarePosition.y}%, rgba(0, 240, 255, 0.16), rgba(16, 185, 129, 0.04) 40%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Layered content container preserving 3D space */}
      <div className="relative z-0 h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
};

export default TiltCard;

