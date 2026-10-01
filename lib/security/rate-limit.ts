/**
 * WebHarvest API Rate Limiter
 *
 * Sliding window rate limiter for crawl job creation and API abuse protection.
 * Automatically cleans up expired windows to maintain minimal memory footprint.
 */

export interface RateLimitOptions {
  windowMs?: number;    // Time window in milliseconds (default: 1 hour)
  maxRequests?: number; // Max requests allowed per window (default: 20)
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number; // Unix timestamp in ms
  retryAfterSeconds?: number;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private hits: Map<string, number[]> = new Map();
  private lastCleanup: number = Date.now();

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? 60 * 60 * 1000; // 1 hour
    this.maxRequests = options.maxRequests ?? 20;
  }

  /**
   * Check if a request from the given identifier (e.g. client IP) is permitted.
   */
  check(identifier: string): RateLimitStatus {
    this.maybeCleanup();

    const now = Date.now();
    const timestamps = this.hits.get(identifier) || [];
    const windowStart = now - this.windowMs;

    // Filter out timestamps outside the active window
    const activeTimestamps = timestamps.filter((t) => t > windowStart);

    if (activeTimestamps.length >= this.maxRequests) {
      const oldestActive = activeTimestamps[0];
      const resetTime = oldestActive + this.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - activeTimestamps.length,
      resetTime: now + this.windowMs,
    };
  }

  /**
   * Record a consumed token/request for the identifier.
   */
  consume(identifier: string): RateLimitStatus {
    const status = this.check(identifier);
    if (!status.allowed) return status;

    const now = Date.now();
    const timestamps = (this.hits.get(identifier) || []).filter(
      (t) => t > now - this.windowMs
    );
    timestamps.push(now);
    this.hits.set(identifier, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      resetTime: timestamps[0] + this.windowMs,
    };
  }

  /**
   * Periodic eviction of stale keys
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 5 * 60 * 1000) return; // Clean every 5 min

    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
    this.lastCleanup = now;
  }
}

// Global default rate limiter instance
export const defaultRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 30,           // 30 jobs/hour per IP
});
