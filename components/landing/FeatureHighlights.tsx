'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Shield,
  FileCode,
  Archive,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  FolderTree,
  File,
  Folder,
  Layers,
  Code2,
  AlertTriangle,
} from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { DecryptedText } from '@/components/reactbits/DecryptedText';

export function FeatureHighlights() {
  // Tile 1 state: Engine selection
  const [selectedEngine, setSelectedEngine] = useState<'http' | 'browser'>('browser');

  // Tile 2 state: Rewriter toggle
  const [rewriterMode, setRewriterMode] = useState<'before' | 'after'>('after');

  // Tile 3 state: Action shield simulated trigger
  const [shieldTriggered, setShieldTriggered] = useState<boolean>(false);

  // Tile 4 state: Active file in tree
  const [activeFile, setActiveFile] = useState<string>('index.html');

  const fileContents: Record<string, { desc: string; sample: string }> = {
    'index.html': {
      desc: 'Root entry point with all navigation links rewritten to relative subdirectories.',
      sample: '<!DOCTYPE html><html><head><link rel="./assets/app.css" rel="stylesheet"></head><body><a href="./docs/getting-started.html">Docs</a></body></html>',
    },
    'app.css': {
      desc: 'All @import rules and background url() localized to downloaded font and SVG assets.',
      sample: '@font-face { font-family: "Inter"; src: url("./fonts/inter.woff2") format("woff2"); }\n.hero { background-image: url("./images/bg-grid.svg"); }',
    },
    'bundle.js': {
      desc: 'Client-side scripts safely preserved with analytics beacon endpoints decoupled.',
      sample: '/* WebHarvest Preserved Runtime */\nwindow.__INITIAL_DATA__ = { status: "offline-ready", pages: 142 };\nconsole.log("Air-gapped bundle initialized.");',
    },
    'manifest.json': {
      desc: 'Cryptographic SHA-256 file manifest, crawl timestamp, and link topology graph.',
      sample: '{\n  "version": "3.0",\n  "crawledAt": "2026-10-02T13:40:00Z",\n  "pagesCaptured": 142,\n  "assetsCaptured": 318,\n  "integrity": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"\n}',
    },
  };

  return (
    <section className="w-full max-w-5xl mx-auto mt-14 sm:mt-20 mb-14 sm:mb-20">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto px-4 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-card/80 text-muted-foreground text-xs font-mono font-medium mb-3 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <ShinyText text="ASYMMETRIC CAPABILITIES MATRIX" speed={4} className="text-xs uppercase tracking-wider" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-2 leading-tight">
          Engineered to Break Crawling Limits
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Explore the autonomous engines, security heuristics, and deterministic link localizers powering WebHarvest.
        </p>
      </div>

      {/* Asymmetrical Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* BENTO CARD 1 (Span 2 cols on md/lg): Dual Engine Auto-Dispatcher */}
        <SpotlightCard
          spotlightColor="rgba(59, 130, 246, 0.14)"
          className="md:col-span-2 p-4 sm:p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-md flex flex-col justify-between hover:border-foreground/30 transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center text-sky-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                    <span>Intelligent Dual Engine</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Auto-Dispatched
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Zero-configuration switching between high-speed streams and Chromium hydration.
                  </p>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setSelectedEngine('http')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer ${
                    selectedEngine === 'http'
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Raw Stream
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEngine('browser')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer ${
                    selectedEngine === 'browser'
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Headless Chromium
                </button>
              </div>
            </div>

            {/* Interactive Engine Deep Dive View */}
            {selectedEngine === 'http' ? (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 sm:p-4 mb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    High-Concurrency Streaming HTTP Parser
                  </span>
                  <span className="font-mono text-[11px]">180–300 pages/sec</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Optimized for multi-thousand page technical documentation, wikis, and static blogs. Uses low-footprint streaming chunk parsers with deterministic link graph deduplication.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    <div className="text-muted-foreground text-[10px]">RAM Usage</div>
                    <div className="font-bold text-foreground mt-0.5">&lt; 45 MB</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    <div className="text-muted-foreground text-[10px]">Latency</div>
                    <div className="font-bold text-emerald-400 mt-0.5">8ms / page</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    <div className="text-muted-foreground text-[10px]">HTML AST</div>
                    <div className="font-bold text-foreground mt-0.5">Cheerio v1.2</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5 sm:p-4 mb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-violet-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Playwright Headless Chromium Engine
                  </span>
                  <span className="font-mono text-[11px]">Full Client-Side Hydration</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Automatically activates when single-page frameworks (React, Vue, Next.js, Svelte) are detected. Waits for network idle, executes shadow DOM keyframes, and mirrors client state.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    <div className="text-muted-foreground text-[10px]">JS Runtime</div>
                    <div className="font-bold text-foreground mt-0.5">Chromium V8</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    <div className="text-muted-foreground text-[10px]">DOM Hydration</div>
                    <div className="font-bold text-violet-400 mt-0.5">100% Complete</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    <div className="text-muted-foreground text-[10px]">Shadow DOM</div>
                    <div className="font-bold text-foreground mt-0.5">Preserved</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Heuristic dispatch: Auto-detects `data-reactroot` and router chunks</span>
            <span className="text-foreground font-semibold">Zero configuration</span>
          </div>
        </SpotlightCard>

        {/* BENTO CARD 2 (1 col): Deterministic Asset Rewriter */}
        <SpotlightCard
          spotlightColor="rgba(16, 185, 129, 0.14)"
          className="p-4 sm:p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-md flex flex-col justify-between hover:border-foreground/30 transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center text-emerald-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Offline Rewriter</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">AST Deterministic</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setRewriterMode(rewriterMode === 'before' ? 'after' : 'before')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {rewriterMode === 'after' ? 'Show Live CDN' : 'Show Localized'}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Rewrites absolute URLs, CSS `url()`, `@import`, fonts, and inline scripts to relative paths for air-gapped fidelity.
            </p>

            <div className="rounded-xl border border-border/80 bg-background/80 p-2.5 font-mono text-[10px] space-y-1.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                {rewriterMode === 'after' ? '✓ Localized Output:' : '✗ Live External Web:'}
              </div>
              {rewriterMode === 'after' ? (
                <div className="text-emerald-400 space-y-1">
                  <div>href=&quot;./assets/inter.woff2&quot;</div>
                  <div>src=&quot;./assets/vendor.min.js&quot;</div>
                  <div>url(&quot;./assets/hero.svg&quot;)</div>
                </div>
              ) : (
                <div className="text-destructive/80 space-y-1">
                  <div>href=&quot;https://fonts.googleapis.com/...&quot;</div>
                  <div>src=&quot;https://cdn.jsdelivr.net/...&quot;</div>
                  <div>url(&quot;https://static.cdn.com/hero.svg&quot;)</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-border/60 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0 broken links guaranteed</span>
          </div>
        </SpotlightCard>

        {/* BENTO CARD 3 (1 col): Action Shield Heuristics */}
        <SpotlightCard
          spotlightColor="rgba(245, 158, 11, 0.14)"
          className="p-4 sm:p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-md flex flex-col justify-between hover:border-foreground/30 transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
              <div className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center text-amber-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Action Shield</h3>
                <p className="text-[10px] text-muted-foreground font-mono">Mutation Interceptor</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Safeguards active authenticated sessions by identifying and intercepting destructive buttons like logout, delete, and unsubscribe.
            </p>

            {/* Interactive Mutation Click Simulator */}
            <div className="p-3 rounded-xl border border-border/80 bg-background/80 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                <span>Test Mutation Defense:</span>
                <span className="text-amber-400">Active</span>
              </div>
              <button
                type="button"
                onClick={() => setShieldTriggered(true)}
                className="w-full py-1.5 px-2 rounded-lg bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Simulate &apos;Sign Out&apos; Click</span>
              </button>

              {shieldTriggered && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 animate-in fade-in duration-200">
                  🛡️ [SHIELD INTERCEPTED]: Form submission neutralized. Session preserved.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Read-Only Safety</span>
            <span className="text-amber-400 font-semibold">GET Only Mode</span>
          </div>
        </SpotlightCard>

        {/* BENTO CARD 4 (Span 2 cols on md/lg): Standalone Offline ZIP & Explorer */}
        <SpotlightCard
          spotlightColor="rgba(168, 85, 247, 0.14)"
          className="md:col-span-2 p-4 sm:p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-md flex flex-col justify-between hover:border-foreground/30 transition-all duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center text-violet-400">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                    <span>Portable Standalone ZIP & File Hierarchy</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      Zero Dependencies
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Click any file in the generated tree to inspect air-gapped payloads.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive File Tree Explorer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-background/80 p-2 font-mono text-[11px] space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase px-1 mb-1">
                  Bundle Structure
                </div>
                {['index.html', 'app.css', 'bundle.js', 'manifest.json'].map((fileName) => (
                  <button
                    key={fileName}
                    type="button"
                    onClick={() => setActiveFile(fileName)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeFile === fileName
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <File className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileName}</span>
                  </button>
                ))}
              </div>

              <div className="sm:col-span-2 rounded-xl border border-border bg-background/80 p-3 font-mono text-[11px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5 pb-1 border-b border-border/40">
                    <span className="text-foreground font-semibold">{activeFile}</span>
                    <span className="text-emerald-400">Ready for offline open</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {fileContents[activeFile]?.desc}
                  </p>
                  <pre className="text-[10px] text-foreground/90 bg-muted/40 p-2 rounded-lg leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[90px]">
                    {fileContents[activeFile]?.sample}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-border/60 text-[11px] font-mono text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>Air-gapped compatibility: double-click index.html in any browser without webserver</span>
            <span className="text-violet-400 font-medium">Deterministic SHA-256</span>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
