'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Palette,
  Image as ImageIcon,
  Type,
  Link2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export interface HealthIssueItem {
  id: string;
  type: 'image' | 'request' | 'external' | 'dynamic' | 'link';
  severity: 'low' | 'medium' | 'high';
  title: string;
  count: number;
  description: string;
  affectedUrls: string[];
}

interface HealthTabProps {
  id: string;
  overallScore?: number;
  categories?: {
    html: number;
    css: number;
    images: number;
    fonts: number;
    javascript: number;
    links: number;
  };
  issues?: HealthIssueItem[];
  onOpenResource?: (url: string) => void;
}

export function HealthTab({
  id,
  overallScore = 96,
  categories = {
    html: 98,
    css: 100,
    images: 97,
    fonts: 100,
    javascript: 92,
    links: 98,
  },
  issues = [
    {
      id: 'missing-images',
      type: 'image',
      severity: 'medium',
      title: 'Missing or 404 images',
      count: 4,
      description: 'Image references in HTML/CSS returned 404 from upstream server.',
      affectedUrls: [
        'https://example.com/assets/img/avatar-fallback.png',
        'https://example.com/icons/favicon-32.png',
        'https://example.com/banners/promo-2025.webp',
        'https://example.com/images/bg-dots.svg',
      ],
    },
    {
      id: 'failed-requests',
      type: 'request',
      severity: 'medium',
      title: 'Failed network requests',
      count: 3,
      description: 'Upstream HTTP endpoints responded with error or timeout.',
      affectedUrls: [
        'https://example.com/api/analytics/track',
        'https://example.com/telemetry',
        'https://example.com/v1/ping',
      ],
    },
    {
      id: 'external-refs',
      type: 'external',
      severity: 'low',
      title: 'Third-party external references',
      count: 2,
      description: 'Links pointing to external CDNs or origins kept intact or localized.',
      affectedUrls: [
        'https://fonts.googleapis.com/css2?family=Inter',
        'https://cdn.jsdelivr.net/npm/chart.js',
      ],
    },
    {
      id: 'dynamic-pages',
      type: 'dynamic',
      severity: 'low',
      title: 'Client-rendered dynamic pages',
      count: 1,
      description: 'Page required Chromium Playwright execution to hydrate DOM.',
      affectedUrls: ['https://example.com/dashboard/live'],
    },
  ],
  onOpenResource,
}: HealthTabProps) {
  const [selectedIssue, setSelectedIssue] = useState<HealthIssueItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Section: Score and Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall Score */}
        <div className="p-5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono text-muted-foreground">
                Mirror Health
              </span>
              <ShieldCheck className="w-4 h-4 text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Automated audit of link traversability, media presence, and resource integrity.
            </p>
          </div>

          <div className="my-5">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-extrabold text-foreground">
                {overallScore}
              </span>
              <span className="text-lg font-mono text-muted-foreground">/ 100</span>
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-1">
              Passed 94 out of 98 validation checks
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono">
            Zero fatal broken scripts • 100% offline navigable
          </div>
        </div>

        {/* Category Percentages */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono text-muted-foreground">
              Audit Breakdown by Category
            </span>
            <span className="text-xs font-mono text-muted-foreground">Threshold: 90%+</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { label: 'HTML Structure', score: categories.html, icon: FileCode },
              { label: 'CSS Styles', score: categories.css, icon: Palette },
              { label: 'Images & SVGs', score: categories.images, icon: ImageIcon },
              { label: 'Web Fonts', score: categories.fonts, icon: Type },
              { label: 'JavaScript Bundles', score: categories.javascript, icon: FileCode },
              { label: 'Relative Links', score: categories.links, icon: Link2 },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.label} className="p-2.5 rounded-lg border border-border/50 bg-background/50">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-foreground" />
                      <span className="text-foreground">{cat.label}</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">{cat.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actionable Issues Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Actionable Findings & Warnings ({issues.length})
          </h4>
          <span className="text-xs text-muted-foreground">
            Click any warning to inspect affected resource URLs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className="p-3.5 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-amber-500/40 transition-all cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-foreground group-hover:text-amber-500 transition-colors">
                    {issue.count} {issue.title.toLowerCase()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {issue.description}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Issue Details Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {selectedIssue?.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {selectedIssue?.description}
          </DialogDescription>
        </DialogHeader>

        {selectedIssue && (
          <div className="py-2 space-y-3">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">
              Affected URLs ({selectedIssue.affectedUrls.length})
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-border/40 border border-border/70 rounded-lg bg-background/50 font-mono text-xs">
              {selectedIssue.affectedUrls.map((url, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/30">
                  <span className="text-foreground/90 truncate text-[11px]" title={url}>
                    {url}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
