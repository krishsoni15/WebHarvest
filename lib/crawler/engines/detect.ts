/**
 * WebHarvest JS-Dependency Detector
 *
 * Analyzes static HTML returned from an HTTP fetch to determine if the page
 * is a client-side rendered Single Page Application (SPA) requiring a headless browser.
 */

import * as cheerio from 'cheerio';

export interface JSDetectionResult {
  needed: boolean;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
}

export function needsBrowserRendering(html: string): JSDetectionResult {
  const reasons: string[] = [];
  let score = 0;

  const $ = cheerio.load(html);

  // 1. Check for standard framework mount containers
  const mountSelectors = [
    '#root:empty',
    '#app:empty',
    '#__next:empty',
    'div[id="root"]',
    'div[id="app"]',
    '[data-reactroot]',
    '[data-v-app]',
  ];

  for (const sel of mountSelectors) {
    if ($(sel).length > 0) {
      score += 0.4;
      reasons.push(`Contains SPA mount container: ${sel}`);
      break;
    }
  }

  // 2. Check for noscript messages
  const noscriptText = $('noscript').text().toLowerCase();
  if (
    noscriptText.includes('enable javascript') ||
    noscriptText.includes('need javascript') ||
    noscriptText.includes('javascript is required') ||
    noscriptText.includes('requires javascript')
  ) {
    score += 0.5;
    reasons.push('Contains explicit <noscript> JavaScript requirement banner');
  }

  // 3. Visible text density vs script count
  $('script, style, noscript, svg').remove();
  const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
  const textLength = visibleText.length;

  if (textLength < 120) {
    score += 0.35;
    reasons.push(`Very low visible text content (${textLength} chars) in initial HTML payload`);
  }

  // 4. Framework script bundle signatures in raw HTML
  const rawLower = html.toLowerCase();
  if (
    rawLower.includes('__next_data__') ||
    rawLower.includes('window.__nuxt__') ||
    rawLower.includes('createapp(') ||
    rawLower.includes('vue.esm') ||
    rawLower.includes('react-dom') ||
    rawLower.includes('webpackchunk')
  ) {
    score += 0.25;
    reasons.push('Detected client-side framework bootstrapping signatures');
  }

  const confidence = Math.min(1.0, score);
  return {
    needed: confidence >= 0.5,
    confidence,
    reasons,
  };
}
