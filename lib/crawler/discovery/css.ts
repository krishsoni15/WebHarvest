/**
 * WebHarvest CSS Resource Discovery
 *
 * Extracts nested assets referenced inside stylesheets:
 * - url(...) in background, mask, cursor, font-face declarations
 * - @import rules (both @import url(...) and @import '...')
 * - Resolves relative paths relative to the stylesheet location
 */

import { normalizeURL } from '../normalize';

export interface DiscoveredCSSResource {
  rawUrl: string;
  resolvedUrl: string;
  type: 'font' | 'image' | 'stylesheet' | 'other';
  declarationType: '@import' | '@font-face' | 'background' | 'other';
}

/**
 * Resolves a CSS asset path against the CSS file's URL.
 */
function resolveCssUrl(raw: string, baseCssUrl: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  // Strip quotes and whitespace
  let clean = raw.trim().replace(/^['"]|['"]$/g, '').trim();

  // Ignore data URIs or empty targets
  if (!clean || clean.startsWith('data:') || clean.startsWith('#')) {
    return null;
  }

  try {
    const resolved = new URL(clean, baseCssUrl).href;
    return normalizeURL(resolved);
  } catch {
    return null;
  }
}

/**
 * Discovers all assets referenced inside a CSS string.
 */
export function discoverCSS(cssContent: string, baseCssUrl: string): DiscoveredCSSResource[] {
  const results: DiscoveredCSSResource[] = [];
  const seen = new Set<string>();

  function addResult(item: DiscoveredCSSResource) {
    if (!seen.has(item.resolvedUrl)) {
      seen.add(item.resolvedUrl);
      results.push(item);
    }
  }

  // 1. @import statements:
  // e.g. @import url("styles.css"); or @import "styles.css";
  const importRegex = /@import\s+(?:url\(\s*)?['"]?([^'")]+)['"]?\s*\)?/gi;
  let importMatch: RegExpExecArray | null;

  while ((importMatch = importRegex.exec(cssContent)) !== null) {
    const raw = importMatch[1];
    const resolved = resolveCssUrl(raw, baseCssUrl);
    if (resolved) {
      addResult({
        rawUrl: raw,
        resolvedUrl: resolved,
        type: 'stylesheet',
        declarationType: '@import',
      });
    }
  }

  // 2. url(...) in general declarations
  // e.g. background-image: url(...); src: url(...);
  const urlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  let urlMatch: RegExpExecArray | null;

  while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
    const raw = urlMatch[2];
    const resolved = resolveCssUrl(raw, baseCssUrl);
    if (!resolved) continue;

    // Detect type based on surrounding context and extensions
    const lower = resolved.toLowerCase();
    let type: DiscoveredCSSResource['type'] = 'image';
    let declarationType: DiscoveredCSSResource['declarationType'] = 'background';

    if (
      lower.endsWith('.woff') ||
      lower.endsWith('.woff2') ||
      lower.endsWith('.ttf') ||
      lower.endsWith('.eot') ||
      lower.endsWith('.otf') ||
      lower.includes('font')
    ) {
      type = 'font';
      declarationType = '@font-face';
    } else if (lower.endsWith('.css')) {
      type = 'stylesheet';
      declarationType = '@import';
    }

    addResult({
      rawUrl: raw,
      resolvedUrl: resolved,
      type,
      declarationType,
    });
  }

  return results;
}
