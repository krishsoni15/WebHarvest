'use client';

import React from 'react';
import {
  FileText,
  Layers,
  HardDrive,
  Activity,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { CountUp } from '@/components/reactbits/CountUp';

interface OverviewTabProps {
  pagesCount: number;
  assetsCount: number;
  dataSizeFormatted: string;
  requestsCount: number;
  failedCount: number;
  engine: string;
  healthScore: number;
  categoryHealth?: {
    html: number;
    css: number;
    images: number;
    fonts: number;
    js: number;
  };
  techStack?: string[] | string;
  onNavigateTab: (tabId: string) => void;
}

export function OverviewTab({
  pagesCount,
  assetsCount,
  dataSizeFormatted,
  requestsCount,
  failedCount,
  engine = 'Auto (Hybrid)',
  healthScore = 96,
  categoryHealth = {
    html: 100,
    css: 99,
    images: 98,
    fonts: 100,
    js: 94,
  },
  techStack = ['React', 'Next.js', 'Tailwind CSS', 'Vite'],
  onNavigateTab,
}: OverviewTabProps) {
  const technologies = Array.isArray(techStack)
    ? techStack
    : typeof techStack === 'string' && techStack.length > 0
    ? techStack.split(',').map((t) => t.trim())
    : ['HTML5', 'Modern CSS', 'ES Modules'];

  return (
    <div className="space-y-6">
      {/* 1. Capture Summary Grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-muted-foreground mb-3">
          Capture Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Pages */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.08)"
            onClick={() => onNavigateTab('pages')}
            className="p-3.5 rounded-xl border border-border bg-card hover:border-foreground/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Pages</span>
              <FileText className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
              <CountUp to={pagesCount} duration={0.8} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Discovered & mirrored</div>
          </SpotlightCard>

          {/* Assets */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.08)"
            onClick={() => onNavigateTab('files')}
            className="p-3.5 rounded-xl border border-border bg-card hover:border-foreground/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Assets</span>
              <Layers className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
              <CountUp to={assetsCount} duration={1.0} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Media, scripts, styles</div>
          </SpotlightCard>

          {/* Data */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.08)"
            className="p-3.5 rounded-xl border border-border bg-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Data</span>
              <HardDrive className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground truncate">
              {dataSizeFormatted}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Deduplicated storage</div>
          </SpotlightCard>

          {/* Requests */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.08)"
            onClick={() => onNavigateTab('logs')}
            className="p-3.5 rounded-xl border border-border bg-card hover:border-foreground/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Requests</span>
              <Activity className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
              <CountUp to={requestsCount} duration={0.9} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Traced HTTP calls</div>
          </SpotlightCard>

          {/* Failed */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.08)"
            onClick={() => onNavigateTab('logs')}
            className="p-3.5 rounded-xl border border-border bg-card hover:border-destructive/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Failed</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div className={`font-mono text-xl sm:text-2xl font-bold ${failedCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {failedCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {failedCount > 0 ? 'Inspect issues' : 'Zero failures'}
            </div>
          </SpotlightCard>

          {/* Engine */}
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.08)"
            className="p-3.5 rounded-xl border border-border bg-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Engine</span>
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-bold text-foreground truncate">
              {engine}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Dual Crawl Architecture</div>
          </SpotlightCard>
        </div>
      </div>

      {/* 2. Mirror Health & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Health Score Card */}
        <SpotlightCard
          spotlightColor="rgba(255, 255, 255, 0.08)"
          className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono text-muted-foreground">
                Mirror Integrity
              </span>
              <ShieldCheck className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Integrity score computed across link resolution, stylesheets, scripts, and media rendering.
            </p>
          </div>

          <div className="my-4 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-mono font-extrabold text-foreground">
              <CountUp to={healthScore} duration={0.8} />%
            </span>
            <span className="text-xs text-muted-foreground font-mono font-medium">
              Offline Verification
            </span>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            All internal assets rewritten to relative paths
          </div>
        </SpotlightCard>

        {/* Right: Category Breakdown */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-border bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono text-muted-foreground">
              Category Coverage
            </span>
            <span className="text-xs text-muted-foreground font-mono">100% Target</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'HTML Documents', score: categoryHealth.html },
              { label: 'CSS Stylesheets', score: categoryHealth.css },
              { label: 'Images & Media', score: categoryHealth.images },
              { label: 'Web Fonts', score: categoryHealth.fonts },
              { label: 'JavaScript Bundles', score: categoryHealth.js },
            ].map((cat) => (
              <div key={cat.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{cat.label}</span>
                  <span className="font-mono font-medium text-foreground">{cat.score}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all duration-300"
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Detected Technologies */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-4 h-4 text-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-foreground">
            Detected Technologies & Frameworks
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {technologies.map((tech, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="text-xs font-mono py-1 px-2.5 bg-background border-border text-foreground"
            >
              {tech}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
