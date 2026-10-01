'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe, Star, Layers } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WebHarvestLogo } from '@/components/ui/WebHarvestLogo';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

interface NavbarProps {
  onOpenRecent?: () => void;
  recentCount?: number;
}

export function Navbar({ onOpenRecent, recentCount = 0 }: NavbarProps) {
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/github-stars')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stars === 'number') {
          setStarCount(data.stars);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-950 flex items-center justify-center overflow-hidden p-1 shadow-xs ring-1 ring-border/50">
            <WebHarvestLogo className="w-full h-full object-contain" size={32} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-sm sm:text-base text-foreground">
              WebHarvest
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border border-border bg-muted/50 text-muted-foreground">
              V3
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {recentCount > 0 && onOpenRecent && (
            <button
              type="button"
              onClick={onOpenRecent}
              className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Recent</span>
              <span className="text-[10px] font-mono px-1 rounded bg-muted text-foreground">
                {recentCount}
              </span>
            </button>
          )}

          {/* GitHub button on right side with star count */}
          <a
            href="https://github.com/krishsoni15/WebHarvest"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-foreground px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors shadow-xs"
          >
            <GithubIcon className="w-3.5 h-3.5 text-foreground" />
            <span className="font-medium">GitHub</span>
            {starCount !== null && (
              <span className="inline-flex items-center gap-1 pl-2 border-l border-border font-mono text-[11px] text-muted-foreground">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                <span>{starCount.toLocaleString()}</span>
              </span>
            )}
          </a>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
