'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
  threshold = 0.12,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // If user prefers reduced motion, show immediately
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const currentEl = elementRef.current;
    if (!currentEl) return;

    // Use IntersectionObserver
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delayMs > 0) {
            setTimeout(() => {
              setIsVisible(true);
            }, delayMs);
          } else {
            setIsVisible(true);
          }
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(currentEl);

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [delayMs, threshold]);

  const getDirectionTransform = () => {
    if (direction === 'up') return 'translate-y-6';
    if (direction === 'down') return '-translate-y-6';
    if (direction === 'left') return 'translate-x-6';
    if (direction === 'right') return '-translate-x-6';
    return '';
  };

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-700 ease-out will-change-transform ${
        isVisible
          ? 'opacity-100 translate-y-0 translate-x-0'
          : `opacity-0 ${getDirectionTransform()}`
      } ${className}`}
    >
      {children}
    </div>
  );
}
