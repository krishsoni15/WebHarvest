'use client';

import React, { useEffect, useState } from 'react';

/**
 * ✨ Serin-style Breathing Animated Gradient Background
 *
 * Implements the exact curved half-circle arc from Serin AI:
 * - A crisp, radiant full half-circle beam sweeping across the hero
 * - A vibrant glowing halo outlining the half circle
 * - A central headline blooming aura
 * - Smooth 8-second biological breathing respiration
 * - Parallax mouse response
 */
export function HeroBreathingGradient() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) * 0.025;
      const y = (e.clientY - window.innerHeight / 2) * 0.025;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[1050px] min-h-[850px] max-h-[1200px] overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* Parallax Wrapper for the Half-Circle Arc System */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out serin-arc-mask"
        style={{
          transform: `translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.25}px, 0)`,
        }}
      >
        {/* Breathing Container */}
        <div className="absolute inset-0 animate-serin-arc">
          {/* 1. Deep Ambient Respiration Halo */}
          <div className="absolute inset-x-[-20%] top-[-15%] h-[125%] serin-arc-ambient blur-[45px] sm:blur-[60px]" />

          {/* 2. Vibrant Radiant Crescent Glow */}
          <div className="absolute inset-x-[-20%] top-[-15%] h-[125%] serin-arc-glow blur-[16px] sm:blur-[22px]" />

          {/* 3. Razor-Sharp Luminous Half-Circle Core Beam */}
          <div className="absolute inset-x-[-20%] top-[-15%] h-[125%] serin-arc-core blur-[2.5px] sm:blur-[3.5px]" />

          {/* 4. Serin Bottom Horizon Aura (Lifted ~1-2% from bottom edge) */}
          <div className="absolute inset-x-[-15%] bottom-[1.5%] h-[55%] serin-bottom-aura blur-[35px] sm:blur-[45px]" />
        </div>
      </div>

      {/* Subtle Anti-Banding Film Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}

export default HeroBreathingGradient;
