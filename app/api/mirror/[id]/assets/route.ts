import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { resolveTargetDir, ensureJobExists, getBaseDownloadDir } from '@/lib/resolveDir';
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

    // Caching layer: If job is completed, return the cached result ONLY if it has assets.
    // If mirroring is in progress, throttle calculations to at most once per 3 seconds.
    const now = Date.now();
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
    if (!forceRefresh && job.cachedAssets && Array.isArray(job.cachedAssets.images) && job.cachedAssets.images.length > 0) {
      if (job.status === 'completed' || (now - (job.lastAssetsUpdate || 0) < 3000)) {
        return NextResponse.json(job.cachedAssets);
      }
    }

    const baseDir = getBaseDownloadDir(id);
    const targetDir = resolveTargetDir(id, job.hostname);
    if (!fs.existsSync(targetDir) && !fs.existsSync(baseDir)) {
      return NextResponse.json({ colors: [], images: [] });
    }

    const images: Array<{ name: string; path: string; previewUrl: string; size: string; type: string }> = [];
    const colorCounts: Record<string, number> = {};
    const seenPaths = new Set<string>();

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

    function walk(dir: string, rootDir: string) {
      try {
        if (!fs.existsSync(dir)) return;
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          if (file.startsWith('.')) continue;

          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath, rootDir);
          } else if (stat.isFile()) {
            const cleanFile = file.split('?')[0];
            const ext = path.extname(cleanFile).toLowerCase();
            const rel = path.relative(rootDir, fullPath).replace(/\\/g, '/');

            if (seenPaths.has(rel)) continue;
            seenPaths.add(rel);

            const SYSTEM_IGNORED = [
              'crawl_logs.txt', 'job.json', 'report.json', 'package.json', 'package-lock.json',
              'server.js', 'serve.py', 'start.sh', 'start.bat', 'auth_state.json', 'manifest.json', 'readme.md'
            ];
            if (SYSTEM_IGNORED.includes(file.toLowerCase())) continue;

            const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif', '.bmp', '.tiff'];
            const svgExts = ['.svg'];
            const fontExts = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
            const cssExts = ['.css', '.scss', '.sass', '.less'];
            const jsExts = ['.js', '.mjs', '.cjs'];
            const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
            const audioExts = ['.mp3', '.wav', '.aac', '.flac', '.m4a'];
            const docExts = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.json', '.xml', '.zip', '.txt'];

            const isImage = imageExts.includes(ext);
            const isSvg = svgExts.includes(ext);
            const isFont = fontExts.includes(ext);
            const isCss = cssExts.includes(ext);
            const isJs = jsExts.includes(ext);
            const isVideo = videoExts.includes(ext);
            const isAudio = audioExts.includes(ext);
            const isDoc = docExts.includes(ext);

            if (isImage || isSvg || isFont || isCss || isJs || isVideo || isAudio || isDoc) {
              const type = isImage ? 'image'
                : isSvg ? 'svg'
                : isFont ? 'font'
                : isCss ? 'css'
                : isJs ? 'js'
                : isVideo ? 'video'
                : isAudio ? 'audio'
                : 'document';

              images.push({
                name: file,
                path: rel,
                previewUrl: `/api/mirror/${id}/preview/${rel}`,
                size: formatBytes(stat.size),
                type,
              });
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

    walk(targetDir, targetDir);
    if (baseDir !== targetDir) {
      walk(baseDir, baseDir);
    }

    // Color logic: parse, check HSL saturation/lightness, filter out grays and transparencies to extract brand colors
    const brandColors: Array<{ color: string; count: number }> = [];
    const defaultHarmonious = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed'];

    for (const [color, count] of Object.entries(colorCounts)) {
      const rgb = parseToRgb(color);
      if (!rgb || rgb.a < 0.9) continue; // skip transparent colors

      const sat = getSaturation(rgb.r, rgb.g, rgb.b);
      const l = getLightness(rgb.r, rgb.g, rgb.b);

      // Require genuine color saturation and balanced lightness to filter out grays, muddy off-whites, and near-blacks
      const isGray = Math.abs(rgb.r - rgb.g) < 24 && Math.abs(rgb.g - rgb.b) < 24 && Math.abs(rgb.r - rgb.b) < 24;
      if (!isGray && sat > 0.18 && l > 0.12 && l < 0.88) {
        brandColors.push({ color, count });
      }
    }

    // Sort by frequency
    brandColors.sort((a, b) => b.count - a.count);

    // Pick top vibrant brand colors, filling up to 5 with harmonious palette if needed
    const distinctBrand: string[] = [];
    for (const b of brandColors) {
      if (distinctBrand.length >= 5) break;
      if (!distinctBrand.includes(b.color)) distinctBrand.push(b.color);
    }
    for (const def of defaultHarmonious) {
      if (distinctBrand.length >= 5) break;
      if (!distinctBrand.includes(def)) distinctBrand.push(def);
    }

    const result = {
      colors: distinctBrand.slice(0, 5),
      images: images.slice(0, 2000),
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
