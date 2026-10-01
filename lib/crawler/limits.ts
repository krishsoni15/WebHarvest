/**
 * WebHarvest Crawl Limits Enforcer
 *
 * Tracks resource consumption and enforces configurable limits to
 * prevent runaway crawls from consuming excessive resources.
 */

/** Configurable crawl limits */
export interface CrawlLimits {
  /** Maximum number of pages to crawl */
  maxPages: number;
  /** Maximum crawl depth from the seed URL */
  maxDepth: number;
  /** Maximum number of assets to download */
  maxAssets: number;
  /** Maximum total bytes to download */
  maxBytes: number;
  /** Maximum size of a single file in bytes */
  maxFileSize: number;
  /** Maximum crawl duration in milliseconds */
  maxDuration: number;
  /** Maximum number of redirects to follow per request */
  maxRedirects: number;
  /** Maximum total errors before aborting */
  maxErrors: number;
}

/** Default limits for a standard crawl */
export const DEFAULT_LIMITS: CrawlLimits = {
  maxPages: 2000,
  maxDepth: 8,
  maxAssets: 5000,
  maxBytes: 500 * 1024 * 1024,    // 500 MB
  maxFileSize: 25 * 1024 * 1024,  // 25 MB per file
  maxDuration: 20 * 60 * 1000,    // 20 minutes
  maxRedirects: 15,
  maxErrors: 200,
};

/** Preset limit configurations for different crawl modes */
export const LIMIT_PRESETS: Record<string, Partial<CrawlLimits>> = {
  fast: {
    maxPages: 500,
    maxDepth: 4,
    maxAssets: 1500,
    maxBytes: 200 * 1024 * 1024,
    maxDuration: 5 * 60 * 1000,
  },
  balanced: {
    maxPages: 2000,
    maxDepth: 8,
    maxAssets: 5000,
    maxBytes: 500 * 1024 * 1024,
    maxDuration: 20 * 60 * 1000,
  },
  deep: {
    maxPages: 10000,
    maxDepth: 12,
    maxAssets: 25000,
    maxBytes: 1024 * 1024 * 1024,
    maxDuration: 45 * 60 * 1000,
  },
  unlimited: {
    maxPages: 100000,
    maxDepth: 20,
    maxAssets: 500000,
    maxBytes: 5 * 1024 * 1024 * 1024,  // 5 GB
    maxDuration: 120 * 60 * 1000,       // 2 hours
  },
};

/** Running counters for the current crawl */
export interface CrawlCounters {
  pages: number;
  assets: number;
  bytes: number;
  errors: number;
  currentDepth: number;
  startTime: number;
  pagesFound: number;
  pagesDownloaded: number;
  assetsFound: number;
  assetsDownloaded: number;
  bytesDownloaded: number;
  errorsCount: number;
  maxDepth: number;
}

/** Result of a limit check */
export interface LimitStatus {
  exceeded: boolean;
  reasons: string[];
  counters: CrawlCounters;
  progress: number; // 0-1, estimated overall progress
}

/**
 * Enforces crawl limits and tracks resource consumption.
 */
export class LimitEnforcer {
  private limits: CrawlLimits;
  private counters: CrawlCounters;

