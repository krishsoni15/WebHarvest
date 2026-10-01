/**
 * WebHarvest Concurrency Controller
 *
 * Manages parallel request limits with global, per-host, and per-engine caps.
 * Prevents overwhelming target servers while maximizing throughput.
 */

export interface ConcurrencyConfig {
  /** Maximum total concurrent requests across all hosts */
  globalMax: number;
  /** Maximum concurrent requests per individual host */
  perHostMax: number;
  /** Maximum concurrent browser (Playwright) instances */
  browserMax: number;
}

/** Default concurrency configuration */
export const DEFAULT_CONCURRENCY: ConcurrencyConfig = {
  globalMax: 20,
  perHostMax: 4,
  browserMax: 2,
};

/**
 * Controls concurrent access to resources with multiple limit dimensions.
 * Implements a semaphore pattern with per-host tracking.
 */
export class ConcurrencyController {
  private config: ConcurrencyConfig;
  private globalActive = 0;
  private hostActive: Map<string, number> = new Map();
  private browserActive = 0;
  private waitQueue: Array<{
    hostname: string;
    type: 'http' | 'browser';
    resolve: (release: () => void) => void;
  }> = [];

  constructor(config?: Partial<ConcurrencyConfig>) {
    this.config = { ...DEFAULT_CONCURRENCY, ...config };
  }

  /**
   * Acquire a slot for making a request.
   * Resolves with a release function when a slot becomes available.
   * The release function MUST be called when the request completes.
   */
  async acquire(hostname: string, type: 'http' | 'browser' = 'http'): Promise<() => void> {
    if (this.canAcquire(hostname, type)) {
      return this.doAcquire(hostname, type);
    }

    // Wait in queue until a slot opens up
    return new Promise<() => void>((resolve) => {
      this.waitQueue.push({ hostname, type, resolve });
    });
  }

  /**
   * Try to acquire a slot without waiting. Returns null if no slot available.
   */
  tryAcquire(hostname: string, type: 'http' | 'browser' = 'http'): (() => void) | null {
    if (this.canAcquire(hostname, type)) {
      return this.doAcquire(hostname, type);
    }
    return null;
  }

  /**
   * Get current concurrency statistics.
   */
  getStats(): {
    globalActive: number;
    globalMax: number;
    browserActive: number;
    browserMax: number;
    waiting: number;
    byHost: Record<string, number>;
  } {
    return {
      globalActive: this.globalActive,
      globalMax: this.config.globalMax,
      browserActive: this.browserActive,
      browserMax: this.config.browserMax,
      waiting: this.waitQueue.length,
      byHost: Object.fromEntries(this.hostActive),
    };
  }

  /**
   * Check if any slots are available.
   */
  hasCapacity(hostname: string, type: 'http' | 'browser' = 'http'): boolean {
    return this.canAcquire(hostname, type);
  }

  /**
   * Update concurrency limits at runtime.
   */
  updateConfig(config: Partial<ConcurrencyConfig>): void {
    this.config = { ...this.config, ...config };
    this.processWaitQueue();
  }

  /** Check if a slot can be acquired right now */
  private canAcquire(hostname: string, type: 'http' | 'browser'): boolean {
    if (this.globalActive >= this.config.globalMax) return false;
    if (type === 'browser' && this.browserActive >= this.config.browserMax) return false;

    const hostCount = this.hostActive.get(hostname) ?? 0;
    if (hostCount >= this.config.perHostMax) return false;

    return true;
  }

  /** Actually acquire a slot and return the release function */
  private doAcquire(hostname: string, type: 'http' | 'browser'): () => void {
    this.globalActive++;
    this.hostActive.set(hostname, (this.hostActive.get(hostname) ?? 0) + 1);
    if (type === 'browser') this.browserActive++;

    let released = false;
    return () => {
      if (released) return; // Prevent double-release
      released = true;
      this.globalActive--;
      const count = (this.hostActive.get(hostname) ?? 1) - 1;
      if (count <= 0) {
        this.hostActive.delete(hostname);
      } else {
        this.hostActive.set(hostname, count);
      }
      if (type === 'browser') this.browserActive--;

      // Wake up waiting requests
      this.processWaitQueue();
    };
  }

  /** Process the wait queue, granting slots to waiting requests */
  private processWaitQueue(): void {
    let i = 0;
    while (i < this.waitQueue.length) {
      const waiter = this.waitQueue[i];
      if (this.canAcquire(waiter.hostname, waiter.type)) {
        this.waitQueue.splice(i, 1);
        const release = this.doAcquire(waiter.hostname, waiter.type);
        waiter.resolve(release);
      } else {
        i++;
      }
    }
  }
}
