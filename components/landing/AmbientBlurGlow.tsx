'use client';

import React, { useEffect, useState } from 'react';

/**
 * ✨ Breathing Animated Gradient & Aurora Mesh Background
 * Layered organic glow orbs that smoothly expand/contract (breathe),
 * slowly drift across vectors (aurora flow), and create an ethereal living atmosphere.
 */
export function AmbientBlurGlow() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Subtle mouse parallax attraction
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) * 0.035;
      const y = (e.clientY - window.innerHeight / 2) * 0.035;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* 1. Global Animated Gradient Mesh Shimmer */}
      <div className="absolute inset-0 opacity-50 dark:opacity-40 animate-gradient-shift bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,0,0,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.14),transparent)]" />

      {/* 2. Core Breathing Center Halo */}
      <div
        className="absolute top-[22%] left-1/2 w-[850px] sm:w-[1200px] h-[480px] sm:h-[620px] rounded-full blur-[110px] sm:blur-[140px] animate-serin-halo transition-transform duration-700 ease-out bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.02)_50%,transparent_75%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_45%,transparent_75%)]"
        style={{
          transform: `translate(calc(-50% + ${mousePos.x}px), calc(-50% + ${mousePos.y}px))`,
        }}
      />

      {/* 3. Aurora Flow Wave 1: Top-Left Drifting Luminous Blob */}
      <div className="absolute top-[8%] -left-[8%] w-[620px] sm:w-[820px] h-[520px] sm:h-[700px] rounded-full blur-[110px] sm:blur-[140px] bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.06),transparent_70%)] dark:bg-[radial-gradient(circle_at_30%_30%,rgba(220,235,255,0.18),rgba(255,255,255,0.04),transparent_70%)] animate-serin-orb-left" />

      {/* 4. Aurora Flow Wave 2: Top-Right Counter-Drifting Luminous Blob */}
      <div className="absolute top-[12%] -right-[8%] w-[660px] sm:w-[860px] h-[550px] sm:h-[740px] rounded-full blur-[120px] sm:blur-[150px] bg-[radial-gradient(circle_at_70%_30%,rgba(0,0,0,0.06),transparent_70%)] dark:bg-[radial-gradient(circle_at_70%_30%,rgba(235,240,255,0.16),rgba(255,255,255,0.04),transparent_70%)] animate-serin-orb-right" />

      {/* 5. Luminous Horizon Curved Breathing Wave (Ascending Arc) */}
      <div className="absolute -bottom-[20%] left-1/2 w-[1450px] sm:w-[1900px] h-[520px] sm:h-[720px] rounded-[100%] blur-[120px] sm:blur-[160px] bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(0,0,0,0.12),transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(255,255,255,0.26),rgba(215,225,255,0.12),transparent_75%)] animate-serin-horizon" />
    </div>
  );
}
export default AmbientBlurGlow;
