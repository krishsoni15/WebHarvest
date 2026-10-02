'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Shield,
  Layers,
  FileCode,
  Globe,
  Terminal,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Network,
  Cpu,
  Database,
  Archive,
} from 'lucide-react';
import { CountUp } from '@/components/reactbits/CountUp';
import { ShinyText } from '@/components/reactbits/ShinyText';

interface SimulationScenario {
  id: string;
  name: string;
  url: string;
  pages: number;
  assets: number;
  size: string;
  time: string;
  navItems: string[];
  logs: {
    time: string;
    level: 'info' | 'warn' | 'success' | 'browser';
    message: string;
  }[];
  diffBefore: string;
  diffAfter: string;
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: 'stripe',
    name: 'Stripe Docs',
    url: 'https://docs.stripe.com/api',
    pages: 142,
    assets: 318,
    size: '18.4 MB',
    time: '3.4s',
    navItems: ['Quickstart Guide', 'Authentication', 'Payment Intents API', 'Webhooks & Events'],
    logs: [
      { time: '0.02s', level: 'info', message: 'Resolving sitemap https://docs.stripe.com/sitemap.xml (142 URLs discovered)' },
      { time: '0.18s', level: 'browser', message: '⚡ Client hydration detected (Next.js 14) -> Booted Headless Chromium' },
      { time: '0.45s', level: 'info', message: 'Streaming 142 DOM trees: 100% network idle reached' },
      { time: '0.82s', level: 'warn', message: '🛡️ Action Shield: Blocked mutating endpoint POST /v1/account/logout' },
      { time: '1.20s', level: 'success', message: 'Rewrote 318 CDN URLs -> Localized into ./assets/ (Google Fonts + JS vendors)' },
      { time: '1.85s', level: 'success', message: 'Export verified: 0 broken internal links, 100% air-gapped standalone ZIP ready' },
    ],
    diffBefore: `<!-- LIVE EXTERNAL WEB (Requires Internet) -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600">
<script src="https://cdn.jsdelivr.net/npm/@stripe/stripe-js@2.4.0/dist/stripe.min.js"></script>
<img src="https://b.stripecdn.com/docs-statics-srv/assets/api-diagram.png" />
<a href="https://docs.stripe.com/payments/checkout">Checkout Guide</a>`,
    diffAfter: `<!-- WEBHARVEST OFFLINE MIRROR (100% Air-Gapped) -->
<link rel="stylesheet" href="./assets/fonts/inter_400_600.woff2">
<script src="./assets/vendor/stripe.min.js"></script>
<img src="./assets/images/api-diagram.png" />
<a href="./payments/checkout.html">Checkout Guide</a>`,
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com/docs',
    pages: 94,
    assets: 215,
    size: '12.1 MB',
    time: '2.1s',
    navItems: ['Installation with Vite', 'Utility Classes & Syntax', 'Responsive Breakpoints', 'Custom Theme Variables'],
    logs: [
      { time: '0.01s', level: 'info', message: 'Connecting to https://tailwindcss.com/docs (Fast Streaming Engine)' },
      { time: '0.22s', level: 'info', message: 'Discovered documentation tree: 94 navigation routes parsed' },
      { time: '0.64s', level: 'browser', message: 'Prerendering code syntax blocks & interactive color pickers' },
      { time: '1.10s', level: 'success', message: 'Downloaded 215 stylesheets, WebFonts, & SVG symbols into /assets' },
      { time: '1.45s', level: 'success', message: 'Localized all @import and url() paths in core CSS bundles' },
      { time: '1.90s', level: 'success', message: 'Crawl completed successfully: 0 external requests remaining' },
    ],
    diffBefore: `<!-- LIVE CSS ASSETS -->
@import url("https://fonts.bunny.net/css?family=fira-code:400,500");
background-image: url("https://tailwindcss.com/_next/static/media/hero.svg");
<link rel="preload" href="https://cdn.jsdelivr.net/algoliasearch/lite.js">`,
    diffAfter: `<!-- RECONSTRUCTED LOCAL ASSETS -->
@import url("./assets/fonts/fira-code.woff2");
background-image: url("./assets/media/hero.svg");
<link rel="preload" href="./assets/vendor/lite.js">`,
  },
  {
    id: 'react',
    name: 'React.dev',
    url: 'https://react.dev/learn',
    pages: 78,
    assets: 184,
    size: '15.6 MB',
    time: '2.8s',
    navItems: ['Quick Start Guide', 'Tutorial: Tic-Tac-Toe', 'Managing Component State', 'Built-in React Hooks'],
    logs: [
      { time: '0.03s', level: 'info', message: 'Initializing crawl on https://react.dev (Interactive SPA Architecture)' },
      { time: '0.35s', level: 'browser', message: '⚡ Next.js App Router detected -> Launching Chromium execution engine' },
      { time: '0.88s', level: 'info', message: 'Executed dynamic sandboxes & interactive code runner components' },
      { time: '1.30s', level: 'warn', message: '🛡️ Action Shield: Safely disabled external tracking & analytics telemetries' },
      { time: '1.75s', level: 'success', message: 'Localized 184 client JS chunks, Sandpack engines, & CSS variables' },
      { time: '2.40s', level: 'success', message: 'Self-contained offline bundle packaged: manifest.json generated' },
    ],
    diffBefore: `<!-- REACT.DEV LIVE CLIENT SCRIPTS -->
<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>
<link rel="stylesheet" href="https://cdn.sandpack.codesandbox.io/static/css/sandpack.css">
<script src="https://esm.sh/react@18.2.0"></script>`,
    diffAfter: `<!-- REACT.DEV OFFLINE LOCALIZED ASSETS -->
<!-- [WebHarvest] Analytics telemetry safely isolated -->
<link rel="stylesheet" href="./assets/vendor/sandpack.css">
<script src="./assets/vendor/react-18.2.0.js"></script>`,
  },
];

