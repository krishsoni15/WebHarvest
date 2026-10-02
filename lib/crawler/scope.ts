/**
 * WebHarvest V3 Crawl Scope & Action Safety Engine
 *
 * Defines explicit boundaries for crawling:
 * - Scope modes: single-page, tree-level, full-site, sitemap-only
 * - Domain and path allowlists and blocklists
 * - Interaction safety policy: prevents triggering destructive actions (logout, delete, checkout)
 */

export type CrawlScopeMode = 'single-page' | 'tree' | 'full' | 'sitemap' | 'custom';

export interface CrawlScopeConfig {
  mode: CrawlScopeMode;
  maxDepth: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  allowedPaths?: string[];
  blockedPaths?: string[];
  blockDestructiveActions?: boolean;
}

export const DEFAULT_BLOCKED_PATHS = [
  '/logout',
  '/signout',
  '/sign-out',
  '/log-out',
  '/auth/logout',
  '/auth/signout',
  '/account/delete',
  '/delete-account',
  '/checkout',
  '/cart/checkout',
  '/pay',
  '/stripe/**',
  '/billing/cancel',
];

export const DEFAULT_BLOCKED_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'google.com',
  'accounts.google.com',
  'apple.com',
];

/**
 * Checks if a string matches a simple wildcard glob (e.g. "/admin/**" or "*.example.com")
 */
export function matchesGlob(pattern: string, text: string): boolean {
  const p = pattern.trim().toLowerCase();
  const t = text.trim().toLowerCase();

  if (p === '*' || p === '**') return true;
  if (p === t) return true;

  // Wildcard subdomain: *.example.com matches sub.example.com
  if (p.startsWith('*.')) {
    const root = p.slice(2);
    return t === root || t.endsWith('.' + root);
  }

  // Path glob: /admin/** matches /admin/users, /admin/settings
  if (p.endsWith('/**')) {
    const base = p.slice(0, -3);
    return t === base || t.startsWith(base + '/');
  }

  if (p.endsWith('/*')) {
    const base = p.slice(0, -2);
    if (!t.startsWith(base + '/')) return false;
    const remainder = t.slice(base.length + 1);
    return !remainder.includes('/');
  }

  return false;
}

export class ScopeEnforcer {
  private config: CrawlScopeConfig;
  private seedUrl: string;
  private seedHostname: string;

  constructor(seedUrl: string, config?: Partial<CrawlScopeConfig>) {
    this.seedUrl = seedUrl;
    let host = 'example.com';
    try {
      host = new URL(seedUrl).hostname.toLowerCase();
    } catch {}
    this.seedHostname = host;

    this.config = {
      mode: config?.mode || 'tree',
      maxDepth: config?.maxDepth ?? (config?.mode === 'single-page' ? 0 : 3),
      allowedDomains: config?.allowedDomains || [this.seedHostname],
      blockedDomains: [...DEFAULT_BLOCKED_DOMAINS, ...(config?.blockedDomains || [])],
      allowedPaths: config?.allowedPaths || [],
      blockedPaths: [...DEFAULT_BLOCKED_PATHS, ...(config?.blockedPaths || [])],
      blockDestructiveActions: config?.blockDestructiveActions ?? true,
    };
  }

  /**
   * Check if a page link is allowed to be crawled (followed) at a given depth.
   */
  shouldCrawlLink(targetUrl: string, depth: number): { allowed: boolean; reason?: string } {
    // 1. Single Page Mode: only seed URL allowed at depth 0
    if (this.config.mode === 'single-page' && depth > 0) {
      return { allowed: false, reason: 'Single-page scope restricts link following' };
    }

    // 2. Depth Check
    if (depth > this.config.maxDepth) {
      return { allowed: false, reason: `Depth ${depth} exceeds max depth ${this.config.maxDepth}` };
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return { allowed: false, reason: 'Invalid URL' };
    }

    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // 3. Blocked Domains
    for (const blocked of this.config.blockedDomains || []) {
      if (matchesGlob(blocked, host)) {
        return { allowed: false, reason: `Domain '${host}' is blocked by policy` };
      }
    }

    // 4. Allowed Domains (must match at least one allowed domain)
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      const isAllowed = this.config.allowedDomains.some((d) => matchesGlob(d, host));
      if (!isAllowed) {
        return { allowed: false, reason: `Domain '${host}' not in allowed domains scope` };
      }
    }

    // 5. Blocked Paths (e.g. /logout, /admin/**)
    for (const blockedPath of this.config.blockedPaths || []) {
      if (matchesGlob(blockedPath, pathname)) {
        return { allowed: false, reason: `Path '${pathname}' matches blocked path '${blockedPath}'` };
      }
    }

    // 6. Action Safety: prevent destructive URLs
    if (this.config.blockDestructiveActions) {
      const lower = targetUrl.toLowerCase();
      if (
        lower.includes('logout') ||
        lower.includes('signout') ||
        lower.includes('delete-account') ||
        lower.includes('cancel-subscription') ||
        lower.includes('checkout')
      ) {
        return { allowed: false, reason: 'Protected by destructive action safety shield' };
      }
    }

    // 7. Allowed Paths (if specified, must match one)
    if (this.config.allowedPaths && this.config.allowedPaths.length > 0) {
      const pathAllowed = this.config.allowedPaths.some((p) => matchesGlob(p, pathname));
      if (!pathAllowed) {
        return { allowed: false, reason: `Path '${pathname}' not in allowed paths scope` };
      }
    }

    // 8. Spider Trap & Repeating Directory Segment Prevention (e.g. /image/image/image/...)
    const segments = pathname.split('/').filter(Boolean);

    // 8a. Consecutive duplicate segments check: e.g. /image/image, /category/category
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i] === segments[i + 1]) {
        return {
          allowed: false,
          reason: `Spider trap loop detected: consecutive repeating segment '${segments[i]}'`,
        };
      }
    }

    // 8b. Frequency of duplicate segments: no directory segment should appear >= 2 times in a path
    const segmentCounts = new Map<string, number>();
    for (const seg of segments) {
      const count = (segmentCounts.get(seg) || 0) + 1;
      segmentCounts.set(seg, count);
      if (count >= 2) {
        return {
          allowed: false,
          reason: `Spider trap loop detected: segment '${seg}' repeated ${count} times in path`,
        };
      }
    }

    // 8c. Directory depth sanity limit
    if (segments.length > 8) {
      return {
        allowed: false,
        reason: `Excessive directory nesting depth (${segments.length} segments)`,
      };
    }

    // 8d. Reject static asset file extensions from being followed as navigable HTML pages
    const assetExtensions = [
      '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.avif', '.bmp',
      '.css', '.js', '.mjs', '.map',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.mp4', '.webm', '.mp3', '.wav', '.ogg',
      '.pdf', '.zip', '.tar', '.gz'
    ];
    for (const ext of assetExtensions) {
      if (pathname.endsWith(ext)) {
        return {
          allowed: false,
          reason: `URL target is a static asset '${ext}', not a crawlable page`,
        };
      }
    }

    // 8e. Reject Next.js image optimization and App Router dynamic image routes from page crawl
    if (
      pathname === '/_next/image' ||
      pathname.endsWith('/_next/image') ||
      pathname.endsWith('/opengraph-image') ||
      pathname.endsWith('/twitter-image') ||
      pathname.endsWith('/apple-icon') ||
      pathname.endsWith('/favicon.ico')
    ) {
      return {
        allowed: false,
        reason: 'URL target is a dynamic image endpoint, not a crawlable page',
      };
    }

    return { allowed: true };
  }

  getConfig(): CrawlScopeConfig {
    return { ...this.config };
  }
}
