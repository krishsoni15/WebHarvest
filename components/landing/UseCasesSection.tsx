'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Palette,
  ShieldCheck,
  Database,
  ArrowRight,
  Layers,
  Cpu,
  XCircle,
  FileCode,
  Lock,
  Globe,
  Archive,
  Zap,
} from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

export function UseCasesSection() {
  const [activeTab, setActiveTab] = useState<'comparison' | 'scenarios'>('comparison');
  const [selectedScenario, setSelectedScenario] = useState<string>('docs');

  const TRADITIONAL_LIMITATIONS = [
    {
      title: 'Blank Screens on Modern SPAs',
      desc: 'Legacy tools like Wget and HTTrack fetch raw initial HTML without executing JavaScript. React, Vue, and Next.js applications render as completely empty blank screens.',
      impact: '0% DOM hydration for client-side apps',
    },
    {
      title: 'Broken Dynamic Next.js Chunks',
      desc: 'Modern frameworks load code-split hashed JavaScript and CSS chunks asynchronously. Traditional tools fail to discover or map these paths, breaking layouts and interactive widgets.',
      impact: 'Missing stylesheets and fatal chunk errors',
    },
    {
      title: 'Blocked at Login & Auth Walls',
      desc: 'Standard scrapers have zero authentication awareness. They hit login forms, get redirected, or fail to persist necessary authentication session tokens and cookies.',
      impact: 'Unable to capture internal app dashboards',
    },
    {
      title: 'External CDN & Font Fragility',
      desc: 'Assets stored on external domains (Google Fonts, unpkg, cdnjs, Cloudflare) remain hardcoded to remote URLs. Opening files offline fails because the browser tries to reach the internet.',
      impact: 'Broken typography and missing vector icons',
    },
    {
      title: 'Requires Complex Local Web Servers',
      desc: 'Static HTML files with root-relative paths (/assets/app.js) fail when opened via file:// protocol. Users must configure local Nginx or Apache servers just to inspect a download.',
      impact: 'High friction; unusable for non-technical users',
    },
  ];

  const WEBHARVEST_CAPABILITIES = [
    {
      title: 'Dual-Engine DOM Hydration',
      desc: 'Automated Playwright Chromium boots headless browsers, executes client-side hydration until 100% network idle is reached, and captures the fully rendered live DOM tree.',
      solution: 'Full fidelity for React, Vue, Next.js, and Vite',
    },
    {
      title: 'Reverse Asset Middleware & SPA Fallback',
      desc: 'Custom referer-based middleware catches requests for /_next/static and /assets in preview iframes. Multi-tier resolution falls back to index.html for client-side routes.',
      solution: 'Zero 404s on dynamic navigation routes',
    },
    {
      title: 'Offline Auth & Demo Form Interceptor',
      desc: 'Detects demo credentials, injects localStorage tokens and session cookies, and intercepts login forms to seamlessly unlock and preview internal SaaS admin dashboards.',
      solution: 'Captures authenticated views & admin consoles',
    },
    {
      title: 'AST CDN & Font Localizer',
      desc: 'Recursively downloads Google Fonts, external vendor scripts, and CSS background images, rewriting all declarations into clean relative paths in ./assets/.',
      solution: '100% air-gapped; zero external network egress',
    },
    {
      title: 'Zero-Dependency Standalone Bundles',
      desc: 'Every export packages native Node.js (server.js) and Python (serve.py) multi-threaded servers with start.sh/start.bat. Double-click to launch on Mac, Windows, or Linux.',
      solution: 'Instant 1-click launch with zero npm install',
    },
  ];

  const SCENARIOS = [
    {
      id: 'docs',
      title: 'Air-Gapped Developer Portals',
      subtitle: 'Technical Documentation & API References',
      icon: BookOpen,
      badge: 'Engineering Teams',
      summary: 'Mirror complex developer documentation libraries (Stripe, Tailwind, React.dev, Docusaurus, Mintlify) for offline engineering, flight travel, or air-gapped defense networks.',
      problem: 'Online documentation frequently updates, changes APIs, or is unavailable in secure offline enterprise intranets.',
      solution: 'WebHarvest extracts complete sitemaps, localized code syntax blocks, and interactive search indices into a portable offline archive.',
      metrics: ['140+ Pages in < 4s', '0 Broken Links', '100% Standalone'],
    },
    {
      id: 'design',
      title: 'Pixel-Fidelity Design Archival',
      subtitle: 'SaaS UI/UX Systems & Micro-Interactions',
      icon: Palette,
      badge: 'Product & Design',
      summary: 'Snapshot intricate SaaS landing pages, animated dashboards, CSS keyframe micro-interactions, and component libraries with complete visual accuracy.',
      problem: 'Web design trends and SaaS layouts disappear when sites redesign, leaving design teams without interactive reference archives.',
      solution: 'Captures CSS variables, SVGs, dark/light theme classes, and layout structures for permanent offline design inspiration and audit.',
      metrics: ['Pixel-Perfect Rendering', 'CSS Tokens Preserved', 'Multi-Chassis Preview'],
    },
    {
      id: 'compliance',
      title: 'Legal, Compliance & Pricing Audits',
      subtitle: 'Immutable Point-in-Time Evidence',
      icon: ShieldCheck,
      badge: 'Legal & Risk Ops',
      summary: 'Create verifiable, timestamped records of Terms of Service, privacy policies, SaaS subscription pricing tables, or regulatory disclosures.',
      problem: 'Screenshots can be faked and print-to-PDF breaks dynamic accordions and responsive disclosures.',
      solution: 'Generates a full functional offline mirror with SHA-256 asset manifests and HTTP response headers for courtroom-grade compliance verification.',
      metrics: ['Cryptographic Manifests', 'HTTP Status Audits', 'Immutable Timestamp'],
    },
    {
      id: 'ai',
      title: 'Offline AI & RAG Knowledge Ingestion',
      subtitle: 'Private Vector Embeddings & LLM Grounding',
      icon: Database,
      badge: 'AI & Data Science',
      summary: 'Extract structured, clean website trees for local LLM vector embeddings, LangChain document loaders, Ollama agents, and private enterprise search.',
      problem: 'Direct web crawling during AI pipeline execution is slow, rate-limited, and vulnerable to anti-bot Cloudflare blocks.',
      solution: 'Harvests entire technical portals once, sanitizing HTML into structured DOMs ready for LangChain, LlamaIndex, or vector databases.',
      metrics: ['Clean DOM Tree', 'Structured JSON Catalog', 'Zero Rate Limits'],
    },
  ];

  const currentScenario = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];
  const ScenarioIcon = currentScenario.icon;

  return (
    <section id="use-cases" className="w-full max-w-5xl mx-auto mt-16 sm:mt-24 mb-16 sm:mb-20 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-[11px] font-mono text-muted-foreground mb-3 tracking-wider uppercase">
          <Layers className="w-3.5 h-3.5 text-foreground" />
          <span>Capabilities & Workloads</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
          What Traditional Tools Lack vs What WebHarvest Solves
        </h2>
        <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mt-2.5 leading-relaxed font-sans">
          Why traditional web scrapers break on modern Single-Page Applications, and how WebHarvest delivers 100% offline fidelity for mission-critical engineering workloads.
        </p>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/80 mt-5">
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            The Problem vs Solution
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scenarios')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'scenarios'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Real-World Use Cases
          </button>
        </div>
      </div>

      {/* Tab 1: Direct Problem vs Solution Comparison */}
      {activeTab === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: What Traditional Tools Lack */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md flex flex-col justify-between card-hover-effect">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground">
                    <XCircle className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground font-display">What Legacy Scrapers Lack</h3>
                    <span className="text-[10px] font-mono text-muted-foreground">Wget, HTTrack, Simple Curl</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground uppercase font-medium">
                  Limitations
                </span>
              </div>

              <div className="space-y-3.5">
                {TRADITIONAL_LIMITATIONS.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border/50 bg-muted/10 space-y-1.5 transition-all duration-200 hover:border-border hover:bg-muted/20 group">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground font-display">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 group-hover:bg-zinc-400 transition-colors" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-3.5 font-sans">
                      {item.desc}
                    </p>
                    <div className="pl-3.5 pt-0.5 text-[10px] font-mono text-zinc-400 font-medium">
                      &bull; {item.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
              <span>Failure Rate on SPAs:</span>
              <span className="text-foreground font-semibold">High (Blank 404 Pages)</span>
            </div>
          </div>

          {/* Right Column: What WebHarvest Can Do */}
          <div className="p-5 sm:p-6 rounded-2xl border border-foreground/30 bg-card/90 backdrop-blur-md flex flex-col justify-between ring-1 ring-foreground/10 shadow-lg card-hover-effect">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg border border-foreground/40 bg-foreground text-background flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground font-display">What WebHarvest Solves</h3>
                    <span className="text-[10px] font-mono text-muted-foreground">Intelligent V3 Dual-Engine Studio</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-foreground/30 bg-foreground/10 text-foreground font-semibold uppercase">
                  100% Fidelity
                </span>
              </div>

              <div className="space-y-3.5">
                {WEBHARVEST_CAPABILITIES.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1.5 transition-all duration-200 hover:border-foreground/40 hover:bg-muted/30 group">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground font-display">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0 group-hover:scale-125 transition-transform" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-3.5 font-sans">
                      {item.desc}
                    </p>
                    <div className="pl-3.5 pt-0.5 text-[10px] font-mono text-foreground font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />
                      <span>{item.solution}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
              <span>Offline Standalone Guarantee:</span>
              <span className="text-foreground font-semibold">Zero Dependencies Needed</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Specific Real-World Scenarios */}
      {activeTab === 'scenarios' && (
        <div className="space-y-5">
          {/* Scenario Selector Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SCENARIOS.map((sc) => {
              const Icon = sc.icon;
              const isSelected = selectedScenario === sc.id;

              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer flex flex-col justify-between card-hover-effect group ${
                    isSelected
                      ? 'border-foreground bg-muted/80 text-foreground ring-1 ring-foreground/30 shadow-xs'
                      : 'border-border/70 bg-card/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                      isSelected ? 'border-foreground/40 bg-foreground text-background' : 'border-border bg-muted text-muted-foreground group-hover:border-foreground/30 group-hover:text-foreground'
                    }`}>
                      <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">{sc.badge}</span>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate font-display">{sc.title}</h4>
                    <span className="text-[10px] text-muted-foreground truncate block font-sans mt-0.5">{sc.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Scenario Card */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.06)"
            className="p-5 sm:p-7 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl border border-border bg-muted flex items-center justify-center text-foreground shrink-0">
                  <ScenarioIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-foreground text-background">
                      {currentScenario.badge}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {currentScenario.subtitle}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">
                    {currentScenario.title}
                  </h3>
                </div>
              </div>

              {/* Metrics Pill */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentScenario.metrics.map((m, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-[10px] font-mono border border-border/80 bg-muted/40 text-foreground font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed">
              {currentScenario.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Problem */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>The Pain Point With Regular Tools</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentScenario.problem}
                </p>
              </div>

              {/* Solution */}
              <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-foreground font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                  <span>How WebHarvest Solves It</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {currentScenario.solution}
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>
      )}
    </section>
  );
}