  constructor(limits?: Partial<CrawlLimits>) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.counters = {
      pages: 0,
      assets: 0,
      bytes: 0,
      errors: 0,
      currentDepth: 0,
      startTime: Date.now(),
      pagesFound: 0,
      pagesDownloaded: 0,
      assetsFound: 0,
      assetsDownloaded: 0,
      bytesDownloaded: 0,
      errorsCount: 0,
      maxDepth: this.limits.maxDepth,
    };
  }

  /** Record a page download */
  addPage(bytes: number = 0): void {
    this.counters.pages++;
    this.counters.pagesFound++;
    this.counters.pagesDownloaded++;
    this.counters.bytes += bytes;
    this.counters.bytesDownloaded += bytes;
  }

  recordPage(bytes: number = 0): void {
    this.addPage(bytes);
  }

  /** Record an asset download */
  addAsset(bytes: number = 0): void {
    this.counters.assets++;
    this.counters.assetsFound++;
    this.counters.assetsDownloaded++;
    this.counters.bytes += bytes;
    this.counters.bytesDownloaded += bytes;
  }

  recordAsset(bytes: number = 0): void {
    this.addAsset(bytes);
  }

  /** Record an error */
  addError(): void {
    this.counters.errors++;
    this.counters.errorsCount++;
  }

  recordError(): void {
    this.addError();
  }

  /** Update current depth */
  setDepth(depth: number): void {
    this.counters.currentDepth = Math.max(this.counters.currentDepth, depth);
  }

  /** Check if a file should be downloaded based on size */
  isFileTooLarge(contentLength: number): boolean {
    return contentLength > this.limits.maxFileSize;
  }

  /** Check if a depth level should be crawled */
  isDepthAllowed(depth: number): boolean {
    return depth <= this.limits.maxDepth;
  }

  /**
   * Check all limits. Returns status with exceeded flag and reasons.
   */
  check(): LimitStatus {
    const reasons: string[] = [];
    const elapsed = Date.now() - this.counters.startTime;

    if (this.counters.pages >= this.limits.maxPages) {
      reasons.push(`Page limit reached (${this.counters.pages}/${this.limits.maxPages})`);
    }
    if (this.counters.assets >= this.limits.maxAssets) {
      reasons.push(`Asset limit reached (${this.counters.assets}/${this.limits.maxAssets})`);
    }
    if (this.counters.bytes >= this.limits.maxBytes) {
      reasons.push(`Size limit reached (${formatBytes(this.counters.bytes)}/${formatBytes(this.limits.maxBytes)})`);
    }
    if (elapsed >= this.limits.maxDuration) {
      reasons.push(`Duration limit reached (${Math.round(elapsed / 1000)}s/${Math.round(this.limits.maxDuration / 1000)}s)`);
    }
    if (this.counters.errors >= this.limits.maxErrors) {
      reasons.push(`Error limit reached (${this.counters.errors}/${this.limits.maxErrors})`);
    }

    // Estimate progress as the maximum ratio across all tracked dimensions
    const progress = Math.max(
      this.counters.pages / this.limits.maxPages,
      this.counters.assets / this.limits.maxAssets,
      this.counters.bytes / this.limits.maxBytes,
      elapsed / this.limits.maxDuration,
    );

    return {
      exceeded: reasons.length > 0,
      reasons,
      counters: { ...this.counters },
      progress: Math.min(progress, 1),
    };
  }

  /**
   * Quick check — should the crawl stop?
   */
  shouldStop(): boolean {
    return this.check().exceeded;
  }

  /**
   * Get current counters snapshot.
   */
  getCounters(): CrawlCounters {
    return { ...this.counters };
  }

  /**
   * Get configured limits.
   */
  getLimits(): CrawlLimits {
    return { ...this.limits };
  }

  /**
   * Generate a human-readable report of current usage vs limits.
   */
  report(): string {
    const elapsed = Date.now() - this.counters.startTime;
    const lines = [
      `Pages:    ${this.counters.pages} / ${this.limits.maxPages}`,
      `Assets:   ${this.counters.assets} / ${this.limits.maxAssets}`,
      `Size:     ${formatBytes(this.counters.bytes)} / ${formatBytes(this.limits.maxBytes)}`,
      `Duration: ${Math.round(elapsed / 1000)}s / ${Math.round(this.limits.maxDuration / 1000)}s`,
      `Errors:   ${this.counters.errors} / ${this.limits.maxErrors}`,
      `Depth:    ${this.counters.currentDepth} / ${this.limits.maxDepth}`,
    ];
    return lines.join('\n');
  }
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
