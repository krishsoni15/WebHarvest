'use client';

import React from 'react';
import {
  BookOpen,
  Terminal,
  Shield,
  Layers,
  Cpu,
  FileCode,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DocsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocsModal({ open, onOpenChange }: DocsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BookOpen className="w-4 h-4 text-foreground" />
          WebHarvest V3 Documentation
        </DialogTitle>
        <DialogDescription className="text-xs">
          Architecture overview, capture engines, authentication, and offline rewriter specifications.
        </DialogDescription>
      </DialogHeader>

      <div className="py-2 max-h-[65vh] overflow-y-auto space-y-4 text-xs text-muted-foreground leading-relaxed">
        {/* Section 1: Overview */}
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-foreground" />
            Dual-Engine Hybrid Crawler
          </div>
          <p>
            WebHarvest V3 employs a hybrid pipeline: Fast HTTP streaming for high-throughput static assets combined with headless Chromium (Playwright) for JavaScript-heavy single-page applications. Auto mode dynamically escalates pages requiring client execution.
          </p>
        </div>

        {/* Section 2: Isolated Authentication */}
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-foreground" />
            Ephemeral Browser Authentication
          </div>
          <p>
            Never store user credentials or plain-text passwords. Launch an isolated, sandboxed browser session to log in interactively. WebHarvest exports only session cookies and storage tokens for the duration of the crawl, with optional local profile export.
          </p>
        </div>

        {/* Section 3: Action Shield */}
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-foreground" />
            Zero-Harm Action Shield
          </div>
          <p>
            Intelligent heuristics detect and neutralize dangerous buttons and forms (Logout, Sign Out, Delete Account, Payment, Checkout, Reset) to guarantee crawling never alters or degrades account state.
          </p>
        </div>

        {/* Section 4: Offline Link Rewriting */}
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-foreground" />
            Deterministic URL Rewriting
          </div>
          <p>
            Every HTML, CSS, and JS file is parsed to convert absolute URLs, domain-rooted links, srcset references, and font definitions into relative offline-safe links so mirrors function completely disconnected from the Internet.
          </p>
        </div>

        {/* Section 5: CLI & API */}
        <div className="p-3 rounded-lg border border-border bg-muted/30 font-mono text-[11px] space-y-1">
          <div className="text-foreground font-semibold flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-foreground" />
            Crawl API POST Endpoint
          </div>
          <div className="text-muted-foreground">
            POST /api/mirror <br />
            {`{ "url": "https://example.com", "scope": "tree", "engine": "auto", "maxDepth": 3 }`}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs"
        >
          Got it
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
