'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Progress({
  value = 0,
  className,
  indicatorClassName,
  ...props
}: {
  value?: number;
  className?: string;
  indicatorClassName?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all duration-300 ease-out',
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </div>
  );
}
