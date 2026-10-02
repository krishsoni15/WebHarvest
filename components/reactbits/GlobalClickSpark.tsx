'use client';

import React, { useRef, useEffect } from 'react';

interface GlobalClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

export function GlobalClickSpark({
  sparkColor,
  sparkSize = 9,
  sparkRadius = 26,
  sparkCount = 8,
  duration = 380,
}: GlobalClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = (time: number) => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isLight = document.documentElement.classList.contains('light');
      const activeColor = sparkColor || (isLight ? '#000000' : '#ffffff');

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = time - spark.startTime;
        if (elapsed > duration) return false;

        const progress = elapsed / duration;
        const easedProgress = Math.sin((progress * Math.PI) / 2); // Ease out
        const distance = easedProgress * sparkRadius;
        const currentLength = sparkSize * (1 - progress);

        const x1 = spark.x + Math.cos(spark.angle) * distance;
        const y1 = spark.y + Math.sin(spark.angle) * distance;
        const x2 = spark.x + Math.cos(spark.angle) * (distance + currentLength);
        const y2 = spark.y + Math.sin(spark.angle) * (distance + currentLength);

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();

        return true;
      });

      if (sparksRef.current.length > 0) {
        requestAnimationFrame(render);
      } else {
        isAnimatingRef.current = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore right clicks or secondary buttons
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const now = performance.now();
      const baseAngle = Math.random() * Math.PI;

      for (let i = 0; i < sparkCount; i++) {
        sparksRef.current.push({
          x: e.clientX,
          y: e.clientY,
          angle: baseAngle + (i * 2 * Math.PI) / sparkCount,
          startTime: now,
        });
      }

      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        requestAnimationFrame(render);
      }
    };

    // Use capture phase so sparks trigger even on components that stop propagation
    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-9999 h-full w-full select-none"
      aria-hidden="true"
    />
  );
}
