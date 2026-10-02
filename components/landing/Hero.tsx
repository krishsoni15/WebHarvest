'use client';

import React from 'react';
import { ShinyText } from '@/components/reactbits/ShinyText';

interface HeroProps {
  onSelectPresetUrl?: (url: string, preset: 'quick' | 'website' | 'full') => void;
}

export function Hero({ onSelectPresetUrl }: HeroProps) {
  return (
    <section className="pt-8 pb-3 sm:pt-14 sm:pb-6 text-center relative">
      <div className="max-w-3xl mx-auto px-2 sm:px-6 flex flex-col items-center relative z-10">
        {/* Main 2-line headline with font-display & ShinyText */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12] max-w-3xl mb-3 sm:mb-4 font-display">
          <ShinyText text="Capture the web." speed={5} /> <br />
          <span className="text-muted-foreground font-normal">
            Reconstruct it flawlessly offline.
          </span>
        </h1>

        {/* Supporting copy with font-sans & high readability */}
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-2xl font-normal px-2 sm:px-0 mb-4 sm:mb-6 font-sans">
          Transform dynamic SPAs, technical docs, and complex web apps into{' '}
          <span className="text-foreground font-medium">100% self-contained, air-gapped offline mirrors</span>{' '}
          with zero broken links.
        </p>
      </div>
    </section>
  );
}

