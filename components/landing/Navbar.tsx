'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Layers, Menu, X, Network, Target, HelpCircle, SlidersHorizontal, ExternalLink } from 'lucide-react';
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
  onOpenConfig?: () => void;
}

export function Navbar({ onOpenRecent, recentCount = 0, onOpenConfig }: NavbarProps) {
  const [starCount, setStarCount] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/github-stars')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stars === 'number') {
          setStarCount(data.stars);
        }
      })
      .catch(() => { });
  }, []);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full pt-3 sm:pt-4 px-3 sm:px-6 pointer-events-none transition-all">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-5 h-12 sm:h-13 rounded-full border border-slate-200/90 dark:border-white/[0.12] bg-white/80 dark:bg-zinc-950/60 backdrop-blur-xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.10)] flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto transition-all">
          {/* Left: Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 text-foreground hover:opacity-90 transition-opacity shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-border/80 bg-zinc-950 flex items-center justify-center overflow-hidden p-1 shadow-xs ring-1 ring-border/50">
              <WebHarvestLogo className="w-full h-full object-contain" size={28} />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold tracking-tight text-sm sm:text-base text-foreground">
                WebHarvest
              </span>
              <span className="text-[10px] px-1 sm:px-1.5 py-0.2 rounded font-mono font-medium border border-border bg-muted/50 text-muted-foreground">
                V3
              </span>
            </div>
          </Link>

          {/* Center: Nav links for rich sections (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-muted-foreground font-medium">
            <a href="#use-cases" className="hover:text-foreground transition-colors">
              Use Cases
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {recentCount > 0 && onOpenRecent && (
              <button
                type="button"
                onClick={onOpenRecent}
                className="hidden sm:flex text-xs text-foreground/80 hover:text-foreground px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] transition-colors items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs"
                title="Recent jobs"
              >
                <Layers className="w-3.5 h-3.5 text-foreground" />
                <span>Recent</span>
                <span className="text-[10px] font-mono px-1 rounded-full bg-muted text-foreground">
                  {recentCount}
                </span>
              </button>
            )}

            {/* GitHub button on right side: Displays stars on both Mobile & Desktop */}
            <a
              href="https://github.com/krishsoni15/WebHarvest"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 sm:gap-2 text-xs text-foreground px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] transition-colors shadow-xs shrink-0"
              title="GitHub Repository & Stars"
            >
              <GithubIcon className="w-3.5 h-3.5 text-foreground shrink-0" />
              <span className="font-medium hidden sm:inline">GitHub</span>
              {starCount !== null && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 sm:pl-1.5 sm:border-l sm:border-border font-mono text-[11px] text-foreground">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{starCount.toLocaleString()}</span>
                </span>
              )}
            </a>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden h-8 w-8 rounded-full border border-slate-200/90 dark:border-white/10 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-foreground flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slideout Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={closeMenu}
          />

          {/* Drawer Sidebar */}
          <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-background border-l border-border shadow-2xl p-5 flex flex-col justify-between z-50 animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg border border-border bg-foreground text-background flex items-center justify-center p-1">
                    <WebHarvestLogo className="w-full h-full object-contain" size={24} />
                  </div>
                  <span className="font-bold text-sm text-foreground">WebHarvest</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border border-border bg-muted text-foreground">
                    V3
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1 mb-6">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 mb-2">
                  Navigation
                </div>
                <a
                  href="#use-cases"
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Target className="w-4 h-4 text-foreground" />
                  <span>Use Cases & Workloads</span>
                </a>
                <a
                  href="#architecture"
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Network className="w-4 h-4 text-foreground" />
                  <span>System Architecture</span>
                </a>
              </div>

              {/* Tools & Config */}
              <div className="space-y-1 pt-3 border-t border-border/60">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 mb-2">
                  Tools & Shortcuts
                </div>
                {recentCount > 0 && onOpenRecent && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onOpenRecent();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-foreground" />
                      <span>Recent Capture Jobs</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">
                      {recentCount}
                    </span>
                  </button>
                )}
                {onOpenConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onOpenConfig();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer text-left"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                    <span>Advanced Crawl Settings</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer: Full GitHub Card + Theme */}
            <div className="pt-4 border-t border-border/80 space-y-3">
              {/* GitHub Card */}
              <a
                href="https://github.com/krishsoni15/WebHarvest"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/80 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <GithubIcon className="w-4 h-4 text-foreground" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">WebHarvest</div>
                    <div className="text-[10px] text-muted-foreground">Star on GitHub</div>
                  </div>
                </div>
                {starCount !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border font-mono text-[11px] font-medium text-foreground">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{starCount.toLocaleString()}</span>
                  </span>
                )}
              </a>

              {/* Theme & Meta */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground font-mono">Theme Mode</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
