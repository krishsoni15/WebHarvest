/**
 * WebHarvest Crawl Mode Detection
 *
 * Determines the optimal crawl mode (HTTP vs Browser) based on
 * site analysis. Supports user-specified modes and auto-detection.
 */

/** Available crawl modes */
export type CrawlMode = 'fast' | 'balanced' | 'browser' | 'auto';

/** Results of JS-dependency analysis */
export interface JSAnalysis {
  needsBrowser: boolean;
  confidence: number;    // 0-100
  reason: string;
  signals: string[];
}

/**
 * Analyze HTML content to determine if browser rendering is needed.
 * Called after an initial HTTP fetch to decide whether to switch to Playwright.
 */
export function detectJSDependency(html: string, url: string): JSAnalysis {
  const signals: string[] = [];
  let score = 0; // Higher = more likely to need browser

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;

  // Strip tags to get visible text
  const visibleText = bodyContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Signal 1: Very little visible content (SPA with empty body)
  if (visibleText.length < 100) {
    signals.push('Body has minimal visible text (<100 chars)');
    score += 40;
  } else if (visibleText.length < 300) {
    signals.push('Body has limited visible text (<300 chars)');
    score += 20;
  }

  // Signal 2: React/Vue/Angular root mount points
  if (/<div\s+id=["'](?:root|app|__next|__nuxt|__vue)["']\s*>/i.test(html)) {
    signals.push('Framework mount point detected (root/app/__next/__nuxt)');
    score += 30;
  }

  // Signal 3: Framework-specific patterns
  if (/__NEXT_DATA__/i.test(html)) {
    signals.push('Next.js __NEXT_DATA__ present');
    score += 15; // Next.js SSR often has content, but hydration may add more
  }
  if (/data-reactroot|data-reactid/i.test(html)) {
    signals.push('React root markers present');
    score += 20;
  }
  if (/ng-version|ng-app|\[ng-/i.test(html)) {
    signals.push('Angular framework markers');
    score += 25;
  }
  if (/data-v-[a-f0-9]|__vue__/i.test(html)) {
    signals.push('Vue.js component markers');
    score += 25;
  }
  if (/data-svelte|__svelte/i.test(html)) {
    signals.push('Svelte framework markers');
    score += 20;
  }

  // Signal 4: <noscript> warning = JS required
  if (/<noscript[^>]*>[\s\S]*?(?:enable|require|need|javascript|browser)[\s\S]*?<\/noscript>/i.test(html)) {
    signals.push('Noscript warning indicates JS requirement');
    score += 35;
  }

  // Signal 5: Heavy script bundles
  const scriptTags = html.match(/<script[^>]*src=["'][^"']+["'][^>]*>/gi) || [];
  if (scriptTags.length > 10) {
    signals.push(`Heavy script loading (${scriptTags.length} external scripts)`);
    score += 15;
  }

  // Signal 6: Webpack/Vite chunk patterns
  if (/chunk-[a-f0-9]+\.js|assets\/index-[a-f0-9]+\.js|\/_next\/static\/chunks/i.test(html)) {
    signals.push('Build tool chunk patterns (webpack/vite/next)');
    score += 10;
  }

  // Signal 7: Web Component / Shadow DOM usage
  if (/customElements\.define|shadowRoot|<template\s+id=/i.test(html)) {
    signals.push('Web Components/Shadow DOM detected');
    score += 20;
  }

  const confidence = Math.min(score, 100);
  const needsBrowser = confidence >= 50;

  let reason = 'Static HTML — HTTP crawl sufficient';
  if (needsBrowser) {
    reason = `JS-heavy site detected (confidence: ${confidence}%) — browser rendering recommended`;
  } else if (confidence >= 30) {
    reason = `Possible JS dependency (confidence: ${confidence}%) — HTTP may work, monitor results`;
  }

  return { needsBrowser, confidence, reason, signals };
}

/**
 * Resolve the effective crawl mode based on user preference and site analysis.
 */
export function resolveCrawlMode(
  mode: CrawlMode,
  analysis?: JSAnalysis,
): { useHTTP: boolean; useBrowser: boolean; reason: string } {
  switch (mode) {
    case 'fast':
      return { useHTTP: true, useBrowser: false, reason: 'Fast mode — HTTP only' };

    case 'browser':
      return { useHTTP: false, useBrowser: true, reason: 'Browser mode — Playwright for all pages' };

    case 'balanced':
      return {
        useHTTP: true,
        useBrowser: true,
        reason: 'Balanced mode — HTTP first, browser fallback for JS-heavy pages',
      };

    case 'auto':
      if (analysis && analysis.needsBrowser) {
        return {
          useHTTP: false,
          useBrowser: true,
          reason: `Auto: Browser mode selected — ${analysis.reason}`,
        };
      }
      return {
        useHTTP: true,
        useBrowser: true,
        reason: 'Auto: Starting with HTTP, will switch to browser if needed',
      };

    default:
      return { useHTTP: true, useBrowser: true, reason: 'Default: balanced mode' };
  }
}
