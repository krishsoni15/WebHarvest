'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, Laptop, Copy, Check, ExternalLink, Cpu, HardDrive } from 'lucide-react';

export function ProductionAdvisoryBanner() {
  const [isProduction, setIsProduction] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      // Show advisory on Render or any public production domain
      if (host.includes('onrender.com') || (!host.includes('localhost') && !host.includes('127.0.0.1'))) {
        setIsProduction(true);
      }
    }
  }, []);

  if (!isProduction || dismissed) return null;

  const cloneCommand = 'git clone https://github.com/krishsoni15/WebHarvest.git && cd WebHarvest && npm install && npm run dev';

  const handleCopy = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-4 sm:my-6 p-3 sm:p-4 rounded-xl border border-border bg-card/80 backdrop-blur-xs text-foreground shadow-md transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-border/50">
        <div className="flex items-start sm:items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted border border-border text-foreground shrink-0 mt-0.5 sm:mt-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold tracking-wide uppercase text-foreground">
                Public Cloud Demo Environment
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted border border-border text-muted-foreground flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" /> 0.1 vCPU • <HardDrive className="w-2.5 h-2.5" /> 512 MB RAM
              </span>
            </div>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 leading-normal">
              Great for standard sites (&lt; 500 pages). For heavy sites (5,000–10,000+ pages) or authenticated Playwright crawls, running locally delivers 20x faster speeds and unlimited RAM.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer shrink-0 self-end sm:self-auto"
        >
          Dismiss ✕
        </button>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        {/* Copy command box */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-muted border border-border font-mono text-[11px] text-foreground overflow-hidden">
          <span className="truncate min-w-0 flex-1">$ {cloneCommand}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-foreground text-background hover:opacity-80 cursor-pointer transition-colors text-[10px] shrink-0 font-sans font-medium"
            title="Copy command"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-background" />
                <span className="text-background font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com/krishsoni15/WebHarvest"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity shrink-0"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Run Locally (GitHub)</span>
          <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}
