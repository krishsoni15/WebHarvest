'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Shield,
  FileCheck,
  Layers,
  Sparkles,
  Check,
  X,
  Gauge,
  Sliders,
  CheckCircle2,
  HardDrive,
  FileCode,
  FileText,
  Image as ImageIcon,
  Type,
  Video,
} from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShinyText } from '@/components/reactbits/ShinyText';

interface BenchmarkProfile {
  id: string;
  name: string;
  type: string;
  pages: number;
  engine: 'HTTP Fast Stream' | 'Playwright Chromium' | 'Hybrid Auto';
  engineColor: string;
  estimatedTime: string;
  ramEstimate: string;
  fidelity: string;
  notes: string;
}

const PROFILES: BenchmarkProfile[] = [
  {
    id: 'docs',
    name: 'Developer Docs (Docusaurus/Mintlify)',
    type: 'Static & Markdown Trees',
    pages: 1250,
    engine: 'HTTP Fast Stream',
    engineColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    estimatedTime: '8.4 seconds',
    ramEstimate: '42 MB RAM',
    fidelity: '100% Offline Links',
    notes: 'Zero browser overhead. High-throughput stream parses all 1,250 HTML trees and vendors local CSS.',
  },
  {
    id: 'spa',
    name: 'Complex Web App (Linear/React 19)',
    type: 'Dynamic Client-Side Rendered',
    pages: 180,
    engine: 'Playwright Chromium',
    engineColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    estimatedTime: '22.6 seconds',
    ramEstimate: '380 MB RAM',
    fidelity: '100% DOM Hydrated',
    notes: 'Launches isolated headless Chromium context to execute client JS, wait for network idle, and snapshot dynamic modals.',
  },
  {
    id: 'massive',
    name: 'Enterprise Wiki Archive',
    type: 'Massive Multi-Subdomain',
    pages: 15000,
    engine: 'Hybrid Auto',
    engineColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    estimatedTime: '1m 45s',
    ramEstimate: '85 MB RAM',
    fidelity: '100% Deduplicated',
    notes: 'Autonomous dispatcher defaults to streaming HTTP and automatically escalates complex CSR paths to browser instances.',
  },
];

