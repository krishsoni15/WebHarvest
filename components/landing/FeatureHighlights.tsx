'use client';

import React from 'react';
import { Cpu, Shield, FileCode, Archive } from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

const HIGHLIGHTS = [
  {
    icon: Cpu,
    title: 'Dual Engine',
    desc: 'Fast streaming HTTP with automatic Playwright fallback for single-page apps.',
  },
  {
    icon: FileCode,
    title: 'Offline Rewriter',
    desc: 'Rewrites absolute URLs, CSS url(), and asset paths to local relative links.',
  },
  {
    icon: Shield,
    title: 'Action Shield',
    desc: 'Heuristics protect against destructive logout or mutate clicks during crawls.',
  },
  {
    icon: Archive,
    title: 'Portable ZIP',
    desc: 'Exports standalone offline website mirrors complete with manifest JSON.',
  },
];

export function FeatureHighlights() {
  return (
    <section className="w-full max-w-4xl mx-auto mt-12 mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {HIGHLIGHTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <SpotlightCard
              key={idx}
              spotlightColor="rgba(255, 255, 255, 0.08)"
              className="p-3.5 rounded-xl border border-border bg-card/40 flex flex-col justify-between"
            >
              <div className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground mb-2.5">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-1">
                  {item.title}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {item.desc}
                </p>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
}
