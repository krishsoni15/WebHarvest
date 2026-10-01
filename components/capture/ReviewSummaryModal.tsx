'use client';

import React from 'react';
import {
  Globe,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  Clock,
  HardDrive,
  FileText,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CrawlConfigState } from './CaptureConfigDialog';
import { AuthModeType } from '../landing/AuthenticationSection';

interface ReviewSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUrl: string;
  config: CrawlConfigState;
  authMode: AuthModeType;
  authProfileName?: string;
  onConfirmStart: () => void;
  onEditSettings: () => void;
  isLoading: boolean;
}

export function ReviewSummaryModal({
  open,
  onOpenChange,
  targetUrl,
  config,
  authMode,
  authProfileName,
  onConfirmStart,
  onEditSettings,
  isLoading,
}: ReviewSummaryModalProps) {
  let hostname = 'example.com';
  try {
    if (targetUrl) hostname = new URL(targetUrl).hostname;
  } catch {}

  const scopeLabel =
    config.scopeMode === 'single-page'
      ? 'Single page'
      : config.scopeMode === 'tree'
      ? 'Entire website'
      : config.scopeMode === 'full'
      ? 'Deep recursive capture'
      : 'Custom configuration';

  const depthLabel =
    config.scopeMode === 'single-page'
      ? 'Level 0 (Current page only)'
      : config.crawlDepth === 'auto'
      ? 'Auto'
      : `${config.crawlDepth} levels`;

  const engineLabel =
    config.crawlMode === 'auto'
      ? 'Auto (HTTP + Browser fallback)'
      : config.crawlMode === 'fast'
      ? 'Fast HTTP'
      : config.crawlMode === 'balanced'
      ? 'Balanced'
      : 'Chromium / Playwright';

  const authLabel =
    authMode === 'none'
      ? 'None (Public pages only)'
      : authMode === 'browser'
      ? 'Interactive Browser Session'
      : authMode === 'profile'
      ? `Saved Profile (${authProfileName || 'Selected'})`
      : 'Imported Session Tokens';

  const enabledResourcesCount = Object.values(config.captureRules).filter(Boolean).length;
  const resourcesLabel =
    enabledResourcesCount >= 10
      ? 'Full capture (Web, Media, Files, 3D, Analysis)'
      : `${enabledResourcesCount} categories selected`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CheckCircle2 className="w-4 h-4 text-foreground" />
          Review Capture Configuration
        </DialogTitle>
        <DialogDescription className="text-xs">
          Verify your crawl targets and boundary limits before initiating capture.
        </DialogDescription>
      </DialogHeader>

      <div className="py-3 space-y-3">
        {/* Target Card */}
        <div className="p-3 rounded-lg border border-border bg-muted/30 font-mono flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground truncate">
            <Globe className="w-4 h-4 text-foreground shrink-0" />
            <span className="font-semibold text-foreground truncate">{targetUrl || 'https://example.com'}</span>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0 pl-2">
            Host: {hostname}
          </span>
        </div>

        {/* Configuration Summary Table */}
        <div className="rounded-lg border border-border overflow-hidden text-xs divide-y divide-border/60">
          <div className="flex items-center justify-between px-3 py-2 bg-card/60">
            <span className="text-muted-foreground">Scope</span>
            <span className="font-medium text-foreground">{scopeLabel}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-card/40">
            <span className="text-muted-foreground">Depth</span>
            <span className="font-mono text-foreground">{depthLabel}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-card/60">
            <span className="text-muted-foreground">Engine</span>
            <span className="font-medium text-foreground">{engineLabel}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-card/40">
            <span className="text-muted-foreground">Authentication</span>
            <span className="font-medium text-foreground">{authLabel}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-card/60">
            <span className="text-muted-foreground">Resources</span>
            <span className="font-medium text-foreground">{resourcesLabel}</span>
          </div>
          <div className="flex items-start justify-between px-3 py-2 bg-card/40">
            <span className="text-muted-foreground">Limits</span>
            <span className="font-mono text-foreground text-right text-[11px]">
              {config.maxPages.toLocaleString()} pages • {config.maxAssets.toLocaleString()} assets • {config.maxSizeGb} GB • {config.maxDurationMin} min
            </span>
          </div>
        </div>

        {/* Action shield / domain notice */}
        <div className="text-[11px] text-muted-foreground leading-normal px-1">
          {config.blockDestructiveActions ? (
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              Action Shield active: Form destructive clicks & logouts are strictly blocked.
            </span>
          ) : (
            <span>Boundary policy: {config.domainPolicy === 'same-hostname' ? 'Strictly same hostname' : 'Subdomains included'}.</span>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onOpenChange(false);
            onEditSettings();
          }}
          className="text-xs"
        >
          <Sliders className="w-3.5 h-3.5 mr-1" />
          Edit Settings
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onConfirmStart}
          disabled={isLoading}
          className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs gap-1.5 cursor-pointer"
        >
          <span>Start Capture</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
