/**
 * WebHarvest Redirect Tracker
 *
 * Tracks redirect chains to prevent infinite loops, SSRF via redirect,
 * and off-domain redirects when policy restricts it.
 */

export interface RedirectDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Tracks and validates redirect chains per URL.
 */
export class RedirectTracker {
  private chains: Map<string, string[]> = new Map();
  private maxChainLength: number;

  constructor(maxRedirects: number = 10) {
    this.maxChainLength = maxRedirects;
  }

  /**
   * Record and validate a redirect hop.
   *
   * @param from - The URL that issued the redirect
   * @param to   - The URL being redirected to
   * @returns    - Decision on whether to follow this redirect
   */
  follow(from: string, to: string): RedirectDecision {
    // Get or create the chain for the original URL
    const originKey = this.findOrigin(from) || from;
    const chain = this.chains.get(originKey) || [from];

    // Check chain length
    if (chain.length >= this.maxChainLength) {
      return {
        allowed: false,
        reason: `Redirect chain too long (${chain.length}/${this.maxChainLength})`,
      };
    }

    // Check for redirect loops
    if (chain.includes(to)) {
      return {
        allowed: false,
        reason: `Redirect loop detected: ${to} already in chain`,
      };
    }

    // Record the hop
    chain.push(to);
    this.chains.set(originKey, chain);
    // Also map the new URL back to the origin
    this.chains.set(to, chain);

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Get the complete redirect chain for a URL.
   */
  getChain(url: string): string[] {
    return this.chains.get(url) || [url];
  }

  /**
   * Get the final URL in a redirect chain.
   */
  getFinalURL(url: string): string {
    const chain = this.chains.get(url);
    if (!chain || chain.length === 0) return url;
    return chain[chain.length - 1];
  }

  /**
   * Check how many redirects have occurred for a URL.
   */
  redirectCount(url: string): number {
    const chain = this.chains.get(url);
    return chain ? chain.length - 1 : 0;
  }

  /**
   * Clear all tracked chains.
   */
  clear(): void {
    this.chains.clear();
  }

  /** Find the original URL in a redirect chain */
  private findOrigin(url: string): string | null {
    for (const [key, chain] of this.chains) {
      if (chain.includes(url) && chain[0] === key) {
        return key;
      }
    }
    return null;
  }
}
