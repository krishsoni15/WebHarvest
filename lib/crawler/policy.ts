/**
 * WebHarvest Domain Crawl Policy
 *
 * Controls which URLs the crawler is allowed to crawl (follow links)
 * versus only download (fetch assets), based on domain boundaries.
 */

import { extractHostname } from './normalize';

/** Domain scope policy levels */
export type DomainPolicy =
  | 'same-origin'            // Only exact origin match (scheme + host + port)
  | 'same-hostname'          // Same hostname, any scheme
  | 'include-subdomains'     // Hostname + *.hostname
  | 'allow-external-assets'; // Crawl same-hostname, but download assets from any domain

/**
 * Controls domain-boundary enforcement for the crawler.
 */
export class CrawlPolicy {
  private sourceOrigin: string;
  private sourceHostname: string;
  private sourceBaseDomain: string;
  private policy: DomainPolicy;
  private additionalAllowed: Set<string> = new Set();

  constructor(sourceURL: string, policy: DomainPolicy = 'include-subdomains') {
    let parsed: URL;
    try {
      parsed = new URL(sourceURL);
    } catch {
      parsed = new URL('https://example.com');
    }

    this.sourceOrigin = parsed.origin;
    this.sourceHostname = parsed.hostname.toLowerCase();
    this.sourceBaseDomain = this.getBaseDomain(this.sourceHostname);
    this.policy = policy;
  }

  /**
   * Add extra hostnames that should be treated as allowed.
   * Useful for known CDN subdomains (e.g., cdn.example.com, static.example.com).
   */
  allowHost(hostname: string): void {
    this.additionalAllowed.add(hostname.toLowerCase());
  }

  /**
   * Should the crawler follow links on this URL? (deep crawl)
   * Only pages on the "home" domain should be link-followed.
   */
  shouldCrawl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      switch (this.policy) {
        case 'same-origin':
          return parsed.origin === this.sourceOrigin;

        case 'same-hostname':
          return hostname === this.sourceHostname || hostname === `www.${this.sourceHostname}` || `www.${hostname}` === this.sourceHostname;

        case 'include-subdomains':
        case 'allow-external-assets':
          return this.isSameOrSubdomain(hostname);

        default:
          return hostname === this.sourceHostname;
      }
    } catch {
      return false;
    }
  }

  /**
   * Should the crawler download this resource? (assets like CSS, images, fonts)
   * More permissive than shouldCrawl — allows CDN and cross-origin assets.
   */
  shouldDownload(url: string): boolean {
    if (this.policy === 'allow-external-assets') {
      // Download anything — the policy explicitly allows external assets
      return this.isAllowedScheme(url);
    }

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Always allow same-domain
      if (this.isSameOrSubdomain(hostname)) return true;

      // Allow explicitly added hosts
      if (this.additionalAllowed.has(hostname)) return true;

      // Allow common CDN/asset domains
      if (this.isCommonCDN(hostname)) return true;

      // Allow Google Fonts (extremely common)
      if (hostname.includes('googleapis.com') || hostname.includes('gstatic.com')) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a hostname is within the allowed domain boundary.
   */
  isAllowedHost(hostname: string): boolean {
    const lower = hostname.toLowerCase();
    if (this.isSameOrSubdomain(lower)) return true;
    if (this.additionalAllowed.has(lower)) return true;
    return false;
  }

  /**
   * Get the source hostname.
   */
  getSourceHostname(): string {
    return this.sourceHostname;
  }

  /**
   * Get the domain policy.
   */
  getPolicy(): DomainPolicy {
    return this.policy;
  }

  /** Check if hostname is the source or a subdomain of it */
  private isSameOrSubdomain(hostname: string): boolean {
    if (hostname === this.sourceHostname) return true;
    // Handle www variants
    if (hostname === `www.${this.sourceHostname}`) return true;
    if (`www.${hostname}` === this.sourceHostname) return true;
    // Subdomain check
    if (hostname.endsWith(`.${this.sourceBaseDomain}`)) return true;
    return false;
  }

  /** Extract base domain (e.g., "sub.example.com" → "example.com") */
  private getBaseDomain(hostname: string): string {
    const parts = hostname.replace(/^www\./, '').split('.');
    if (parts.length <= 2) return hostname.replace(/^www\./, '');
    // Simple heuristic: last two parts for .com/.org/.net, last three for .co.uk etc.
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    if (['co', 'com', 'org', 'net', 'ac', 'gov'].includes(sld)) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  }

  /** Check if URL has an allowed scheme */
  private isAllowedScheme(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /** Check if hostname is a common CDN */
  private isCommonCDN(hostname: string): boolean {
    const cdnPatterns = [
      'cloudflare.com', 'cloudfront.net', 'amazonaws.com',
      'akamaized.net', 'akamai.net', 'fastly.net',
      'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
      'stackpath.com', 'bootstrapcdn.com',
      'wp.com', 'gravatar.com',
    ];
    return cdnPatterns.some(cdn => hostname.includes(cdn));
  }
}
