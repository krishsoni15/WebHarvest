'use client';

import React, { useEffect, useRef } from 'react';

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  className?: string;
  isFixed?: boolean;
}

export function DotGridBackground({
  dotSize = 1.25,
  gap = 24,
  baseColor = 'rgba(255, 255, 255, 0.14)',
  activeColor = 'rgba(255, 255, 255, 0.95)',
  className = '',
  isFixed = true,
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; radius: number }>({
    x: -1000,
    y: -1000,
    radius: 160,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isLight = document.documentElement.classList.contains('light');

    const observer = new MutationObserver(() => {
      isLight = document.documentElement.classList.contains('light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    let animationFrameId: number;
    let width = (canvas.width = isFixed ? window.innerWidth : (canvas.parentElement?.clientWidth || window.innerWidth));
    let height = (canvas.height = isFixed ? window.innerHeight : (canvas.parentElement?.clientHeight || window.innerHeight));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = isFixed ? window.innerWidth : (canvas.parentElement?.clientWidth || window.innerWidth);
      height = canvas.height = isFixed ? window.innerHeight : (canvas.parentElement?.clientHeight || window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (isFixed) {
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      } else {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const cols = Math.floor(width / gap);
      const rows = Math.floor(height / gap);

      const offsetX = (width - cols * gap) / 2;
      const offsetY = (height - rows * gap) / 2;

      const currentBaseColor = isLight ? 'rgba(0, 0, 0, 0.08)' : (baseColor || 'rgba(255, 255, 255, 0.12)');
      const currentActiveColor = isLight ? 'rgba(0, 0, 0, 0.85)' : (activeColor || 'rgba(255, 255, 255, 0.95)');

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = offsetX + i * gap;
          const y = offsetY + j * gap;

          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          ctx.beginPath();

          if (dist < mouse.radius) {
            const factor = Math.max(0, 1 - dist / mouse.radius);
            const ease = factor * factor;
            ctx.fillStyle = currentActiveColor;
            ctx.arc(x, y, dotSize + ease * 2.0, 0, Math.PI * 2);
          } else {
            ctx.fillStyle = currentBaseColor;
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          }

          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotSize, gap, baseColor, activeColor, isFixed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
      }}
      className={`pointer-events-none ${isFixed ? 'fixed' : 'absolute'} inset-0 -z-10 h-full w-full ${className}`}
    />
  );
}
