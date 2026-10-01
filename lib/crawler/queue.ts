/**
 * WebHarvest Priority Crawl Queue
 *
 * Manages URL scheduling with priority ordering, depth tracking,
 * and duplicate prevention via canonical keys.
 */

import { canonicalKey } from './normalize';

/** Resource type classification for queue items */
export type ResourceType =
  | 'page'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'video'
  | 'audio'
  | 'document'
  | 'manifest'
  | 'sitemap'
  | 'data'
  | 'api'
  | 'analytics'
  | 'third-party'
  | 'unknown';

/** A single item in the crawl queue */
export interface QueueItem {
  url: string;
  canonical: string;
  canonicalKey?: string;
  depth: number;
  priority: number;
  type: ResourceType;
  discoveredFrom: string;
  retries: number;
  maxRetries: number;
  addedAt: number;
}

/** Default priorities by resource type */
const DEFAULT_PRIORITY: Record<ResourceType, number> = {
  page: 80,
  stylesheet: 90,
  script: 85,
  image: 60,
  font: 70,
  video: 40,
  audio: 40,
  document: 50,
  manifest: 95,
  sitemap: 98,
  data: 30,
  api: 20,
  analytics: 5,
  'third-party': 10,
  unknown: 50,
};

/**
 * Priority-based crawl queue with deduplication.
 * Items are dequeued highest-priority-first.
 */
export class CrawlQueue {
  private items: QueueItem[] = [];
  private seen: Set<string> = new Set();
  private completedCount = 0;
  private failedCount = 0;

  /**
   * Add an item to the queue. Returns false if already seen (duplicate).
   */
  enqueue(
    item: Omit<QueueItem, 'canonical' | 'addedAt'> & { canonical?: string; canonicalKey?: string }
  ): boolean {
    const key = item.canonical || item.canonicalKey || canonicalKey(item.url);
    if (this.seen.has(key)) return false;

    this.seen.add(key);
    const fullItem: QueueItem = {
      ...item,
      canonical: key,
      canonicalKey: key,
      priority: item.priority ?? DEFAULT_PRIORITY[item.type] ?? 50,
      addedAt: Date.now(),
    };

    // Insert in sorted position (descending priority)
    const idx = this.findInsertIndex(fullItem.priority);
    this.items.splice(idx, 0, fullItem);
    return true;
  }

  /**
   * Seed the queue with a root URL at maximum priority.
   */
  seedRoot(url: string): boolean {
    return this.enqueue({
      url,
      depth: 0,
      priority: 100,
      type: 'page',
      discoveredFrom: '',
      retries: 0,
      maxRetries: 3,
    });
  }

  /**
   * Remove and return the highest-priority item.
   */
  dequeue(): QueueItem | null {
    return this.items.shift() || null;
  }

  /**
   * Peek at the next item without removing it.
   */
  peek(): QueueItem | null {
    return this.items[0] || null;
  }

  /**
   * Check if a URL (canonical key) has been seen.
   */
  has(url: string): boolean {
    return this.seen.has(canonicalKey(url));
  }

  /**
   * Mark an item as completed (for stats tracking).
   */
  markCompleted(): void {
    this.completedCount++;
  }

  /**
   * Mark an item as failed (for stats tracking).
   */
  markFailed(): void {
    this.failedCount++;
  }

  /**
   * Re-enqueue a failed item for retry (bypasses duplicate check).
   */
  requeue(item: QueueItem): void {
    item.retries++;
    item.priority = Math.max(item.priority - 10, 1); // Lower priority on retry
    const idx = this.findInsertIndex(item.priority);
    this.items.splice(idx, 0, item);
  }

  /** Number of items waiting to be processed */
  pending(): number {
    return this.items.length;
  }

  /** Number of unique URLs seen (enqueued) */
  totalSeen(): number {
    return this.seen.size;
  }

  /** Number of items completed */
  completed(): number {
    return this.completedCount;
  }

  /** Number of items failed */
  failed(): number {
    return this.failedCount;
  }

  /** Check if the queue is empty */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Clear the queue */
  clear(): void {
    this.items = [];
    this.seen.clear();
    this.completedCount = 0;
    this.failedCount = 0;
  }

  /** Get snapshot for serialization (e.g. for resume) */
  snapshot(): { pending: QueueItem[]; seen: string[]; completed: number; failed: number } {
    return {
      pending: [...this.items],
      seen: Array.from(this.seen),
      completed: this.completedCount,
      failed: this.failedCount,
    };
  }

  /** Restore queue state from a snapshot (for resume) */
  restore(snapshot: { pending: QueueItem[]; seen: string[]; completed: number; failed: number }): void {
    this.items = [...snapshot.pending];
    this.seen = new Set(snapshot.seen);
    this.completedCount = snapshot.completed;
    this.failedCount = snapshot.failed;
  }

  /**
   * Binary search for insertion index (descending priority order).
   */
  private findInsertIndex(priority: number): number {
    let lo = 0;
    let hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.items[mid].priority >= priority) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
}
