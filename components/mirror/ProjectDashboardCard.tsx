'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Download,
  Layers,
  Check,
  Copy,
  Terminal,
  RotateCw,
  Plus,
  Sparkles,
  FileText,
} from 'lucide-react';
import { AssetItem } from './AssetsTab';
import { ColorPaletteModal } from './ColorPaletteModal';

interface ProjectDashboardCardProps {
  id: string;
  hostname: string;
  url: string;
  totalSize: string;
  filesCount: number;
  pagesCount: number;
  assetsCount: number;
  lastCapturedPage?: string;
  techStack?: string;
  colors?: string[];
  assetsList?: AssetItem[];
  crawlLogs?: string;
  onBrowseFiles: () => void;
  onBrowseAssets: () => void;
  onBrowsePages?: () => void;
  onOpenLogs?: () => void;
  onDownloadZip: () => void;
  isDownloadingZip?: boolean;
}

export function ProjectDashboardCard({
  id,
  hostname,
  url,
  totalSize = '0 B',
  filesCount = 0,
  pagesCount = 0,
  assetsCount = 0,
  lastCapturedPage = 'index.html',
  techStack = 'Next.js (React)',
  colors = ['#e11d48', '#06b6d4', '#10b981', '#84cc16', '#a855f7'],
  assetsList = [],
  crawlLogs = '',
  onBrowseFiles,
  onBrowseAssets,
  onBrowsePages,
  onOpenLogs,
  onDownloadZip,
  isDownloadingZip = false,
}: ProjectDashboardCardProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Get first 3 image previews for the asset stack
  const previewImages = assetsList
    .filter((a) => a.type === 'image' && a.previewUrl)
    .slice(0, 3);

  // Extract recent log lines for the terminal preview
  const logLines = useMemo(() => {
    if (crawlLogs && crawlLogs.trim()) {
      const split = crawlLogs
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (split.length > 0) {
        return split.slice(-4);
      }
    }
    return [
      `[SAVED] captured: ${hostname || 'target'} assets`,
      `[CRAWL] (${pagesCount}/${pagesCount || 1}) Linked local references`,
      `[SAVED] Bundled ${filesCount || assetsCount} resources`,
      `[FINISH] WebHarvest snapshot compiled successfully`,
    ];
  }, [crawlLogs, hostname, pagesCount, filesCount, assetsCount]);

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col space-y-3.5 shadow-sm select-none">
      {/* 1. Title + New Capture Link */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
          PROJECT DASHBOARD
        </h3>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          title="Start a new capture"
        >
          <Plus className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
          <span>New Capture</span>
        </Link>
      </div>

      {/* 2. Source Address */}
      <div className="space-y-0.5">
        <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase block">
          SOURCE ADDRESS
        </span>
        <a
          href={url || `https://${hostname}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono font-semibold text-foreground hover:underline inline-flex items-center gap-1.5 group cursor-pointer truncate max-w-full"
        >
          <span className="truncate">{hostname}</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0" />
        </a>
      </div>

      {/* 3. Total Size & Files Captured Grid */}
      <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/70">
        <div>
          <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase block mb-0.5">
            TOTAL SIZE
          </span>
          <span className="text-base font-bold font-mono text-foreground tracking-tight">
            {totalSize}
          </span>
        </div>
        <div
          onClick={onBrowseFiles}
          className="cursor-pointer group hover:bg-muted/30 p-1 -m-1 rounded-md transition-colors"
          title="Click to view all captured files"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase block mb-0.5 group-hover:text-foreground transition-colors">
              FILES CAPTURED
            </span>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity">↗</span>
          </div>
          <span className="text-base font-bold font-mono text-foreground tracking-tight group-hover:underline">
            {filesCount}
          </span>
        </div>
      </div>

      {/* 4. Technology Stack */}
      <div className="flex items-center justify-between py-0.5 text-xs">
        <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase">
          TECHNOLOGY
        </span>
        <span className="px-2 py-0.5 rounded bg-muted/60 border border-border text-[11px] font-mono font-medium text-foreground">
          {techStack}
        </span>
      </div>

      {/* 5. Colors Palette Dots */}
      <div className="flex items-center justify-between py-1 px-1 rounded-md hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={() => setIsColorModalOpen(true)}
          className="flex items-center gap-1.5 cursor-pointer group"
          title="Open full color palette inspector"
        >
          <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase group-hover:text-foreground">
            COLORS
          </span>
          <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground opacity-60">↗</span>
          {copiedColor && (
            <span className="text-[9px] font-mono text-emerald-500 font-semibold animate-in fade-in">
              Copied {copiedColor}!
            </span>
          )}
        </button>
        <div className="flex items-center gap-1.5">
          {colors.slice(0, 5).map((color, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleCopyColor(color)}
              style={{ backgroundColor: color }}
              className="w-3.5 h-3.5 rounded-full border border-black/20 hover:scale-125 transition-transform cursor-pointer relative shadow-xs group"
              title={`Click to copy: ${color}`}
            >
              {copiedColor === color && (
                <Check className="w-2 h-2 text-white absolute inset-0 m-auto drop-shadow-md" />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsColorModalOpen(true)}
            className="text-[9px] font-mono text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border/70 bg-muted/40 hover:bg-muted/80 cursor-pointer ml-0.5 transition-colors"
            title="Inspect & export palette"
          >
            Palette
          </button>
        </div>
      </div>

      {/* 6. Pages and Assets Dual Cards */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {/* Pages Card */}
        <div
          onClick={onBrowsePages || onBrowseFiles}
          className="p-2.5 rounded-lg border border-border bg-muted/20 flex flex-col justify-between space-y-2 hover:border-foreground/40 hover:bg-muted/30 transition-all cursor-pointer group shadow-2xs"
          title="Click to view all pages"
        >
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase group-hover:text-foreground transition-colors">
                PAGES
              </span>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity">↗</span>
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {pagesCount}
            </div>
            <div className="mt-1 text-[9px] font-mono text-muted-foreground truncate">
              <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/70">
                LAST CAPTURED
              </span>
              <span className="text-foreground/90 font-medium truncate block" title={lastCapturedPage}>
                {lastCapturedPage.split('/').pop() || 'index.html'}
              </span>
            </div>
          </div>

          <div className="text-[11px] font-medium text-foreground group-hover:underline inline-flex items-center gap-1 pt-0.5">
            <span>Browse Pages</span>
            <span className="text-muted-foreground group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Assets Card */}
        <div
          onClick={onBrowseAssets}
          className="p-2.5 rounded-lg border border-border bg-muted/20 flex flex-col justify-between space-y-2 hover:border-foreground/40 hover:bg-muted/30 transition-all cursor-pointer group shadow-2xs"
          title="Click to view all media and assets"
        >
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase group-hover:text-foreground transition-colors">
                ASSETS
              </span>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity">↗</span>
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {assetsCount}
            </div>

            {/* Asset Previews / Avatars */}
            <div className="flex items-center -space-x-1.5 mt-2">
              {previewImages.length > 0 ? (
                previewImages.map((img, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-background overflow-hidden bg-muted/80 shrink-0"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              ) : (
                <div className="w-4 h-4 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] text-muted-foreground">
                  <Layers className="w-2.5 h-2.5" />
                </div>
              )}
              {assetsCount > 3 && (
                <div className="w-4 h-4 rounded-full border border-background bg-zinc-800 text-[7px] font-mono font-bold text-zinc-300 flex items-center justify-center shrink-0">
                  +{assetsCount > 99 ? '99' : assetsCount - 3}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] font-medium text-foreground group-hover:underline inline-flex items-center gap-1 pt-0.5">
            <span>Browse Assets</span>
            <span className="text-muted-foreground group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>
      </div>

      {/* 7. Download ZIP Archive Button (Shows exact scraped size) */}
      <button
        type="button"
        onClick={onDownloadZip}
        disabled={isDownloadingZip}
        className="w-full bg-foreground text-background hover:opacity-90 active:scale-[0.99] font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60 text-xs font-mono border border-foreground/10"
        title={`Download all scraped assets (${totalSize})`}
      >
        {isDownloadingZip ? (
          <>
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>Packaging ZIP ({totalSize})...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download ZIP ({totalSize})</span>
          </>
        )}
      </button>

      {/* Archive Documentation (.md) Button / Link */}
      <div className="flex items-center gap-1.5 pt-0.5 text-[11px] font-mono">
        <a
          href={`/api/mirror/${id}/preview/README.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1 px-2 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/70 text-foreground flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          title="Open generated README.md documentation for this mirror"
        >
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span>View Archive .md</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>

        <a
          href={`/api/mirror/${id}/preview/README.md?download=true`}
          download={`${hostname || 'mirror'}-README.md`}
          className="py-1 px-2 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/70 text-foreground flex items-center justify-center gap-1 cursor-pointer transition-colors"
          title="Download README.md file"
        >
          <Download className="w-3 h-3 text-muted-foreground" />
          <span>.md</span>
        </a>
      </div>

      {/* 8. System Logs Terminal Preview */}
      <div className="rounded-xl border border-border/80 bg-muted/15 p-2.5 space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/80" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              SYSTEM LOGS
            </span>
          </div>
          {onOpenLogs && (
            <button
              type="button"
              onClick={onOpenLogs}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider"
            >
              <span>EXPAND</span>
              <span>↗</span>
            </button>
          )}
        </div>

        {/* Terminal preview box */}
        <div
          onClick={onOpenLogs}
          className="p-2.5 rounded-lg bg-zinc-950 dark:bg-black/90 border border-zinc-800 text-[10px] space-y-1.5 text-zinc-200 font-mono leading-relaxed overflow-hidden cursor-pointer hover:border-zinc-700 transition-colors shadow-2xs group"
          title="Click to expand logs terminal"
        >
          {logLines.map((rawLine, idx) => {
            let time = '';
            let line = rawLine.trim();
            const timeMatch = line.match(/^(\d{4}-\d{2}-\d{2}T)?(\d{2}:\d{2}:\d{2})(?:\.\d+Z)?\s*(.*)$/);
            if (timeMatch) {
              time = timeMatch[2];
              line = timeMatch[3];
            }
            const tagMatch = line.match(/^\[([A-Z0-9_\-]+)\]\s*(.*)$/i);
            const tag = tagMatch ? tagMatch[1].toUpperCase() : '';
            const text = tagMatch ? tagMatch[2] : line.replace(/^\$\s*/, '');

            let badgeStyle = 'bg-zinc-800 text-zinc-300 border-zinc-700';
            if (tag === 'SAVED') badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            else if (tag === 'CRAWL' || tag === 'FETCH') badgeStyle = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
            else if (tag === 'ASSET' || tag === 'MEDIA') badgeStyle = 'bg-zinc-800 text-zinc-200 border-zinc-700';
            else if (tag === 'FINISH' || tag === 'DONE') badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
            else if (tag === 'WARN' || tag === 'ERROR') badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';

            return (
              <div key={idx} className="flex items-center gap-1.5 min-w-0" suppressHydrationWarning>
                {time && <span className="text-zinc-500 text-[9px] shrink-0">{time}</span>}
                {tag && (
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 uppercase tracking-wider ${badgeStyle}`}>
                    {tag}
                  </span>
                )}
                <span className="truncate text-zinc-300 group-hover:text-zinc-100 transition-colors">
                  {text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. Runnable Standalone Code (Positioned AFTER logs) */}
      <div className="rounded-xl border border-border/80 bg-muted/15 p-3 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
            <span className="font-mono font-bold text-muted-foreground">&gt;_</span>
            <span>Runnable Standalone Code</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground font-mono">
            Zero Config
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          Unzip and launch the mirror locally with complete SPA fallback & offline auth:
        </p>

        <div className="flex items-center justify-between gap-1.5 p-1.5 px-2 rounded-lg bg-muted/60 dark:bg-zinc-900/80 border border-border/80 text-xs">
          <button
            type="button"
            onClick={() => handleCopyCmd('node server.js')}
            className="flex items-center gap-1.5 text-foreground font-bold hover:underline cursor-pointer group py-1 px-2 rounded bg-background shadow-2xs border border-border/70 hover:bg-accent transition-colors"
            title="Click to copy: node server.js"
          >
            <span>node server.js</span>
            {copiedCmd === 'node server.js' ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground opacity-70" />
            )}
          </button>

          <span className="text-[11px] text-muted-foreground/70 font-mono">or</span>

          <button
            type="button"
            onClick={() => handleCopyCmd('python3 serve.py')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer group py-1 px-2 rounded hover:bg-background/80 transition-colors"
            title="Click to copy: python3 serve.py"
          >
            <span>python3 serve.py</span>
            {copiedCmd === 'python3 serve.py' ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground opacity-60" />
            )}
          </button>
        </div>
      </div>

      {/* 10. Interactive Color Palette Inspector Modal */}
      <ColorPaletteModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        colors={colors}
      />
    </div>
  );
}
