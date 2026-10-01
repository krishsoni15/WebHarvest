'use client';

import React, { useEffect, useState } from 'react';

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  separator?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({
  from = 0,
  to,
  duration = 1.2,
  separator = ',',
  decimals = 0,
  className = '',
}: CountUpProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const durationMs = duration * 1000;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      // Ease out expo
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = from + (to - from) * easeOut;

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [from, to, duration]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : Math.round(count).toLocaleString();

  return <span className={className}>{formatted}</span>;
}
