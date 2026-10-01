'use client';

import React from 'react';
import { Zap, Globe, Layers, SlidersHorizontal, Check } from 'lucide-react';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

export type PresetKey = 'quick' | 'website' | 'full' | 'custom';

export interface PresetCardItem {
  id: PresetKey;
  title: string;
  description: string;
  specs: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRESETS: PresetCardItem[] = [
  {
    id: 'quick',
    title: 'Single Page',
    description: 'Instant snapshot of the starting page and its assets.',
    specs: 'Fast HTTP • Depth 0',
    icon: Zap,
  },
  {
    id: 'website',
    title: 'Full Website',
    description: 'Follows links across the site hierarchy and sitemap.',
    specs: 'Balanced • Depth 3',
    icon: Globe,
  },
  {
    id: 'full',
    title: 'Deep Capture',
    description: 'Unlimited pages: styles, scripts, dashboards, and assets.',
    specs: 'Unlimited Mode • Auto Depth',
    icon: Layers,
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Fine-tune crawl depth, rendering, and domain rules.',
    specs: 'User Configured',
    icon: SlidersHorizontal,
  },
];

interface CapturePresetsProps {
  selectedPreset: PresetKey;
  onSelect: (preset: PresetKey) => void;
  onConfigureCustom?: () => void;
}

export function CapturePresets({
  selectedPreset,
  onSelect,
  onConfigureCustom,
}: CapturePresetsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
          Capture Scope
        </span>
        {selectedPreset === 'custom' && onConfigureCustom && (
          <button
            type="button"
            onClick={onConfigureCustom}
            className="text-xs text-foreground hover:underline font-mono cursor-pointer"
          >
            Configure Rules →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map((item) => {
          const isSelected = selectedPreset === item.id;
          const Icon = item.icon;

          return (
            <SpotlightCard
              key={item.id}
              spotlightColor={isSelected ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)'}
              onClick={() => {
                onSelect(item.id);
                if (item.id === 'custom' && onConfigureCustom) {
                  onConfigureCustom();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(item.id);
                  if (item.id === 'custom' && onConfigureCustom) {
                    onConfigureCustom();
                  }
                }
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-foreground bg-muted/60 text-foreground shadow-xs ring-1 ring-foreground/20'
                  : 'border-border bg-card/60 hover:bg-card hover:border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-foreground" />
                  {isSelected && <Check className="w-3.5 h-3.5 text-foreground" />}
                </div>

                <div className="text-xs font-semibold text-foreground mb-1">
                  {item.title}
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal mb-3">
                  {item.description}
                </p>
              </div>

              <div className="text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/50">
                {item.specs}
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </div>
  );
}