export function DualEngineSection() {
  const [activeProfileId, setActiveProfileId] = useState<string>('docs');
  const [activeAssetFilter, setActiveAssetFilter] = useState<'all' | 'code' | 'styles' | 'media'>('all');

  const activeProfile = PROFILES.find((p) => p.id === activeProfileId) || PROFILES[0];

  const comparison = [
    {
      feature: 'Throughput Speed',
      http: '150–300 pages / sec',
      browser: '10–25 pages / sec',
      winner: 'http',
    },
    {
      feature: 'JavaScript Execution (React/Vue/Next)',
      http: 'Raw HTML / SSR only',
      browser: 'Full Client-Side Hydration',
      winner: 'browser',
    },
    {
      feature: 'Resource Footprint',
      http: '< 45MB RAM lightweight stream',
      browser: 'Headless Chromium context',
      winner: 'http',
    },
    {
      feature: 'Infinite Scroll & Lazy Loading',
      http: 'Basic DOM parser',
      browser: 'Auto-scroll & network idle',
      winner: 'browser',
    },
    {
      feature: 'Action Shield (Destructive Click Guard)',
      http: 'Read-only HTTP safe',
      browser: 'Heuristic click interceptor',
      winner: 'both',
    },
    {
      feature: 'Offline Link Localization',
      http: 'Deterministic rewrite',
      browser: 'Deterministic rewrite',
      winner: 'both',
    },
  ];

  const assets = [
    { name: 'HTML & Layouts', ext: '.html', category: 'code', icon: FileCode, desc: 'All nested pages, routes & directory indexes rewritten' },
    { name: 'Stylesheets & CSS', ext: '.css', category: 'styles', icon: Layers, desc: 'Rewritten url(), @import paths & localized vendor styles' },
    { name: 'JavaScript Bundles', ext: '.js, .mjs', category: 'code', icon: FileText, desc: 'Client runtime preserved with decoupled external tracking' },
    { name: 'Vector & Raster Images', ext: '.svg, .webp, .png', category: 'media', icon: ImageIcon, desc: 'Downloaded, hashed & mapped to local /assets/ directory' },
    { name: 'Typography & WebFonts', ext: '.woff2, .woff, .ttf', category: 'styles', icon: Type, desc: 'Google Fonts & custom font-faces vendored offline' },
    { name: 'Media & Documents', ext: '.mp4, .webm, .pdf', category: 'media', icon: Video, desc: 'Embedded documents, video loops & static guides' },
  ];

  const filteredAssets = activeAssetFilter === 'all'
    ? assets
    : assets.filter((a) => a.category === activeAssetFilter);

  return (
    <section id="architecture" className="w-full max-w-5xl mx-auto mt-16 sm:mt-24 relative z-10 scroll-mt-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto px-4 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium mb-3 backdrop-blur-md">
          <Cpu className="w-3.5 h-3.5" />
          <ShinyText text="DUAL ENGINE ARCHITECTURE" speed={4} className="text-xs uppercase tracking-wider" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3 leading-tight">
          Engineered for Both Speed & Complexity
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          WebHarvest seamlessly combines an ultra-fast streaming HTTP parser with an automated Playwright headless browser fallback.
        </p>
      </div>

      {/* Interactive Workload Estimator / Benchmark Calculator */}
      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-md mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">
              Workload Benchmark Calculator
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
            {PROFILES.map((prof) => (
              <button
                key={prof.id}
                type="button"
                onClick={() => setActiveProfileId(prof.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  activeProfileId === prof.id
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {prof.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Benchmark Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="p-3 rounded-xl bg-background/60 border border-border font-mono text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Target Pages</div>
            <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {activeProfile.pages.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-background/60 border border-border font-mono text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Assigned Engine</div>
            <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5 truncate">
              {activeProfile.engine}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-background/60 border border-border font-mono text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Projected Time</div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
              {activeProfile.estimatedTime}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-background/60 border border-border font-mono text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Peak RAM</div>
            <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {activeProfile.ramEstimate}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-mono bg-muted/40 p-2.5 rounded-lg border border-border/60">
          💡 {activeProfile.notes}
        </p>
      </div>

      {/* Comparison Table Card */}
      <SpotlightCard
        spotlightColor="rgba(59, 130, 246, 0.12)"
        className="p-4 sm:p-7 rounded-2xl border border-border bg-card/70 backdrop-blur-md mb-8 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-foreground">
              Dual-Engine Capabilities Matrix
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            Auto-Dispatched
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <table className="w-full min-w-[460px] sm:min-w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 pr-3 font-medium">Capability</th>
                <th className="py-2.5 px-3 font-medium text-sky-400">Fast HTTP Engine</th>
                <th className="py-2.5 pl-3 font-medium text-violet-400">Playwright Browser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {comparison.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-3 font-medium text-foreground font-sans">
                    {row.feature}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    <span className={row.winner === 'http' || row.winner === 'both' ? 'text-foreground font-semibold' : ''}>
                      {row.http}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-muted-foreground">
                    <span className={row.winner === 'browser' || row.winner === 'both' ? 'text-foreground font-semibold' : ''}>
                      {row.browser}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpotlightCard>

      {/* Asset Coverage with Filter Tabs */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Preserved Asset Categories
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 100% Offline Rewriting
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
            {[
              { id: 'all', label: 'All' },
              { id: 'code', label: 'Code & Markup' },
              { id: 'styles', label: 'Styles & Fonts' },
              { id: 'media', label: 'Media & Docs' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveAssetFilter(f.id as any)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  activeAssetFilter === f.id
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map((ast, idx) => {
            const Icon = ast.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card/95 transition-all flex items-start gap-3 hover:border-foreground/30"
              >
                <div className="p-2 rounded-lg bg-muted text-foreground border border-border shrink-0">
                  <Icon className="w-4 h-4 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {ast.name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 px-1 py-0.2 rounded bg-muted/60 border border-border">
                      {ast.ext}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {ast.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
