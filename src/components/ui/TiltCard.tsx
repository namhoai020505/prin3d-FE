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
  maxTilt = 6,
  perspective = 1000,
  scale = 1.02,
  glare = true,
  className = '',
  ...props
}) => {
  const { ref, style, isHovered, handleMouseMove, handleMouseEnter, handleMouseLeave } =
    useTilt<HTMLDivElement>({ maxTilt, perspective, scale });

  return (
    <div
      ref={ref}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl transition-shadow duration-300 will-change-transform ${
        isHovered ? 'shadow-[0_12px_40px_rgba(0,240,255,0.18)]' : 'shadow-md'
      } ${className}`}
      {...props}
    >
      {children}

      {/* Subtle specular sheen on hover */}
      {glare && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-cyan-400/[0.07] to-transparent opacity-80 mix-blend-overlay transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default TiltCard;