interface HeroSimulatorProps {
  onSelectUrl?: (url: string) => void;
}

export function HeroSimulator({ onSelectUrl }: HeroSimulatorProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('stripe');
  const [activeTab, setActiveTab] = useState<'terminal' | 'diff' | 'preview' | 'architecture'>('terminal');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(100);
  const [visibleLogCount, setVisibleLogCount] = useState<number>(6);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  const currentScenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback simulation loop
  useEffect(() => {
    if (!isPlaying) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    if (progress >= 100) {
      // Loop with pause
      const restartTimeout = setTimeout(() => {
        setProgress(0);
        setVisibleLogCount(1);
      }, 4000);
      return () => clearTimeout(restartTimeout);
    }

    const intervalTime = 120 / speedMultiplier;
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2.5;
        if (next >= 100) {
          setVisibleLogCount(currentScenario.logs.length);
          return 100;
        }
        // Calculate visible logs based on progress percentage
        const count = Math.min(
          currentScenario.logs.length,
          Math.max(1, Math.floor((next / 100) * currentScenario.logs.length) + 1)
        );
        setVisibleLogCount(count);
        return next;
      });
    }, intervalTime);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, progress, speedMultiplier, currentScenario]);

  const handleReset = () => {
    setProgress(0);
    setVisibleLogCount(1);
    setIsPlaying(true);
  };

  const handleSelectScenario = (id: string) => {
    setActiveScenarioId(id);
    setProgress(0);
    setVisibleLogCount(1);
    setIsPlaying(true);
  };

  return (
    <div id="simulator" className="w-full max-w-4xl mx-auto mt-8 sm:mt-12 scroll-mt-20">
      {/* Metrics Row above simulator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="px-3 py-2 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider mb-1">
            <span>Throughput</span>
            <Zap className="w-3 h-3 text-foreground" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold font-mono text-foreground">
              <CountUp to={185} duration={1.5} />
            </span>
            <span className="text-[11px] text-muted-foreground">pages/s</span>
          </div>
        </div>

        <div className="px-3 py-2 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider mb-1">
            <span>DOM Fidelity</span>
            <Sparkles className="w-3 h-3 text-foreground" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold font-mono text-foreground">
              <CountUp to={99.8} decimals={1} duration={1.5} />
            </span>
            <span className="text-[11px] text-muted-foreground">%</span>
          </div>
        </div>

        <div className="px-3 py-2 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider mb-1">
            <span>Action Shield</span>
            <Shield className="w-3 h-3 text-foreground" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold font-mono text-foreground">0</span>
            <span className="text-[11px] text-muted-foreground">mutations</span>
          </div>
        </div>

        <div className="px-3 py-2 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono uppercase tracking-wider mb-1">
            <span>Air-Gapped</span>
            <Layers className="w-3 h-3 text-foreground" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold font-mono text-foreground">100</span>
            <span className="text-[11px] text-muted-foreground">% offline</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Browser Simulator Frame */}
      <div className="rounded-2xl border border-border bg-card/90 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-foreground/30">
        {/* Simulator Titlebar */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-2">
          {/* Traffic Lights + Scenario Chips */}
          <div className="flex items-center gap-2 sm:gap-3 max-w-full">
            <div className="flex items-center gap-1.5 pointer-events-none shrink-0">
              <div className="w-3 h-3 rounded-full bg-zinc-600 border border-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-500 border border-zinc-600" />
              <div className="w-3 h-3 rounded-full bg-zinc-400 border border-zinc-500" />
            </div>

            {/* Target Scenarios (Scrollable on small mobile) */}
            <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded-lg border border-border/60 overflow-x-auto max-w-[210px] xs:max-w-none">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => handleSelectScenario(scenario.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer shrink-0 ${
                    activeScenarioId === scenario.id
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Omnibox URL */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-auto hidden lg:flex items-center justify-center">
            <div className="w-full flex items-center justify-between px-3 py-1 rounded-md bg-background/80 border border-border text-[11px] font-mono text-muted-foreground gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <Globe className="w-3 h-3 text-foreground shrink-0" />
                <span className="truncate">{currentScenario.url}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onSelectUrl && (
                  <button
                    type="button"
                    onClick={() => onSelectUrl(currentScenario.url)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer font-semibold inline-flex items-center gap-0.5"
                    title="Load this URL into WebHarvest capture input"
                  >
                    <span>Try URL</span>
                    <span>&uarr;</span>
                  </button>
                )}
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-muted text-foreground border border-border uppercase font-medium">
                  Air-Gapped
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-background/70 p-0.5 rounded-lg border border-border/80 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="w-3 h-3 shrink-0" />
              <span>Trace</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode className="w-3 h-3 shrink-0" />
              <span>Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span>Sandbox</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Network className="w-3 h-3 shrink-0" />
              <span>Arch</span>
            </button>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="w-full h-1 bg-muted/60 relative overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Tab 1: Live Trace Terminal */}
        {activeTab === 'terminal' && (
          <div className="p-3.5 sm:p-5 font-mono text-[11px] sm:text-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                <span className="text-[11px] font-medium text-foreground">
                  RECONSTRUCTION LOG STREAM
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({currentScenario.pages} pages • {currentScenario.assets} assets)
                </span>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1))}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                  title="Toggle Simulation Speed"
                >
                  {speedMultiplier}x
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Reset Simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Log lines */}
            <div className="space-y-1.5 min-h-[170px] sm:min-h-[185px]">
              {currentScenario.logs.slice(0, visibleLogCount).map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 py-0.5 animate-in fade-in slide-in-from-left-1 duration-200"
                >
                  <span className="text-muted-foreground shrink-0 select-none">
                    [{log.time}]
                  </span>
                  {log.level === 'browser' && (
                    <span className="text-foreground font-semibold shrink-0">
                      [BROWSER]
                    </span>
                  )}
                  {log.level === 'info' && (
                    <span className="text-muted-foreground font-semibold shrink-0">
                      [DISCOVERY]
                    </span>
                  )}
                  {log.level === 'warn' && (
                    <span className="text-foreground font-semibold shrink-0">
                      [SHIELD]
                    </span>
                  )}
                  {log.level === 'success' && (
                    <span className="text-foreground font-semibold shrink-0">
                      [LOCALIZED]
                    </span>
                  )}
                  <span className="text-foreground/90 break-words leading-relaxed">
                    {log.message}
                  </span>
                </div>
              ))}
              {visibleLogCount < currentScenario.logs.length && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse py-1">
                  <span className="w-1.5 h-3 bg-foreground inline-block" />
                  <span className="text-[11px]">Processing DOM AST and vendors...</span>
                </div>
              )}
            </div>

            {/* Bottom Status bar */}
            <div className="mt-4 pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentScenario.pages} Pages Prerendered</span>
                </span>
                <span>•</span>
                <span>Payload: {currentScenario.size}</span>
                <span>•</span>
                <span>Completed in: {currentScenario.time}</span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
                Zero Cloud Egress Needed
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Asset Rewriter Code Diff */}
        {activeTab === 'diff' && (
          <div className="p-3.5 sm:p-5 font-mono text-[11px] sm:text-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-foreground" />
                <span className="text-[11px] font-medium text-foreground">
                  DETERMINISTIC LINK & ASSET REWRITER
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground border border-border font-medium">
                100% CDNs Localized
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Before Code Block */}
              <div className="rounded-xl border border-border bg-card/60 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-muted-foreground text-[10px] font-semibold mb-2 uppercase tracking-wider">
                    <span>Original Source (Live Web)</span>
                    <span className="text-muted-foreground font-mono">External CDNs</span>
                  </div>
                  <pre className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                    {currentScenario.diffBefore}
                  </pre>
                </div>
                <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  <span>Requires persistent internet connection & live DNS</span>
                </div>
              </div>

              {/* After Code Block */}
              <div className="rounded-xl border border-foreground/30 bg-muted/40 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-foreground text-[10px] font-semibold mb-2 uppercase tracking-wider">
                    <span>Reconstructed Offline Bundle</span>
                    <span className="text-foreground font-mono font-bold">100% Local Files</span>
                  </div>
                  <pre className="text-[11px] leading-relaxed text-foreground whitespace-pre-wrap font-mono overflow-x-auto font-medium">
                    {currentScenario.diffAfter}
                  </pre>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-foreground" />
                  <span>Works completely offline from local filesystem or USB drive</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Interactive Sandbox View */}
        {activeTab === 'preview' && (
          <div className="p-3.5 sm:p-5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-foreground" />
                <span className="text-[11px] font-medium text-foreground">
                  LOCAL SANDBOX BROWSER ENVIRONMENT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono border border-border bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Simulate {previewTheme === 'dark' ? 'Light' : 'Dark'} Mode
                </button>
              </div>
            </div>

            {/* Mock Local Application Shell */}
            <div
              className={`rounded-xl border border-border p-3 sm:p-4 transition-colors ${
                previewTheme === 'dark'
                  ? 'bg-zinc-950 text-zinc-100'
                  : 'bg-zinc-50 text-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-foreground text-background flex items-center justify-center text-[10px] font-bold">
                    W
                  </div>
                  <span className="font-semibold text-xs tracking-tight">
                    {currentScenario.name} (Offline Mirror)
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                  FILE:// LOCAL PROTOCOL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="font-semibold text-muted-foreground text-[10px] uppercase mb-1">
                    Navigation Tree
                  </div>
                  {currentScenario.navItems.map((item, index) => (
                    <div
                      key={item}
                      className={`px-2 py-1 rounded transition-colors flex items-center justify-between ${
                        index === 0
                          ? 'bg-muted/80 text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {index === 0 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />}
                    </div>
                  ))}
                </div>

                <div className="sm:col-span-2 space-y-2 text-xs">
                  <h4 className="font-bold text-sm text-foreground">
                    Offline Documentation Bundle
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This mirrored site contains all {currentScenario.pages} documentation pages, complete with interactive CSS layouts, dark/light stylesheets, SVG diagrams, and JavaScript client runtime. No internet required.
                  </p>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 font-mono text-[10px] text-muted-foreground flex items-center justify-between">
                    <span className="truncate pr-2">Location: ./mirrors/{currentScenario.id}-docs/index.html</span>
                    <span className="text-foreground font-semibold shrink-0">Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Interactive Architecture Pipeline View */}
        {activeTab === 'architecture' && (
          <div className="p-3.5 sm:p-5 text-xs font-mono">
            <div className="flex items-center justify-between text-muted-foreground mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-foreground" />
                <span className="text-[11px] font-medium text-foreground">
                  ACTIVE RECONSTRUCTION PIPELINE: {currentScenario.name.toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-foreground border border-border">
                {currentScenario.pages} Pages &bull; {currentScenario.assets} Assets &bull; {currentScenario.time}
              </span>
            </div>

            {/* Interactive Architecture Step Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 my-3">
              {/* Step 1: Ingestion & DNS */}
              <div className="p-3 rounded-xl border border-border/70 bg-card/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">01. INGESTION</span>
                    <Shield className="w-3 h-3 text-foreground" />
                  </div>
                  <div className="text-xs font-bold text-foreground truncate">{currentScenario.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">{currentScenario.url}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[9px] text-muted-foreground">
                  SSRF Filter &bull; DNS Guard
                </div>
              </div>

              {/* Step 2: Dual Hydration Engine */}
              <div className="p-3 rounded-xl border border-border/70 bg-card/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">02. HYDRATION</span>
                    <Cpu className="w-3 h-3 text-foreground" />
                  </div>
                  <div className="text-xs font-bold text-foreground">Dual-Engine Core</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Playwright + Fast HTTP</div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[9px] text-muted-foreground">
                  Action Shield Mutate Guard
                </div>
              </div>

              {/* Step 3: AST Normalization */}
              <div className="p-3 rounded-xl border border-border/70 bg-card/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">03. AST REWRITE</span>
                    <FileCode className="w-3 h-3 text-foreground" />
                  </div>
                  <div className="text-xs font-bold text-foreground">Deterministic Links</div>
                  <div className="text-[10px] text-muted-foreground mt-1">CDNs &bull; Fonts &bull; @import</div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[9px] text-muted-foreground">
                  Localized into ./assets/
                </div>
              </div>

              {/* Step 4: Standalone Air-Gapped Bundle */}
              <div className="p-3 rounded-xl border border-foreground/30 bg-muted/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-foreground mb-1">
                    <span className="font-bold">04. STANDALONE ZIP</span>
                    <Archive className="w-3 h-3 text-foreground" />
                  </div>
                  <div className="text-xs font-bold text-foreground">{currentScenario.size} Export</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Zero npm dependencies</div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[9px] text-foreground font-medium">
                  server.js + serve.py
                </div>
              </div>
            </div>

            {/* Bottom Real-Time Telemetry Bar */}
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-foreground" />
                <span>Runtime State:</span>
                <span className="text-foreground font-semibold">100% Air-Gapped Standalone Offline Bundle</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-foreground">
                <span>Zero Cloud Egress Needed</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
