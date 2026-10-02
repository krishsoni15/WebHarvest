'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';
import { ShinyText } from '@/components/reactbits/ShinyText';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does WebHarvest guarantee offline links work without internet?',
      a: 'During the crawl, our Deterministic Offline Rewriter parses the full HTML DOM and CSS AST. Every absolute link, stylesheet import, <script> tag, <img srcset>, and external CDN font (Google Fonts, unpkg, cdnjs) is resolved, downloaded to a localized /assets directory, and rewritten into clean relative paths. You can browse the mirror air-gapped without an internet connection.',
    },
    {
      q: 'What makes WebHarvest different from traditional tools like wget or httrack?',
      a: 'Traditional tools fail on modern Client-Side Rendered (CSR) applications built with React, Vue, Next.js, and Vite because they cannot execute JavaScript. WebHarvest features an intelligent Dual Engine: fast streaming HTTP for static files, plus an automated Playwright headless browser that executes JavaScript bundles, waits for network idle, and snapshots the real hydrated DOM.',
    },
    {
      q: 'Can WebHarvest mirror large sites with 5,000–50,000+ pages?',
      a: 'Yes! WebHarvest uses memory-efficient stream processing with in-memory caching and real-time disk persistence. When run locally on your workstation, crawls achieve 20x higher throughput with zero RAM caps or platform throttling.',
    },
    {
      q: 'How does the Action Shield prevent accidental logouts or destructive clicks?',
      a: 'During headless browser exploration, the Action Shield runs heuristic scanners on all clickable DOM nodes. Any element matching sensitive patterns (such as logout, signout, delete, unsubscribe, checkout, or mutate) is automatically suppressed, ensuring crawls remain safe and nondestructive.',
    },
    {
      q: 'How do I view and export the finished website mirror?',
      a: 'Once a crawl completes, you can inspect pages immediately using the built-in Sandbox Browser preview, explore localized asset hierarchies in the Assets tab, or click "Export Standalone ZIP" to download a complete, portable archive that you can host anywhere or open directly on your machine.',
    },
  ];

  return (
    <section id="faq" className="w-full max-w-4xl mx-auto mt-16 sm:mt-28 mb-16 relative z-10 scroll-mt-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-mono font-medium mb-4 backdrop-blur-md">
          <HelpCircle className="w-3.5 h-3.5" />
          <ShinyText text="KNOWLEDGE & FAQS" speed={4} className="text-xs uppercase tracking-wider" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mb-3 leading-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Everything you need to know about autonomous website mirroring, asset localization, and engine capabilities.
        </p>
      </div>

      {/* Accordion list */}
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card/70 backdrop-blur-md overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <span className="font-semibold text-xs sm:text-sm text-foreground">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-foreground' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 pt-0 text-xs sm:text-[13px] text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in-50 duration-150">
                  <p className="pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
