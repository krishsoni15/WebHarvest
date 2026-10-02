'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Cpu,
  FileCode,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Play,
  Pause,
  Layers,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { DecryptedText } from '@/components/reactbits/DecryptedText';

interface PipelineStep {
  step: string;
  title: string;
  tag: string;
  icon: React.ElementType;
  badgeColor: string;
  shortDesc: string;
  longDesc: string;
  metrics: { label: string; value: string }[];
  visualItems: { label: string; status: string; detail: string }[];
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    step: '01',
    title: 'Discovery & Stream Crawling',
    tag: 'Phase 1: Topology Discovery',
    icon: Network,
    badgeColor: 'border-sky-500/30 text-sky-400 bg-sky-500/10',
    shortDesc: 'Automated sitemap discovery, URL normalization, and deterministic hierarchy mapping.',
    longDesc: 'The discovery engine ingests root targets, queries robots.txt and sitemap.xml endpoints, normalizes URL fragments, and builds a strict depth-bounded topology graph with zero duplicate fetches.',
    metrics: [
      { label: 'Throughput', value: '180+ pages/sec' },
      { label: 'Memory Usage', value: '< 45MB RAM' },
      { label: 'Graph Topology', value: 'Deduplicated AST' },
    ],
    visualItems: [
      { label: 'GET /sitemap.xml', status: 'Parsed', detail: 'Discovered 142 hierarchical child URLs' },
      { label: 'Domain Scope Check', status: 'Enforced', detail: 'External domains safely isolated from traversal' },
      { label: 'Fragment Deduplication', status: 'Normalized', detail: 'Strip #hash anchors and tracking utm_* queries' },
      { label: 'Breadth-First Queue', status: 'Active', detail: 'Priority dispatch queue with auto backpressure' },
    ],
  },
  {
    step: '02',
    title: 'Headless DOM Hydration',
    tag: 'Phase 2: Client Hydration',
    icon: Cpu,
    badgeColor: 'border-violet-500/30 text-violet-400 bg-violet-500/10',
    shortDesc: 'Isolated Playwright Chromium instances hydrate single-page apps (React, Vue, Next.js).',
    longDesc: 'When client-side rendering is detected, an isolated Chromium browser context boots. It executes client JavaScript, waits for network idle, triggers lazy-loaded layouts, and captures the complete hydrated DOM.',
    metrics: [
      { label: 'JS Execution', value: 'Full V8 Runtime' },
      { label: 'Network Gating', value: 'Network Idle 500ms' },
      { label: 'Safety Heuristic', value: 'Action Shield Active' },
    ],
    visualItems: [
      { label: 'Framework Detection', status: 'Identified', detail: 'Next.js App Router & React 19 Hydration confirmed' },
      { label: 'Shadow DOM & Fonts', status: 'Rendered', detail: 'Dynamic CSS-in-JS style injection fully materialized' },
      { label: 'Action Shield Guard', status: 'Defended', detail: 'Destructive forms and logout buttons safely disarmed' },
      { label: 'Hydrated DOM Snapshot', status: 'Captured', detail: '4,812 DOM elements frozen for deterministic rewrite' },
    ],
  },
  {
    step: '03',
    title: 'Deterministic Asset Localization',
    tag: 'Phase 3: Air-Gapped Packaging',
    icon: FileCode,
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    shortDesc: 'Rewrites absolute URLs, vendor stylesheets, fonts, and packages standalone offline ZIP.',
    longDesc: 'The AST rewriter crawls stylesheets, scripts, and document templates. It replaces remote CDN links with local relative references, vendors Google Fonts and external SVG icons, and packages a zero-dependency standalone bundle.',
    metrics: [
      { label: 'Air-Gapped Ready', value: '100% Offline' },
      { label: 'CDN Localization', value: 'Complete Vendor' },
      { label: 'Integrity Check', value: 'SHA-256 Manifest' },
    ],
    visualItems: [
      { label: 'CSS url() Localization', status: 'Rewritten', detail: 'All external font faces & images mapped to ./assets/' },
      { label: 'Hyperlink Normalization', status: 'Relative', detail: 'Paths converted to index.html and subfolder targets' },
      { label: 'Air-Gapped Verification', status: '0 Leaks', detail: 'Zero external network requests on local double-click' },
      { label: 'ZIP Archive Export', status: 'Packaged', detail: 'Standalone portable archive generated with metadata JSON' },
    ],
  },
];

export function HowItWorksSection() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  // Auto-advance pipeline
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const activeStep = PIPELINE_STEPS[activeStepIndex];
  const StepIcon = activeStep.icon;

  return (
    <section id="how-it-works" className="w-full max-w-5xl mx-auto mt-16 sm:mt-24 relative z-10 scroll-mt-20">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto px-4 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-mono font-medium mb-3 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <ShinyText text="AUTONOMOUS RECONSTRUCTION PIPELINE" speed={4} className="text-xs uppercase tracking-wider" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3 leading-tight">
          How WebHarvest Reconstructs the Web
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          From dynamic client-side hydration to offline link localization, follow the deterministic 3-phase lifecycle.
        </p>
      </div>

      {/* Interactive Step Timeline Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4 mb-6">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === activeStepIndex;
          return (
            <button
              key={step.step}
              type="button"
              onClick={() => {
                setActiveStepIndex(idx);
                setIsAutoPlaying(false);
              }}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'border-foreground/40 bg-card shadow-md scale-[1.01]'
                  : 'border-border/80 bg-card/60 hover:bg-card hover:border-foreground/20'
              }`}
            >
              {/* Active Step Top Accent Indicator */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-sky-400 via-indigo-400 to-emerald-400" />
              )}

              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                  isActive ? 'bg-foreground text-background border-foreground' : 'bg-muted text-muted-foreground border-border'
                }`}>
                  PHASE {step.step}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                  isActive ? 'bg-muted border-foreground/30 text-foreground' : 'bg-muted/40 border-border text-muted-foreground'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <h3 className={`text-xs sm:text-sm font-semibold mb-1 ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                {step.title}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                {step.shortDesc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Expanded Interactive Phase Deep-Dive Console */}
      <SpotlightCard
        spotlightColor="rgba(59, 130, 246, 0.12)"
        className="p-4 sm:p-7 rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-xl transition-all"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-border bg-muted flex items-center justify-center text-foreground">
              <StepIcon className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {activeStep.tag}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                <DecryptedText text={activeStep.title} speed={25} maxIterations={8} animateOn="hover" />
              </h3>
            </div>
          </div>

          {/* Auto-Play Toggle & Status */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border border-border bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isAutoPlaying ? <Pause className="w-3 h-3 text-sky-400" /> : <Play className="w-3 h-3" />}
              <span>{isAutoPlaying ? 'Auto-Advancing' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* Phase Details & Metrics */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
          {activeStep.longDesc}
        </p>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {activeStep.metrics.map((m, i) => (
            <div key={i} className="p-3 rounded-xl border border-border/80 bg-background/60 font-mono text-center">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">{m.label}</div>
              <div className="text-xs sm:text-sm font-bold text-foreground">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Real-time Subsystem Operation Checklist */}
        <div className="rounded-xl border border-border/80 bg-background/80 p-3 sm:p-4 font-mono text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center justify-between">
            <span>Subsystem Operations & Execution State</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>All Checks Verified</span>
            </span>
          </div>

          <div className="space-y-2">
            {activeStep.visualItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-card/60 border border-border/50 gap-1 sm:gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="font-semibold text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground pl-3 sm:pl-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                    {item.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}
