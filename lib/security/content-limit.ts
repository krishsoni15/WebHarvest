/**
 * WebHarvest Content Limit Security Guard
 *
 * Enforces per-file and job-wide payload restrictions.
 * Inspects Content-Length headers early and provides chunk-by-chunk
 * streaming counters that abort when thresholds are exceeded.
 */

import { CrawlLimits } from '../crawler/limits';

export interface ContentLimitCheckResult {
  allowed: boolean;
  reason?: string;
  expectedSize?: number;
}

/**
 * Check if a response's Content-Length header is within safe parameters.
 */
export function checkHeaderContentLength(
  contentLengthHeader: string | null | undefined,
  limits: CrawlLimits,
  currentTotalBytes: number
): ContentLimitCheckResult {
  if (!contentLengthHeader) {
    return { allowed: true };
  }

  const length = parseInt(contentLengthHeader, 10);
  if (isNaN(length) || length < 0) {
    return { allowed: true };
  }

  // 1. Single file size limit
  if (length > limits.maxFileSize) {
    return {
      allowed: false,
      reason: `File size (${(length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed single file size (${(limits.maxFileSize / (1024 * 1024)).toFixed(1)}MB)`,
      expectedSize: length,
    };
  }

  // 2. Cumulative bytes limit
  if (currentTotalBytes + length > limits.maxBytes) {
    return {
      allowed: false,
      reason: `Downloading this resource would exceed the total crawl byte quota (${(limits.maxBytes / (1024 * 1024)).toFixed(1)}MB)`,
      expectedSize: length,
    };
  }

  return { allowed: true, expectedSize: length };
}

/**
 * Creates a stream byte-counter and abort guard for readable streams.
 */
export class StreamSizeGuard {
  private bytesRead = 0;

  constructor(
    private maxFileSize: number,
    private maxTotalBytes: number,
    private initialTotalBytes: number,
    private onLimitExceeded?: (reason: string) => void
  ) {}

  /**
   * Process a chunk and ensure limits have not been violated.
   * Throws an Error if limits are exceeded.
   */
  trackChunk(chunkSize: number): void {
    this.bytesRead += chunkSize;

    if (this.bytesRead > this.maxFileSize) {
      const msg = `Payload exceeded single file limit of ${(this.maxFileSize / (1024 * 1024)).toFixed(1)}MB`;
      this.onLimitExceeded?.(msg);
      throw new Error(msg);
    }

    if (this.initialTotalBytes + this.bytesRead > this.maxTotalBytes) {
      const msg = `Payload exceeded total crawl limit of ${(this.maxTotalBytes / (1024 * 1024)).toFixed(1)}MB`;
      this.onLimitExceeded?.(msg);
      throw new Error(msg);
    }
  }

  getBytesRead(): number {
    return this.bytesRead;
  }
}
