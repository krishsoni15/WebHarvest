'use client';

import React from 'react';

export interface ActivityItem {
  timestamp?: string;
  method?: string;
  url: string;
  status?: number;
  size?: string;
}

interface LiveActivityProps {
  items: ActivityItem[];
  recentFiles?: { name: string; size: number }[];
  isCrawling: boolean;
  hostname?: string;
}

export function LiveActivity({
  items,
  recentFiles,
  isCrawling,
  hostname = 'target.com',
}: LiveActivityProps) {
  const defaultMockItems: ActivityItem[] = [
    { timestamp: '09:41:32', method: 'GET', url: `https://${hostname}/`, size: '28.4 KB', status: 200 },
    { timestamp: '09:41:31', method: 'GET', url: `https://${hostname}/assets/app.js`, size: '124 KB', status: 200 },
    { timestamp: '09:41:30', method: 'GET', url: `https://${hostname}/assets/styles.css`, size: '86 KB', status: 200 },
    { timestamp: '09:41:29', method: 'GET', url: `https://${hostname}/images/hero.webp`, size: '421 KB', status: 200 },
    { timestamp: '09:41:28', method: 'GET', url: `https://${hostname}/api/data`, size: '12.8 KB', status: 200 },
    { timestamp: '09:41:27', method: 'GET', url: `https://${hostname}/fonts/inter.woff2`, size: '156 KB', status: 200 },
  ];

  const displayItems = items && items.length > 0 ? items : defaultMockItems;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">
          Live Activity
        </h3>
        <span className="text-[11px] font-mono text-muted-foreground">
          {displayItems.length} events
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-1.5 font-mono text-xs">
        {displayItems.slice(0, 7).map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 py-1.5 hover:bg-muted/50 px-2 rounded-md transition-colors"
          >
            {/* Left: Monochrome Dot + Timestamp + Method + URL */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
              <span className="text-muted-foreground text-[11px] shrink-0">
                {item.timestamp || '09:41:30'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-semibold shrink-0">
                {item.method || 'GET'}
              </span>
              <span className="text-foreground/90 truncate text-[11px]" title={item.url}>
                {item.url}
              </span>
            </div>

            {/* Right: Size + Status Pill */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground text-[11px] w-14 text-right">
                {item.size || '28.4 KB'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold text-[10px] border border-border">
                {item.status || 200}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
