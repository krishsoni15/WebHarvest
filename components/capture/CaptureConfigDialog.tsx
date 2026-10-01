'use client';

import React from 'react';
import {
  X,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CaptureRules } from '@/lib/crawler/presets';

export interface CrawlConfigState {
  scopeMode: 'single-page' | 'tree' | 'full' | 'custom';
  crawlDepth: number | 'auto';
  maxPages: number;
  maxAssets: number;
  maxSizeGb: number | 'No limit';
  maxDurationMin: number;
  crawlMode: 'auto' | 'fast' | 'balanced' | 'browser';
  domainPolicy: 'same-hostname' | 'include-subdomains';
  followInternalLinks: boolean;
  discoverSitemap: boolean;
  captureExternalAssets: boolean;
  followExternalPages: boolean;
  blockDestructiveActions: boolean;
  captureRules: CaptureRules;
}

interface CaptureConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUrl: string;
  onChangeTargetUrl: (url: string) => void;
  config: CrawlConfigState;
  onChangeConfig: (newConfig: CrawlConfigState) => void;
  onStartCapture: () => void;
}

export function CaptureConfigDialog({
  open,
  onOpenChange,
  targetUrl,
  onChangeTargetUrl,
  config,
  onChangeConfig,
  onStartCapture,
}: CaptureConfigDialogProps) {
  if (!open) return null;

  const updateField = <K extends keyof CrawlConfigState>(key: K, value: CrawlConfigState[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-50 duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Crawl Configuration
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Target URL */}
          <div>
            <label className="font-medium text-foreground block mb-1">
              Target URL
            </label>
            <Input
              type="text"
              value={targetUrl}
              onChange={(e) => onChangeTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Scope Mode */}
          <div>
            <label className="font-medium text-foreground block mb-1.5">
              Crawl Strategy & Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'full', label: 'Unlimited Deep Crawl' },
                { id: 'tree', label: 'Entire Website' },
                { id: 'single-page', label: 'Single Page' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    updateField('scopeMode', s.id as any);
                    if (s.id === 'full') {
                      updateField('maxPages', 50000);
                      updateField('crawlDepth', 'auto');
                      updateField('crawlMode', 'auto');
                    } else if (s.id === 'single-page') {
                      updateField('maxPages', 1);
                      updateField('crawlDepth', 0);
                    }
                  }}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                    config.scopeMode === s.id
                      ? 'border-foreground bg-foreground text-background shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {config.scopeMode === 'full'
                ? '⭐ Zero-Decision Unlimited Mode: Recursively captures full websites with unlimited pages, dashboards, styles, and assets.'
                : config.scopeMode === 'tree'
                ? 'Standard site crawl following internal links up to depth 3.'
                : 'Captures only the exact entered page URL.'}
            </p>
          </div>

          {/* Engine Selection */}
          <div>
            <label className="font-medium text-foreground block mb-1.5">
              Crawler Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'auto', label: 'Auto (Smart Hybrid)' },
                { id: 'browser', label: 'Playwright (Full Browser)' },
                { id: 'fast', label: 'Fast HTTP Pipeline' },
                { id: 'balanced', label: 'Balanced Engine' },
              ].map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => updateField('crawlMode', eng.id as any)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer font-medium ${
                    config.crawlMode === eng.id
                      ? 'border-foreground bg-foreground text-background shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {eng.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crawl Limits */}
          <div className="pt-2 border-t border-border space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-foreground">
                  Max Pages Target
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Default: Unlimited (50,000+)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.maxPages}
                  onChange={(e) => updateField('maxPages', parseInt(e.target.value) || 50000)}
                  className="h-8 text-xs font-mono flex-1"
                />
                <div className="flex items-center gap-1">
                  {[500, 1000, 5000, 50000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => updateField('maxPages', num)}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                        config.maxPages === num
                          ? 'border-foreground bg-muted font-bold text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {num >= 50000 ? 'Unlimited' : num >= 1000 ? `${num / 1000}k` : num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-foreground block mb-1">
                Crawl Depth
              </span>
              <select
                value={String(config.crawlDepth)}
                onChange={(e) => updateField('crawlDepth', e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-hidden"
              >
                <option value="auto">Auto (Smart Dynamic Depth)</option>
                <option value={1}>1 level (Direct links)</option>
                <option value={3}>3 levels (Standard)</option>
                <option value={5}>5 levels (Deep tree)</option>
                <option value={10}>10 levels (Maximum depth)</option>
              </select>
            </div>
          </div>

          {/* Safety Toggles */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Safe Navigation Shield</div>
                <div className="text-[11px] text-muted-foreground">Prevents logout, payment, or destructive button clicks</div>
              </div>
              <Switch
                checked={config.blockDestructiveActions}
                onCheckedChange={(val) => updateField('blockDestructiveActions', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Capture External Fonts & CSS</div>
                <div className="text-[11px] text-muted-foreground">Saves Google Fonts, CDNs, and stylesheet icons</div>
              </div>
              <Switch
                checked={config.captureExternalAssets}
                onCheckedChange={(val) => updateField('captureExternalAssets', val)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onStartCapture();
            }}
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium cursor-pointer"
          >
            Start Capture
          </Button>
        </div>
      </div>
    </div>
  );
}
