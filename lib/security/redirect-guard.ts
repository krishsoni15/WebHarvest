/**
 * WebHarvest Redirect Guard
 *
 * Validates redirects before following them to prevent:
 * - Redirect loops
 * - SSRF via redirect (e.g. redirecting to 127.0.0.1 or 169.254.169.254)
 * - Domain policy violations (redirecting outside allowed scope)
 * - Exceeding maximum redirect depth
 */

import { validateURL } from './validate-url';
import { dnsGuard } from './dns-guard';
import { CrawlPolicy } from '../crawler/policy';

export interface RedirectGuardResult {
  allowed: boolean;
  reason?: string;
  targetURL?: string;
}

export interface RedirectGuardOptions {
  maxRedirects?: number;
  policy?: CrawlPolicy;
  checkDNS?: boolean;
}

export class RedirectGuard {
  private maxRedirects: number;
  private policy?: CrawlPolicy;
  private checkDNS: boolean;

  constructor(options: RedirectGuardOptions = {}) {
    this.maxRedirects = options.maxRedirects ?? 10;
    this.policy = options.policy;
    this.checkDNS = options.checkDNS ?? true;
  }

  /**
   * Validate a redirect before following.
   *
   * @param from - Current URL
   * @param to - Redirect destination
   * @param chain - Preceding URLs in this redirect sequence
   */
  async validate(
    from: string,
    to: string,
    chain: string[] = []
  ): Promise<RedirectGuardResult> {
    // 1. Resolve relative URLs against 'from'
    let resolvedURL: string;
    try {
      resolvedURL = new URL(to, from).href;
    } catch {
      return { allowed: false, reason: `Invalid redirect URL: ${to}` };
    }

    // 2. Max redirects limit
    if (chain.length >= this.maxRedirects) {
      return {
        allowed: false,
        reason: `Exceeded maximum redirect depth of ${this.maxRedirects}`,
      };
    }

    // 3. Loop detection
    if (chain.includes(resolvedURL) || resolvedURL === from) {
      return {
        allowed: false,
        reason: `Redirect loop detected targeting ${resolvedURL}`,
      };
    }

    // 4. Basic URL validation (protocols, length, formatting)
    const urlCheck = validateURL(resolvedURL);
    if (!urlCheck.valid) {
      return {
        allowed: false,
        reason: `Disallowed protocol or format: ${urlCheck.reason}`,
      };
    }

    // 5. Domain policy check (if supplied)
    if (this.policy) {
      const hostname = new URL(resolvedURL).hostname;
      if (!this.policy.isAllowedHost(hostname)) {
        return {
          allowed: false,
          reason: `Redirected to host '${hostname}' outside domain crawl policy`,
        };
      }
    }

    // 6. SSRF / DNS check on the target hostname
    if (this.checkDNS) {
      const hostname = new URL(resolvedURL).hostname;
      const dnsCheck = await dnsGuard(hostname);
      if (!dnsCheck.allowed) {
        return {
          allowed: false,
          reason: `SSRF Block on redirect: ${dnsCheck.reason}`,
        };
      }
    }

    return {
      allowed: true,
      targetURL: resolvedURL,
    };
  }
}
