'use client';

import React from 'react';
import { Cpu, FileCode, Archive, Sparkles, Check } from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShinyText } from '@/components/reactbits/ShinyText';

const PILLARS = [
  {
    icon: Cpu,
    title: 'Dual Engine Hydration',
    badge: 'Fast + Headless',
    desc: 'Lightweight streaming HTTP parser with automatic Chromium execution for client-side SPAs (React, Vue, Next.js).',
    stat: '180+ pages/s',
  },
  {
    icon: FileCode,
    title: 'Deterministic Rewriter',
    badge: '100% Air-Gapped',
    desc: 'Rewrites absolute CDN paths, CSS url() declarations, and Google Fonts into self-contained relative files.',
    stat: '0 External CDNs',
  },
  {
    icon: Archive,
    title: 'Portable ZIP Archive',
    badge: 'Zero Server Needed',
    desc: 'Packages complete website trees into a standalone offline bundle with cryptographic SHA-256 integrity manifests.',
    stat: '1-Click Export',
  },
];

export function ThreePillarsSection() {
  return (
    <section id="pillars" className="w-full max-w-4xl mx-auto mt-12 sm:mt-16 mb-16 sm:mb-20 scroll-mt-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <SpotlightCard
              key={idx}
              spotlightColor="rgba(255, 255, 255, 0.08)"
              className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md flex flex-col justify-between hover:border-foreground/40 transition-all duration-300 group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl border border-border bg-muted flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border bg-muted text-foreground">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {pillar.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-foreground font-medium">{pillar.stat}</span>
                <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Check className="w-3 h-3 text-foreground" /> Verified
                </span>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
}
