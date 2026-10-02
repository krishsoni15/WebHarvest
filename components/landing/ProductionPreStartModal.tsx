'use client';

import React, { useState } from 'react';
import { Cloud, Laptop, Copy, Check, ExternalLink, Play, X, Cpu, HardDrive, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductionPreStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCloudStart: () => void;
  targetUrl: string;
}

export function ProductionPreStartModal({
  isOpen,
  onClose,
  onConfirmCloudStart,
  targetUrl,
}: ProductionPreStartModalProps) {
  const [copied, setCopied] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const cloneCommand = 'git clone https://github.com/krishsoni15/WebHarvest.git && cd WebHarvest && npm install && npm run dev';

  const handleCopy = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('webharvest_skip_prod_modal', 'true');
      } catch {}
    }
    onConfirmCloudStart();
  };

  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    hostname = targetUrl;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in select-none">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 text-foreground">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Free Cloud Environment Notice
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground font-semibold border border-border">
                  Render Free
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Target: {hostname || 'target site'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cloud Hardware Limits Notice */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-2">
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-foreground" />
              <strong>0.1 vCPU</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-foreground" />
              <strong>512 MB RAM</strong>
            </span>
            <span>•</span>
            <span className="text-foreground font-medium">Free Tier Host</span>
          </div>
          <p className="text-muted-foreground text-[12px] leading-relaxed">
            This hosted instance is ideal for smaller sites and previews. For scraping <strong>10,000+ pages</strong>, heavy media collections, or resource-heavy Single Page Apps, running locally gives you <strong>20x higher throughput</strong> with zero RAM constraints.
          </p>
        </div>

        {/* Recommendation Box: Run Locally */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-foreground" />
              <span>Recommended: Run Locally via Git (100% Free)</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-foreground font-semibold border border-border">
              Ultra Fast
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border font-mono text-[11px] text-foreground overflow-hidden">
            <span className="truncate">$ {cloneCommand}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-foreground text-background hover:opacity-80 cursor-pointer transition-colors text-[10px] shrink-0 font-sans font-medium"
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

          <div className="flex items-center justify-end">
            <a
              href="https://github.com/krishsoni15/WebHarvest"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors font-medium"
            >
              <Laptop className="w-3 h-3" />
              <span>View setup guide on GitHub</span>
              <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* Footer: Checkbox + Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/60">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border text-foreground focus:ring-0 cursor-pointer"
            />
            <span>Don't show this advisory again</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleProceed}
              className="text-xs h-8 gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Proceed on Cloud</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
