'use client';

import React from 'react';
import Link from 'next/link';
import {
  Globe,
  Pause,
  Play,
  XCircle,
  Download,
  ArrowLeft,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ClickSpark } from '@/components/reactbits/ClickSpark';
import { WebHarvestLogo } from '@/components/ui/WebHarvestLogo';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

interface CrawlHeaderProps {
  id?: string;
  hostname: string;
  url?: string;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
  engineMode?: string;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onCancel?: () => void;
  onExportSnapshot?: () => void;
  onOpenLogs?: () => void;
}

export function CrawlHeader({
  id,
  hostname,
  url,
  status,
  engineMode = 'Auto (Hybrid)',
  isPaused = false,
  onTogglePause,
  onCancel,
  onExportSnapshot,
  onOpenLogs,
}: CrawlHeaderProps) {
  const isCrawling = status === 'downloading';

  return (
    <header className="w-full bg-card/90 backdrop-blur-md border-b border-border/80 sticky top-0 z-30 shadow-xs">
      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 h-15 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Brand + Target Info + Status + Engine */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-950 flex items-center justify-center overflow-hidden p-1 shadow-xs ring-1 ring-border/50">
              <WebHarvestLogo className="w-full h-full object-contain" size={32} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground tracking-tight">WebHarvest</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border bg-muted/80 text-muted-foreground font-semibold">
                V3
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-border/80 hidden sm:block shrink-0" />

          {/* Target Hostname */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 bg-muted/30 text-xs font-mono font-medium text-foreground truncate max-w-[200px] lg:max-w-xs shrink-0">
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{hostname || 'Target Website'}</span>
          </div>

          {/* Live crawling badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-card text-foreground text-xs font-mono font-medium shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-muted-foreground' : 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`} />
            <span>{isPaused ? 'Paused' : 'Crawling...'}</span>
          </div>

          {/* Engine */}
          <span className="hidden xl:inline-flex text-[11px] font-mono px-2 py-0.5 rounded border border-border/60 bg-muted/40 text-muted-foreground shrink-0">
            {engineMode}
          </span>
        </div>

        {/* Right: Actions, Logs, Pause, Cancel, GitHub & Theme */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1 rounded-md hover:bg-muted"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New Capture</span>
          </Link>

          {onOpenLogs && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenLogs}
              className="h-8 text-xs gap-1.5 border-border cursor-pointer hover:bg-muted font-mono"
              title="Open Draggable Terminal Logs"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logs</span>
            </Button>
          )}

          {onTogglePause && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTogglePause}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </Button>
          )}

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 text-xs text-destructive hover:bg-destructive/10 border-border gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          )}

          {onExportSnapshot && (
            <ClickSpark sparkColor="#ffffff" sparkSize={6} sparkRadius={20} sparkCount={8}>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onExportSnapshot}
                className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </ClickSpark>
          )}

          <div className="h-4 w-px bg-border/80 hidden sm:block mx-0.5" />

          <a
            href="https://github.com/krishsoni15/WebHarvest"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs text-foreground font-mono transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">GitHub</span>
          </a>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
