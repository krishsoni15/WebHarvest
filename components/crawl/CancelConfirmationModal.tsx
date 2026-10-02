'use client';

import React, { useState } from 'react';
import { AlertTriangle, Archive, Trash2, X, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CancelConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmKeep: () => Promise<void>;
  onConfirmPurge: () => Promise<void>;
  hostname: string;
  pagesCount: number;
  filesCount: number;
}

export function CancelConfirmationModal({
  isOpen,
  onClose,
  onConfirmKeep,
  onConfirmPurge,
  hostname,
  pagesCount,
  filesCount,
}: CancelConfirmationModalProps) {
  const [loadingAction, setLoadingAction] = useState<'keep' | 'purge' | null>(null);

  if (!isOpen) return null;

  const handleKeep = async () => {
    try {
      setLoadingAction('keep');
      await onConfirmKeep();
    } finally {
      setLoadingAction(null);
      onClose();
    }
  };

  const handlePurge = async () => {
    try {
      setLoadingAction('purge');
      await onConfirmPurge();
    } finally {
      setLoadingAction(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in select-none">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Interrupt Crawl Operation?
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {hostname || 'target.com'}
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

        {/* Status Callout */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1 font-mono">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Captured Pages:</span>
            <span className="font-bold text-foreground">{pagesCount}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Captured Files:</span>
            <span className="font-bold text-foreground">{filesCount}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          The crawl is currently active. Choose whether you want to preserve the snapshot captured so far or purge all scraped data:
        </p>

        {/* Option 1: Keep Snapshot */}
        <button
          type="button"
          onClick={handleKeep}
          disabled={loadingAction !== null}
          className="w-full p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all cursor-pointer group flex items-start gap-3 disabled:opacity-50"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            {loadingAction === 'keep' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                Finalize & Keep Snapshot
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Stop crawling now, preserve all captured pages, and compile the offline mirror bundle so you can preview and download it.
            </p>
          </div>
        </button>

        {/* Option 2: Abort & Purge */}
        <button
          type="button"
          onClick={handlePurge}
          disabled={loadingAction !== null}
          className="w-full p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-left transition-all cursor-pointer group flex items-start gap-3 disabled:opacity-50"
        >
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            {loadingAction === 'purge' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-foreground group-hover:text-rose-400 transition-colors block">
              Abort & Delete All Data
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Immediately terminate the crawl process and permanently delete all temporary files from the disk.
            </p>
          </div>
        </button>

        {/* Dismiss / Continue */}
        <div className="pt-1 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Continue Crawling</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
