'use client';

import React, { useState } from 'react';
import { Palette, Copy, Check, X, Code, Sliders } from 'lucide-react';

interface ColorPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: string[];
}

function hexToRgb(hex: string) {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function ColorPaletteModal({ isOpen, onClose, colors }: ColorPaletteModalProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState<'css' | 'tailwind' | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(id);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  const handleExportCss = () => {
    const css = ':root {\n' + colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n') + '\n}';
    navigator.clipboard.writeText(css);
    setCopiedExport('css');
    setTimeout(() => setCopiedExport(null), 2000);
  };

  const handleExportTailwind = () => {
    const colorsObj = colors.reduce((acc, c, i) => {
      acc[`brand-${i + 1}`] = c;
      return acc;
    }, {} as Record<string, string>);
    const code = JSON.stringify({ colors: colorsObj }, null, 2);
    navigator.clipboard.writeText(code);
    setCopiedExport('tailwind');
    setTimeout(() => setCopiedExport(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">
                Theme Color Palette & Tokens
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                {colors.length} detected brand and UI color values
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Color Swatch List */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 font-mono">
          {colors.map((color, idx) => {
            const rgb = hexToRgb(color);
            const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
            const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
            const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '';

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:border-foreground/40 hover:bg-muted/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: color }}
                    className="w-10 h-10 rounded-lg border border-black/20 shadow-xs shrink-0 flex items-center justify-center text-white"
                  >
                    {copiedColor === color && <Check className="w-4 h-4 drop-shadow-md" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{color.toUpperCase()}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                        {idx === 0 ? 'Primary' : idx === 1 ? 'Secondary' : `Accent ${idx - 1}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 flex items-center gap-2">
                      {rgbStr && <span>{rgbStr}</span>}
                      {hslStr && <span>• {hslStr}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(color, color)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-foreground text-xs font-mono transition-colors cursor-pointer shrink-0"
                  title="Copy Hex Code"
                >
                  {copiedColor === color ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Export Palette Toolbar */}
        <div className="pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] font-mono text-muted-foreground">
            Export tokens:
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCss}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-mono text-foreground cursor-pointer transition-colors"
            >
              {copiedExport === 'css' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Code className="w-3.5 h-3.5" />}
              <span>{copiedExport === 'css' ? 'Copied CSS!' : 'CSS Variables'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportTailwind}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-mono text-foreground cursor-pointer transition-colors"
            >
              {copiedExport === 'tailwind' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Sliders className="w-3.5 h-3.5" />}
              <span>{copiedExport === 'tailwind' ? 'Copied Tailwind!' : 'Tailwind Config'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
