import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { resolveTargetDir, ensureJobExists } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Ensure job exists (handles server restart / hot reload)
    if (!ensureJobExists(id)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = activeJobs.get(id)!;

    // Caching layer: If job is completed, return the cached result immediately.
    // If mirroring is in progress, throttle calculations to at most once per 4 seconds.
    const now = Date.now();
    if (job.cachedAssets) {
      if (job.status === 'completed' || (now - (job.lastAssetsUpdate || 0) < 4000)) {
        return NextResponse.json(job.cachedAssets);
      }
    }

    const targetDir = resolveTargetDir(id, job.hostname);
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ colors: [], images: [] });
    }

    const images: Array<{ name: string; path: string; previewUrl: string; size: string }> = [];
    const colorCounts: Record<string, number> = {};

    // Regex patterns for CSS colors
    const hexRegex = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
    const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;

    function parseColorsFromText(text: string) {
      const hexMatches = text.match(hexRegex);
      if (hexMatches) {
        for (const match of hexMatches) {
          if (match.length !== 4 && match.length !== 5 && match.length !== 7 && match.length !== 9) continue;
          let color = match.toLowerCase();
          if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
          }
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        }
      }

      const rgbMatches = text.match(rgbRegex);
      if (rgbMatches) {
        for (const match of rgbMatches) {
          const color = match.replace(/\s+/g, '').toLowerCase();
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        }
      }
    }

    function walk(dir: string) {
      try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          if (file.startsWith('.')) continue;

          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (stat.isFile()) {
            const cleanFile = file.split('?')[0];
            const ext = path.extname(cleanFile).toLowerCase();
            const rel = path.relative(targetDir, fullPath).replace(/\\/g, '/');

            // Image/Video assets: filter out FontAwesome SVG fonts, loading circles, and tiny icons (< 2KB)
            if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
              const lowerName = file.toLowerCase();
              const isSvgFont = ext === '.svg' && (
                lowerName.includes('fa-') || 
                lowerName.includes('solid') || 
                lowerName.includes('regular') || 
                lowerName.includes('brands') || 
                lowerName.includes('glyph') || 
                lowerName.includes('font') || 
                lowerName.includes('elementor')
              );
              
              const isDecorationOrSpinner = stat.size < 2048 || (
                lowerName.includes('arrow') ||
                lowerName.includes('dots') ||
                lowerName.includes('star') ||
                lowerName.includes('bullet') ||
                lowerName.includes('checkbox') ||
                lowerName.includes('loader') ||
                lowerName.includes('spinner') ||
                lowerName.includes('ajax-')
              );

              if (!isSvgFont && !isDecorationOrSpinner) {
                images.push({
                  name: file,
                  path: rel,
                  previewUrl: `/api/mirror/${id}/preview/${rel}`,
                  size: formatBytes(stat.size),
                });
              }
            }

            // Extract colors from CSS and HTML files (max 500KB)
            if (['.css', '.html', '.htm'].includes(ext) && stat.size < 500000) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                parseColorsFromText(content);
              } catch {}
            }
          }
        }
      } catch {}
    }

    walk(targetDir);

    // Color logic: parse, check HSL saturation/lightness, filter out grays and transparencies to extract brand colors
    const brandColors: Array<{ color: string; count: number }> = [];
    const neutralColors: Array<{ color: string; count: number }> = [];

    for (const [color, count] of Object.entries(colorCounts)) {
      const rgb = parseToRgb(color);
      if (!rgb || rgb.a < 0.9) continue; // skip transparent colors

      const sat = getSaturation(rgb.r, rgb.g, rgb.b);
      const l = getLightness(rgb.r, rgb.g, rgb.b);

      // Exclude extreme whites/blacks from brand list
      if (sat > 0.12 && l > 0.1 && l < 0.9) {
        brandColors.push({ color, count });
      } else {
        // Exclude default absolute black/white from showing in final palette if possible
        if (color !== '#ffffff' && color !== '#000000' && color !== 'rgb(255,255,255)' && color !== 'rgb(0,0,0)') {
          neutralColors.push({ color, count });
        }
      }
    }

    // Sort by frequency
    brandColors.sort((a, b) => b.count - a.count);
    neutralColors.sort((a, b) => b.count - a.count);

    // Combine: Brand colors first, then fill remainder with neutral accent colors (max 5 main colors)
    const combined = [
      ...brandColors.map(c => c.color),
      ...neutralColors.map(c => c.color)
    ];

    // Deduplicate array
    const finalColors = Array.from(new Set(combined)).slice(0, 5);

    const result = {
      colors: finalColors,
      images: images.slice(0, 100),
    };

    // Update job cache
    job.cachedAssets = result;
    job.lastAssetsUpdate = now;

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function parseToRgb(color: string): { r: number; g: number; b: number; a: number } | null {
  if (color.startsWith('#')) {
    let hex = color.substring(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1
    };
  } else if (color.startsWith('rgb')) {
    const parts = color.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      return {
        r: parseInt(parts[0], 10),
        g: parseInt(parts[1], 10),
        b: parseInt(parts[2], 10),
        a: parts.length > 3 ? parseFloat(parts[3]) : 1
      };
    }
  }
  return null;
}

function getSaturation(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const l = (max + min) / 2;
  return d / (1 - Math.abs(2 * l - 1));
}

function getLightness(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max + min) / 2;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
