'use client';

import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
}: ShinyTextProps) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`inline-block relative overflow-hidden bg-clip-text ${
        disabled ? 'text-foreground' : 'shiny-text'
      } ${className}`}
      style={{
        animation: disabled ? 'none' : `shineText ${animationDuration} ease-in-out infinite`,
      }}
    >
      {text}
    </span>
  );
}
