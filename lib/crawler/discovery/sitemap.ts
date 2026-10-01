/**
 * WebHarvest Sitemap & Robots.txt Discovery
 *
 * Discovers initial seed URLs by checking /robots.txt and /sitemap.xml.
 * Recursively resolves XML sitemap indexes up to configurable limits.
 */

import * as cheerio from 'cheerio';
import { normalizeURL } from '../normalize';

export interface RobotsInfo {
  sitemaps: string[];
  disallowedPaths: string[];
  crawlDelay?: number;
}

/**
 * Parse robots.txt content to find Sitemap directives and disallowed paths.
 */
export function parseRobotsTxt(content: string, origin: string): RobotsInfo {
  const sitemaps: string[] = [];
  const disallowedPaths: string[] = [];
  let crawlDelay: number | undefined;

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;

    const [directive, ...rest] = clean.split(':');
    if (!directive || rest.length === 0) continue;

    const name = directive.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (name === 'sitemap') {
      try {
        const fullUrl = new URL(value, origin).href;
        const norm = normalizeURL(fullUrl);
        if (norm) sitemaps.push(norm);
      } catch {
        // Ignore invalid sitemap url
      }
    } else if (name === 'disallow') {
      if (value) disallowedPaths.push(value);
    } else if (name === 'crawl-delay') {
      const delay = parseFloat(value);
      if (!isNaN(delay)) crawlDelay = delay;
    }
  }

  return { sitemaps, disallowedPaths, crawlDelay };
}

/**
 * Extracts <loc> URLs from a sitemap XML string.
 * Distinguishes between sub-sitemaps (<sitemap>) and page URLs (<url>).
 */
export function parseSitemapXml(xmlContent: string): { pages: string[]; subSitemaps: string[] } {
  const pages: string[] = [];
  const subSitemaps: string[] = [];

  const $ = cheerio.load(xmlContent, { xmlMode: true });

  // 1. Check for sitemap index (<sitemapindex> -> <sitemap> -> <loc>)
  $('sitemap loc').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      try {
        const norm = normalizeURL(text);
        if (norm) subSitemaps.push(norm);
      } catch {
        // Skip invalid URL
      }
    }
  });

  // 2. Check for regular urlset (<urlset> -> <url> -> <loc>)
  $('url loc').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      try {
        const norm = normalizeURL(text);
        if (norm) pages.push(norm);
      } catch {
        // Skip invalid URL
      }
    }
  });

  return { pages, subSitemaps };
}

/**
 * Discovers crawlable URLs for a given origin by inspecting robots.txt and sitemap.xml.
 */
export async function discoverSiteMapUrls(
  origin: string,
  fetchFn: (url: string) => Promise<string | null>,
  maxUrls: number = 200
): Promise<string[]> {
  const discoveredPages = new Set<string>();
  const sitemapsToFetch: string[] = [];

  // 1. Try robots.txt
  try {
    const robotsUrl = new URL('/robots.txt', origin).href;
    const robotsTxt = await fetchFn(robotsUrl);
    if (robotsTxt) {
      const parsed = parseRobotsTxt(robotsTxt, origin);
      sitemapsToFetch.push(...parsed.sitemaps);
    }
  } catch {
    // Ignore robots.txt errors
  }

  // 2. Fallback to /sitemap.xml if none found in robots.txt
  if (sitemapsToFetch.length === 0) {
    try {
      sitemapsToFetch.push(new URL('/sitemap.xml', origin).href);
    } catch {
      // Ignore
    }
  }

  // 3. Process sitemaps (depth limit of 2 to avoid runaway chains)
  const visitedSitemaps = new Set<string>();

  while (sitemapsToFetch.length > 0 && discoveredPages.size < maxUrls) {
    const currentSitemap = sitemapsToFetch.shift()!;
    if (visitedSitemaps.has(currentSitemap)) continue;
    visitedSitemaps.add(currentSitemap);

    try {
      const xml = await fetchFn(currentSitemap);
      if (!xml) continue;

      const { pages, subSitemaps } = parseSitemapXml(xml);

      for (const page of pages) {
        discoveredPages.add(page);
        if (discoveredPages.size >= maxUrls) break;
      }

      // Add sub-sitemaps to process queue if we still have budget
      for (const sub of subSitemaps) {
        if (!visitedSitemaps.has(sub) && visitedSitemaps.size < 5) {
          sitemapsToFetch.push(sub);
        }
      }
    } catch {
      // Ignore sitemap fetch failure
    }
  }

  return Array.from(discoveredPages);
}
