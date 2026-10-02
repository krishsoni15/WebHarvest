'use client';

import React, { useState } from 'react';
import { BookOpen, Palette, ShieldCheck, Database, Check, ArrowRight, Zap, Target } from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShinyText } from '@/components/reactbits/ShinyText';

export function BestUsedForSection() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const useCases = [
    {
      id: 'docs',
      category: 'developers',
      title: 'Documentation & Dev Portals',
      tag: 'Air-Gapped Engineering',
      icon: BookOpen,
      desc: 'Mirror complex developer documentation (Docusaurus, Mintlify, GitBook, Nextra) for instant offline search during travel or in secure air-gapped environments.',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      examples: ['Stripe & Vercel API Docs', 'TailwindCSS & Next.js Guides', 'Python & Rust Standard Libs'],
      stat: '100% Offline Links',
      statLabel: 'Zero external CDNs needed',
    },
    {
      id: 'design',
      category: 'designers',
      title: 'SaaS UI/UX & Design Systems',
      tag: 'Pixel-Fidelity Archival',
      icon: Palette,
      desc: 'Snapshot intricate SaaS landing pages, animated dashboards, CSS keyframe micro-interactions, and component libraries with complete visual accuracy.',
      badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      examples: ['Linear-style Landing Pages', 'Vuexy & Admin Dashboard Templates', 'Interactive Portfolio Showcases'],
      stat: 'Pixel-Perfect',
      statLabel: 'All SVGs, WebFonts & CSS preserved',
    },
    {
      id: 'compliance',
      category: 'legal',
      title: 'Legal, Compliance & Pricing Audits',
      tag: 'Immutable Evidence',
      icon: ShieldCheck,
      desc: 'Create verifiable point-in-time archives of Terms of Service, privacy policies, SaaS tier changes, or regulatory disclosures with exact HTTP metadata.',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      examples: ['SaaS Pricing & Plan Changes', 'Terms of Service & Privacy Audits', 'Regulatory & SEC Public Disclosures'],
      stat: 'Cryptographic',
      statLabel: 'Manifest JSON + Timestamped ZIP',
    },
    {
      id: 'ai',
      category: 'ai',
      title: 'Offline AI & RAG Knowledge Ingestion',
      tag: 'Vector DB Pipeline',
      icon: Database,
      desc: 'Extract clean, self-contained website trees for local LLM vector embeddings, LangChain document loaders, Ollama agents, and private enterprise search.',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      examples: ['Private Enterprise Knowledge Bases', 'Internal Confluence & Wiki Crawls', 'Technical Manuals for Local LLMs'],
      stat: 'RAG-Ready',
      statLabel: 'Structured clean DOM hierarchies',
    },
  ];

  const filtered = activeCategory === 'all' 
    ? useCases 
    : useCases.filter(u => u.category === activeCategory);

  return (
    <section id="use-cases" className="w-full max-w-5xl mx-auto mt-20 sm:mt-28 relative z-10 scroll-mt-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto px-4 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-mono font-medium mb-4 backdrop-blur-md">
          <Target className="w-3.5 h-3.5" />
          <ShinyText text="ENGINEERED WORKLOADS" speed={4} className="text-xs uppercase tracking-wider" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mb-3 leading-tight">
          What WebHarvest Works Best On
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          From heavy single-page apps to massive multi-thousand-page technical libraries, discover why engineers and teams rely on WebHarvest.
        </p>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-6">
          {[
            { id: 'all', label: 'All Scenarios' },
            { id: 'developers', label: 'Documentation' },
            { id: 'designers', label: 'UI/UX Archival' },
            { id: 'legal', label: 'Compliance & Audits' },
            { id: 'ai', label: 'AI & RAG Ingestion' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Workloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <SpotlightCard
              key={item.id}
              spotlightColor="rgba(168, 85, 247, 0.16)"
              className="p-4 sm:p-6 rounded-2xl border border-border bg-card/70 backdrop-blur-md flex flex-col justify-between hover:border-foreground/30 transition-all duration-300 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border border-border bg-muted/60 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor} uppercase tracking-wider`}>
                        {item.tag}
                      </span>
                      <h3 className="text-base font-semibold text-foreground mt-1">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {item.desc}
                </p>

                {/* Example Tags */}
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                    Ideal Targets:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.examples.map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="text-[11px] px-2.5 py-0.5 rounded-md bg-muted/50 border border-border/80 text-foreground font-mono"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Stat Bar */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground font-mono text-xs">
                    {item.stat}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-2">
                    • {item.statLabel}
                  </span>
                </div>
                <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
}
