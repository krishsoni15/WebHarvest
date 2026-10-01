'use client';

import React from 'react';
import { ShinyText } from '@/components/reactbits/ShinyText';

export function Hero() {
  return (
    <section className="pt-12 pb-6 sm:pt-16 sm:pb-8 text-center relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center relative z-10">
        {/* Sleek SaaS pill badge with beacon & shimmer */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-border/80 bg-card/80 backdrop-blur-md text-xs font-mono text-muted-foreground mb-6 shadow-xs hover:border-foreground/40 transition-colors">
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
          </span>
          <ShinyText
            text="V3 // RECONSTRUCTION ENGINE"
            speed={4.5}
            className="tracking-widest uppercase text-[11px] font-mono font-medium"
          />
        </div>

        {/* Main 2-line headline with ShinyText */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15] max-w-2xl mb-4">
          <ShinyText text="Capture the web." speed={5} /> <br />
          <span className="text-muted-foreground font-normal">
            Reconstruct it completely.
          </span>
        </h1>

        {/* Supporting copy */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl font-normal">
          Download, render and mirror full websites with offline link rewriting,
          Playwright execution, and resource preservation.
        </p>
      </div>
    </section>
  );
}
