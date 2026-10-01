'use client';

import React from 'react';

interface ProgressHeaderProps {
  progress: number;
  currentAction?: string;
  etaSeconds?: number | null;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
}

export function ProgressHeader({
  progress,
  currentAction = 'Crawling pages and downloading assets...',
  etaSeconds,
  status,
}: ProgressHeaderProps) {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const formatEta = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
      return status === 'completed' ? 'Done' : 'ETA: 2m 14s';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `ETA: ${mins}m ${secs}s`;
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-5 shadow-xs">
      {/* Top row: Overall Progress label & percentage */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          Overall Progress
        </h2>
        <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
          {clampedProgress}%
        </span>
      </div>

      {/* Monochrome Progress Bar */}
      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Subtitle and ETA */}
      <div className="flex items-center justify-between mt-2.5 text-xs text-muted-foreground font-mono">
        <span className="truncate">{currentAction}</span>
        <span className="shrink-0 ml-2">{formatEta(etaSeconds)}</span>
      </div>
    </div>
  );
}
