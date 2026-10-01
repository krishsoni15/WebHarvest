'use client';

import React from 'react';

export interface CoverageRow {
  label: string;
  downloaded: number;
  total: number;
}

interface ResourceCoverageProps {
  data?: any;
}

const DEFAULT_COVERAGE: CoverageRow[] = [
  { label: 'HTML', downloaded: 684, total: 684 },
  { label: 'CSS', downloaded: 312, total: 312 },
  { label: 'JavaScript', downloaded: 428, total: 512 },
  { label: 'Images', downloaded: 1486, total: 1502 },
  { label: 'Fonts', downloaded: 42, total: 44 },
  { label: 'Video', downloaded: 8, total: 8 },
  { label: 'Audio', downloaded: 5, total: 5 },
  { label: 'Documents', downloaded: 96, total: 102 },
  { label: 'Other', downloaded: 187, total: 201 },
];

export function ResourceCoverage({ data }: ResourceCoverageProps) {
  const rows: CoverageRow[] = DEFAULT_COVERAGE.map((row) => {
    if (!data) return row;
    const key = row.label.toLowerCase();
    if (data[key]) {
      return {
        label: row.label,
        downloaded: data[key].downloaded ?? row.downloaded,
        total: data[key].total ?? row.total,
      };
    }
    return row;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">
          Capture Coverage
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          Resource Breakdown
        </span>
      </div>

      {/* Rows with clean monochrome progress bars */}
      <div className="space-y-2 text-xs font-mono">
        {rows.map((row) => {
          const percentage = Math.min(100, Math.round((row.downloaded / Math.max(1, row.total)) * 100));

          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/90 font-sans font-medium">{row.label}</span>
                <span className="text-muted-foreground">
                  {row.downloaded.toLocaleString()} / {row.total.toLocaleString()}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
