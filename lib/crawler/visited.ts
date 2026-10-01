/**
 * WebHarvest Visited Set — URL + Content Deduplication
 *
 * Tracks visited URLs by canonical key and downloaded content by SHA-256 hash.
 * Prevents re-downloading the same resource and enables content-addressed storage.
 */

import crypto from 'crypto';

/** Information about a previously downloaded resource */
export interface VisitedResource {
  url: string;
  localPath: string;
  sha256: string;
  size: number;
  downloadedAt: number;
}

/**
 * Tracks which URLs have been visited and which content has been downloaded.
 * Enables both URL-level and content-level deduplication.
 */
export class VisitedSet {
  /** Canonical URL → resource info */
  private urls: Map<string, VisitedResource> = new Map();
  /** SHA-256 hash → first local path (content-addressed dedup) */
  private hashes: Map<string, string> = new Map();

  /**
   * Check if a URL has already been visited.
   */
  hasURL(canonical: string): boolean {
    return this.urls.has(canonical);
  }

  /**
   * Record a URL as visited.
   */
  addURL(canonical: string, resource?: Partial<VisitedResource>): void {
    this.urls.set(canonical, {
      url: resource?.url || canonical,
      localPath: resource?.localPath || '',
      sha256: resource?.sha256 || '',
      size: resource?.size || 0,
      downloadedAt: resource?.downloadedAt || Date.now(),
    });
  }

  /**
   * Get the resource info for a previously visited URL.
   */
  getURL(canonical: string): VisitedResource | undefined {
    return this.urls.get(canonical);
  }

  /**
   * Check if content with the given hash has already been downloaded.
   * Returns the existing local path if it has, or null otherwise.
   */
  hasContent(sha256: string): string | null {
    return this.hashes.get(sha256) ?? null;
  }

  /**
   * Record a content hash → local path mapping.
   */
  addContent(sha256: string, localPath: string): void {
    if (!this.hashes.has(sha256)) {
      this.hashes.set(sha256, localPath);
    }
  }

  /** Total number of unique URLs visited */
  urlCount(): number {
    return this.urls.size;
  }

  /** Total number of unique content hashes */
  contentCount(): number {
    return this.hashes.size;
  }

  /** Total bytes downloaded across all unique resources */
  totalBytes(): number {
    let total = 0;
    for (const resource of this.urls.values()) {
      total += resource.size;
    }
    return total;
  }

  /** Get all visited URLs */
  allURLs(): string[] {
    return Array.from(this.urls.keys());
  }

  /** Clear all tracking data */
  clear(): void {
    this.urls.clear();
    this.hashes.clear();
  }

  /** Get snapshot for serialization (resume support) */
  snapshot(): { urls: [string, VisitedResource][]; hashes: [string, string][] } {
    return {
      urls: Array.from(this.urls.entries()),
      hashes: Array.from(this.hashes.entries()),
    };
  }

  /** Restore from snapshot */
  restore(data: { urls: [string, VisitedResource][]; hashes: [string, string][] }): void {
    this.urls = new Map(data.urls);
    this.hashes = new Map(data.hashes);
  }
}

/**
 * Compute SHA-256 hash of a Buffer.
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute SHA-256 hash of a string.
 */
export function hashString(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}
