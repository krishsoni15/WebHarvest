'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  const variants = {
    default: 'bg-primary/15 text-primary border border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    outline: 'border border-border text-foreground',
    success: 'bg-foreground text-background border border-border font-medium',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:text-amber-400',
    destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  );
}
