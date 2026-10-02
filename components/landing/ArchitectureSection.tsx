'use client';

import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Network,
  Database,
  Archive,
  ArrowRight,
  ArrowDown,
  Shield,
  FileCode,
  Check,
  Terminal,
  Server,
  Code2,
  Workflow,
  Sparkles,
  Lock,
  Zap,
  Globe,
  Radio,
  FileText,
  Key,
} from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

interface ArchTier {
  id: string;
  number: string;
  name: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  files: string[];
  components: {
    label: string;
    detail: string;
  }[];
  outputs: string;
}

const ARCH_TIERS: ArchTier[] = [
  {
    id: 'presentation',
    number: '01',
    name: 'Presentation & Studio Layer',
    tag: 'Next.js 15 UI',
    icon: Layers,
    description: 'Interactive capture studio with multi-device chassis, in-place sidebar tabs, and live SSE terminal.',
    files: ['app/page.tsx', 'app/mirror/[id]/page.tsx', 'components/mirror/PreviewTab.tsx'],
    components: [
      { label: '4 Viewport Chassis', detail: 'Desktop (100%), MacBook Laptop, iPad (768px), iPhone Pro (390px)' },
      { label: 'In-Place Sidebar', detail: 'Dash, Pages, Assets, and Files explorer with zero screen waste' },
      { label: 'Real-time Draggable Terminal', detail: 'Live SSE log stream with auto-scroll and ANSI colorizer' },
    ],
    outputs: 'Streams user inputs and displays live sandboxed previews',
  },
  {
    id: 'middleware',
    number: '02',
    name: 'Reverse Asset Middleware & Proxy',
    tag: 'Traffic Router',
    icon: Network,
    description: 'Dynamic referer-based interceptor routing Next.js chunks, fonts, and assets to the mirror sandbox.',
    files: ['middleware.ts', 'app/api/mirror/[id]/preview/[[...path]]/route.ts'],
    components: [
      { label: 'Referer Chunk Rewrite', detail: 'Intercepts /_next/static and /assets requests from preview iframes' },
      { label: 'Multi-Tier Path Resolver', detail: 'TargetDir -> BaseDir -> Recursive Search -> SPA Fallback (index.html)' },
      { label: 'On-Demand Asset Proxy', detail: 'Fetches and caches missing dynamic chunks live during preview' },
    ],
    outputs: 'Zero 404s on dynamic Next.js/React chunk requests',
  },
  {
    id: 'crawler',
    number: '03',
    name: 'Dual-Engine Crawling & AST Core',
    tag: 'Hydration Core',
    icon: Cpu,
    description: 'Fast streaming HTTP parser paired with automated Playwright Chromium for client-side SPAs.',
    files: ['lib/crawler/engine.ts', 'lib/processor/rewrite.ts'],
    components: [
      { label: 'SSRF & DNS Guard', detail: 'Validates target IP, blocks loopback/LAN addresses and malicious redirects' },
      { label: 'Action Shield', detail: 'Safely blocks mutating requests (POST, PUT, DELETE, /logout)' },
      { label: 'AST Link Rewriter', detail: 'Rewrites absolute CDN URLs, Google Fonts, and @import rules to relative' },
    ],
    outputs: 'Complete sanitized HTML DOM and downloaded asset directory',
  },
  {
    id: 'persistence',
    number: '04',
    name: 'Dual Persistence Storage',
    tag: 'ACID + Files',
    icon: Database,
    description: 'High-throughput SQLite database for job state and metrics, backed by filesystem asset hierarchy.',
    files: ['lib/db/index.ts', 'lib/jobs/manager.ts', 'data/webharvest.db'],
    components: [
      { label: 'SQLite WAL Mode', detail: 'Write-Ahead Logging for non-blocking concurrent reads and state updates' },
      { label: 'Atomic Directory Management', detail: 'Canonical job ID tracking preventing ghost directories and collisions' },
      { label: 'Manifest & Health Audit', detail: 'Generates report.json, crawl_logs.txt, and SHA-256 asset manifests' },
    ],
    outputs: 'Persistent job history and clean hierarchical mirror trees',
  },
  {
    id: 'bundle',
    number: '05',
    name: 'Zero-Dependency Standalone Export',
    tag: 'Air-Gapped ZIP',
    icon: Archive,
    description: 'Self-contained executable archive runnable offline on any machine using native Node.js or Python.',
    files: ['lib/exporter/zip.ts', 'app/api/download/[id]/route.ts'],
    components: [
      { label: 'server.js (Node.js)', detail: 'Zero external npm dependencies, native http/fs with SPA routing fallback' },
      { label: 'serve.py (Python 3)', detail: 'Multi-threaded offline web server with MIME header overrides' },
      { label: 'One-Click Launchers', detail: 'start.sh (Mac/Linux) & start.bat (Windows) for instant zero-config launch' },
    ],
    outputs: '100% air-gapped, portable standalone offline ZIP bundle',
  },
];

