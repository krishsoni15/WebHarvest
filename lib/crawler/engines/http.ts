/**
 * WebHarvest HTTP Crawler Engine
 *
 * Fast, lightweight HTTP request engine for static assets and SSR HTML pages.
 * Enforces concurrency boundaries, DNS security, redirect guards, and retries.
 */

import { ConcurrencyController } from '../concurrency';
import { fetchWithRetry, FetchResult } from '../retry';
import { RedirectGuard } from '../../security/redirect-guard';
import { CrawlPolicy } from '../policy';
import { CrawlLimits } from '../limits';
import { StreamSizeGuard, checkHeaderContentLength } from '../../security/content-limit';

export interface HttpEngineConfig {
  userAgent?: string;
  timeoutMs?: number;
  limits: CrawlLimits;
  policy: CrawlPolicy;
}

export interface HttpResponseResult {
  url: string;
  status: number;
  contentType: string;
  buffer: Buffer;
  headers: Record<string, string>;
  redirectChain: string[];
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const FALLBACK_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
];

export class HttpCrawler {
  private userAgent: string;
  private timeoutMs: number;
  private redirectGuard: RedirectGuard;

  constructor(
    private config: HttpEngineConfig,
    private concurrency: ConcurrencyController
  ) {
    this.userAgent = config.userAgent || DEFAULT_USER_AGENT;
    this.timeoutMs = config.timeoutMs || 25000;
    this.redirectGuard = new RedirectGuard({
      maxRedirects: config.limits.maxRedirects,
      policy: config.policy,
      checkDNS: true,
    });
  }

  /**
   * Fetch a resource via HTTP with full security, redirects, and retry handling.
   */
  async fetchResource(
    targetUrl: string,
    currentTotalBytes: number = 0,
    discoveredFrom?: string,
    signal?: AbortSignal
  ): Promise<HttpResponseResult> {
    const urlObj = new URL(targetUrl);
    const hostname = urlObj.hostname;

    // Acquire concurrency slot for this host
    const release = await this.concurrency.acquire(hostname, 'http');

    try {
      const redirectChain: string[] = [];
      let currentUrl = targetUrl;
      let finalResult: FetchResult | null = null;

      // Handle manual redirects with RedirectGuard
      for (let redirectCount = 0; redirectCount <= this.config.limits.maxRedirects; redirectCount++) {
        let fetchResult = await fetchWithRetry(
          currentUrl,
          {
            headers: {
              'User-Agent': this.userAgent,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Sec-Fetch-User': '?1',
              'Upgrade-Insecure-Requests': '1',
              ...(discoveredFrom ? { Referer: discoveredFrom } : {}),
            },
            signal,
            redirect: 'manual', // Intercept each redirect for security
          },
          {
            maxRetries: 3,
            baseDelayMs: 500,
            maxDelayMs: 4000,
            timeoutMs: this.timeoutMs,
          }
        );

        // Redirect check (301, 302, 303, 307, 308)
        if (fetchResult.status >= 300 && fetchResult.status < 400) {
          const location = fetchResult.headers['location'];
          if (!location) {
            throw new Error(`Received redirect status ${fetchResult.status} without Location header`);
          }

          redirectChain.push(currentUrl);
          const guardDecision = await this.redirectGuard.validate(currentUrl, location, redirectChain);
          if (!guardDecision.allowed || !guardDecision.targetURL) {
            throw new Error(`Redirect blocked: ${guardDecision.reason}`);
          }

          currentUrl = guardDecision.targetURL;
          continue;
        }

        // Anti-bot / 403 forbidden fallback: rotate user agent
        if (fetchResult.status === 403) {
          for (const fallbackUa of FALLBACK_USER_AGENTS) {
            const retryRes = await fetchWithRetry(
              currentUrl,
              {
                headers: {
                  'User-Agent': fallbackUa,
                  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                  ...(discoveredFrom ? { Referer: discoveredFrom } : {}),
                },
                signal,
                redirect: 'manual',
              },
              { maxRetries: 1, timeoutMs: this.timeoutMs }
            );
            if (retryRes.status >= 200 && retryRes.status < 400) {
              fetchResult = retryRes;
              this.userAgent = fallbackUa;
              break;
            }
          }
        }

        finalResult = fetchResult;
        break;
      }

      if (!finalResult || !finalResult.body) {
        throw new Error(finalResult?.error || `Failed to fetch ${currentUrl} (Status ${finalResult?.status ?? 0})`);
      }

      // Check Content-Length header against limits
      const contentLengthHeader = finalResult.headers['content-length'];
      const sizeCheck = checkHeaderContentLength(
        contentLengthHeader,
        this.config.limits,
        currentTotalBytes
      );
      if (!sizeCheck.allowed) {
        throw new Error(sizeCheck.reason);
      }

      // Check size guard
      const sizeGuard = new StreamSizeGuard(
        this.config.limits.maxFileSize,
        this.config.limits.maxBytes,
        currentTotalBytes
      );
      sizeGuard.trackChunk(finalResult.body.length);

      return {
        url: currentUrl,
        status: finalResult.status,
        contentType: finalResult.contentType || 'application/octet-stream',
        buffer: finalResult.body,
        headers: finalResult.headers,
        redirectChain,
      };
    } finally {
      release();
    }
  }
}