const API_ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/mirror',
    layer: 'API Gateway',
    desc: 'Normalizes URL, performs SSRF/loopback DNS check, allocates canonical job ID in SQLite and launches crawler.',
    tech: 'Next.js App Router, DNS Lookup, better-sqlite3',
  },
  {
    method: 'GET',
    path: '/api/mirror/[id]/progress',
    layer: 'Streaming Telemetry',
    desc: 'Server-Sent Events (SSE) emitting real-time log lines, pages count, assets count, download speed, and current action.',
    tech: 'ReadableStream, Server-Sent Events (SSE)',
  },
  {
    method: 'GET',
    path: '/api/mirror/[id]/preview/[[...path]]',
    layer: 'Reverse Proxy & Sandbox',
    desc: '6-tier path resolution: exact file -> targetDir -> recursive chunk search -> SPA fallback -> on-demand proxy cache.',
    tech: 'Dynamic MIME Overrides, Referer Cookies, Base Tag Injection',
  },
  {
    method: 'ROUTE',
    path: 'middleware.ts',
    layer: 'Edge Rewriter',
    desc: 'Intercepts requests for /_next/static and /assets from preview iframes, rewriting them seamlessly to avoid collisions.',
    tech: 'NextRequest Rewrite, Referer Inspection',
  },
  {
    method: 'GET',
    path: '/api/download/[id]',
    layer: 'Packaging Core',
    desc: 'Compiles localized mirror files and bundles zero-dependency server.js, serve.py, start.sh, start.bat into a portable ZIP.',
    tech: 'Archiver Stream, Node.js fs, SHA-256 Manifest',
  },
  {
    method: 'POST',
    path: '/api/mirror/[id]/auth-login',
    layer: 'Session Injection',
    desc: 'Injects demo credentials, hydrates localStorage auth tokens and session cookies for authenticated SaaS dashboards.',
    tech: 'Playwright Page Context, Cookie Jar, localStorage',
  },
  {
    method: 'GET',
    path: '/api/mirror/[id]/overview',
    layer: 'Metadata & Health',
    desc: 'Extracts dominant brand colors, detected tech stacks, total size, and crawl completion metrics.',
    tech: 'Cheerio Color Extractor, SQLite WAL',
  },
  {
    method: 'POST',
    path: '/api/mirror/[id]/cancel',
    layer: 'Process Lifecycle',
    desc: 'Gracefully aborts in-flight crawler workers, saves final progress state, and writes cancellation audit trail.',
    tech: 'AbortController, EventBus, SQLite Job Manager',
  },
];

const TECH_STACK_GRID = [
  { name: 'Next.js 15 (App Router)', role: 'Full-stack framework, streaming route handlers, and reverse asset middleware' },
  { name: 'React 19 & Tailwind CSS', role: 'Component architecture, responsive 4-viewport chassis, and monochromatic theme' },
  { name: 'Playwright Chromium', role: 'Headless browser automation for client-side JavaScript SPA DOM hydration' },
  { name: 'Cheerio & AST Parsing', role: 'High-speed HTML/CSS traversal (180+ pages/sec), @import and url() link rewriter' },
  { name: 'SQLite (WAL Mode)', role: 'Embedded zero-config database via better-sqlite3 with Write-Ahead Logging' },
  { name: 'Native Standard Libs', role: 'Zero-dependency standalone runners using Node.js http and Python 3 http.server' },
];

export function ArchitectureSection() {
  const [activeView, setActiveView] = useState<'flowchart' | 'tech' | 'tiers'>('flowchart');
  const [selectedTier, setSelectedTier] = useState<string>('middleware');

  const activeTier = ARCH_TIERS.find((t) => t.id === selectedTier) || ARCH_TIERS[1];

  return (
    <section id="architecture" className="w-full max-w-5xl mx-auto mt-16 sm:mt-24 mb-16 sm:mb-20 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-[11px] font-mono text-muted-foreground mb-3 tracking-wider uppercase">
          <Workflow className="w-3.5 h-3.5 text-foreground" />
          <span>Architecture & Engineering Engine</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
          System Architecture & Engineering Pipeline
        </h2>
        <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mt-2.5 leading-relaxed font-sans">
          Interactive visual flowchart, reverse proxy middleware mechanics, API telemetry, and zero-dependency offline bundling architecture.
        </p>

        {/* 3 Main View Tabs */}
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/80 mt-5">
          <button
            type="button"
            onClick={() => setActiveView('flowchart')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeView === 'flowchart'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            System Flow Chart
          </button>
          <button
            type="button"
            onClick={() => setActiveView('tech')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeView === 'tech'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tech Behind It & API
          </button>
          <button
            type="button"
            onClick={() => setActiveView('tiers')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeView === 'tiers'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            5-Tier Deep-Dive
          </button>
        </div>
      </div>

      {/* VIEW 1: PROPER INTERACTIVE FLOW CHART */}
      {activeView === 'flowchart' && (
        <SpotlightCard
          spotlightColor="rgba(255, 255, 255, 0.06)"
          className="p-4 sm:p-7 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md"
        >
          {/* Top Blueprint Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-border/60 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-foreground animate-pulse" />
              <span className="font-bold text-foreground">END-TO-END DATA FLOW DIAGRAM</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted border border-border" /> Node Component</span>
              <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-foreground" /> Direct Data Link</span>
              <span className="flex items-center gap-1"><Radio className="w-3 h-3 text-foreground" /> SSE Stream</span>
            </div>
          </div>

          {/* Interactive Chart Canvas */}
          <div className="space-y-6">
            {/* Tier 1: Client & Presentation */}
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-foreground" />
                <span>1. Presentation Layer (Studio & Landing)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>Landing Dashboard (/)</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">Entry</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    URL Capture input, 4 Scope presets (Single Page, Tree, Full, Deep), DNS pre-validation, and auth configuration.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>Mirror Studio (/mirror/[id])</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">Interactive</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    4 Viewport Chassis (Desktop, MacBook, iPad, iPhone Pro), in-place Dash/Pages/Assets/Files sidebar tabs & real-time draggable terminal.
                  </p>
                </div>
              </div>
            </div>

            {/* Connecting Arrow 1 */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground py-0.5">
              <span className="px-2 py-0.5 rounded bg-muted border border-border text-foreground font-semibold">1. Submit Target URL</span>
              <ArrowDown className="w-3.5 h-3.5 text-foreground" />
            </div>

            {/* Tier 2: Next.js API & Reverse Proxy Middleware */}
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Network className="w-3 h-3 text-foreground" />
                <span>2. Next.js App Router (Streaming & Reverse Proxy)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center justify-between">
                    <span>POST /api/mirror</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-300">Dispatch</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Normalizes target URL, executes SSRF loopback guard, creates atomic job in SQLite, and launches crawler engine.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-foreground/30 bg-muted/30">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center justify-between">
                    <span>middleware.ts</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-foreground text-background font-semibold">Proxy Core</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Inspects incoming referer. Reroutes requests for /_next/static and /assets from preview iframes to /api/mirror/[id]/preview.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center justify-between">
                    <span>GET /progress (SSE)</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-300">Live Telemetry</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Streams live terminal output, discovered pages, download velocity, and health score to the UI at 60fps.
                  </p>
                </div>
              </div>
            </div>

            {/* Connecting Arrow 2 */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground py-0.5">
              <span className="px-2 py-0.5 rounded bg-muted border border-border text-foreground font-semibold">2. Dispatch & Ingest DOM</span>
              <ArrowDown className="w-3.5 h-3.5 text-foreground" />
            </div>

            {/* Tier 3: Crawling, Detection & AST Engine */}
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-foreground" />
                <span>3. Crawling, Detection & AST Rewriting Engine</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/70 bg-card/60">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-foreground" />
                    <span>Security & DNS Guard</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Blocks SSRF, loopback IPs (127.0.0.1, LAN), and validates redirect chains.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-card/60">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-foreground" />
                    <span>Hybrid Crawler</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Fast HTTP streaming (180+ pgs/s) + Playwright Chromium for client SPA hydration.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-card/60">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-foreground" />
                    <span>Action Shield & Auth</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Blocks mutating requests (POST/logout), injects session tokens and demo logins.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-card/60">
                  <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-foreground" />
                    <span>AST Link Rewriter</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Localizes Google Fonts, external CDNs, and rewrites root links to relative.
                  </p>
                </div>
              </div>
            </div>

            {/* Connecting Arrow 3 */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground py-0.5">
              <span className="px-2 py-0.5 rounded bg-muted border border-border text-foreground font-semibold">3. Persist State & Stream ZIP</span>
              <ArrowDown className="w-3.5 h-3.5 text-foreground" />
            </div>

            {/* Tier 4 & 5: Dual Persistence & Standalone Bundle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dual Persistence */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-foreground" />
                  <span>4. Dual Persistence Storage</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-border/60 bg-background/50">
                    <div className="font-bold text-foreground">SQLite Database (data/webharvest.db)</div>
                    <div className="text-[11px] text-muted-foreground">WAL Journaling mode, jobs, metrics, and error logs with atomic concurrency.</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-background/50">
                    <div className="font-bold text-foreground">Local Storage (downloads/[id]/)</div>
                    <div className="text-[11px] text-muted-foreground">Mirrored HTML, CSS chunks, JS chunks, web fonts (woff2), vector & raster images.</div>
                  </div>
                </div>
              </div>

              {/* Standalone Bundle */}
              <div className="p-4 rounded-xl border border-foreground/30 bg-muted/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Archive className="w-3 h-3 text-foreground" />
                    <span>5. Standalone Offline Bundle</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-foreground/20 bg-background/70">
                      <div className="font-bold text-foreground">server.js (Node.js Standard Lib)</div>
                      <div className="text-[11px] text-muted-foreground">Zero external npm dependencies, native http/fs with SPA routing fallback.</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-foreground/20 bg-background/70">
                      <div className="font-bold text-foreground">serve.py (Python 3 Multi-Threaded)</div>
                      <div className="text-[11px] text-muted-foreground">Python standard library multi-threaded server with start.sh and start.bat.</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[10px] font-mono text-foreground font-semibold flex items-center justify-between">
                  <span>100% Air-Gapped Standalone ZIP</span>
                  <span>Zero Cloud Egress</span>
                </div>
              </div>
            </div>
          </div>
        </SpotlightCard>
      )}

      {/* VIEW 2: TECH BEHIND IT & ALL API ENDPOINTS */}
      {activeView === 'tech' && (
        <div className="space-y-6">
          {/* Tech Stack Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {TECH_STACK_GRID.map((t, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md card-hover-effect group cursor-default">
                <div className="text-xs sm:text-sm font-bold text-foreground mb-1 font-display group-hover:text-foreground">{t.name}</div>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">{t.role}</p>
              </div>
            ))}
          </div>

          {/* Full API Endpoints & Methods Table */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-foreground" />
                <h3 className="text-sm sm:text-base font-bold text-foreground font-display">Engine API Routes & Communication Protocols</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground uppercase font-medium">
                8 Core Endpoints
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {API_ENDPOINTS.map((ep, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3 card-hover-effect transition-all duration-200 hover:border-foreground/40 hover:bg-muted/30 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'POST'
                          ? 'bg-foreground text-background'
                          : ep.method === 'GET'
                          ? 'bg-muted border border-border text-foreground'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-semibold text-foreground tracking-tight">{ep.path}</span>
                      <span className="text-[10px] text-muted-foreground font-sans">({ep.layer})</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans pl-1 leading-relaxed">
                      {ep.desc}
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0 md:text-right">
                    <span className="text-foreground/90 font-medium font-mono">{ep.tech}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: 5-TIER DEEP-DIVE */}
      {activeView === 'tiers' && (
        <div className="space-y-6">
          {/* 5 Tiers Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            {ARCH_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-foreground/50 bg-muted/60 text-foreground ring-1 ring-foreground/20 shadow-xs'
                      : 'border-border/70 bg-card/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        {tier.number}
                      </span>
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                        isSelected ? 'border-foreground/40 bg-foreground text-background' : 'border-border bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-3 h-3" />
                      </div>
                    </div>
                    <h4 className="text-xs font-semibold leading-tight text-foreground">
                      {tier.name}
                    </h4>
                  </div>
                  <span className="block mt-2 text-[9px] font-mono text-muted-foreground truncate">
                    {tier.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Tier Details */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.06)"
            className="p-5 sm:p-7 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border/70">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-foreground text-background">
                    TIER {activeTier.number}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {activeTier.tag}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  {activeTier.name}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                  {activeTier.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-muted-foreground">Output:</span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-muted/50 border border-border/80 text-foreground font-medium">
                  {activeTier.outputs}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {activeTier.components.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
                      <span className="text-xs font-semibold text-foreground">
                        {comp.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {comp.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Implementation Files */}
            <div className="mt-6 pt-4 border-t border-border/60 font-mono text-xs">
              <span className="text-muted-foreground text-[11px] block mb-2">Source Implementation Files:</span>
              <div className="flex flex-wrap gap-2">
                {activeTier.files.map((f, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-muted/40 border border-border text-[11px] text-foreground">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </div>
      )}
    </section>
  );
}
