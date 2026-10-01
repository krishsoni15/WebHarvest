/**
 * WebHarvest In-Process Job Execution Queue
 *
 * Coordinates execution of background crawl jobs with worker limits.
 * Handles job concurrency, cancellation signals, authenticated crawl dispatch,
 * manifest generation with security sanitization, and analysis persistence.
 */

import { EventEmitter } from 'events';
import { CrawlEngine, EngineMode, CrawlEngineProgress } from '../crawler/engine';
import { CrawlScopeConfig } from '../crawler/scope';
import { CaptureRules } from '../crawler/presets';
import { CrawlLimits } from '../crawler/limits';
import { updateJobStatus, updateJobProgress, completeJob, failJob } from '../db/client';
import { createManifest } from './manifest';
import { detectTechnology } from '../analysis/technology';
import { calculateMirrorHealth } from '../analysis/health';
import { sanitizeManifestAuth } from '../auth/session';
import { classifyResource } from '../processor/classify';
import path from 'path';
import fs from 'fs/promises';

export interface EnqueueJobOptions {
  id: string;
  url: string;
  mode: EngineMode;
  outputDir: string;
  scopeConfig?: Partial<CrawlScopeConfig>;
  captureRules?: Partial<CaptureRules>;
  limits?: Partial<CrawlLimits>;
  storageState?: any;
}

export class BackgroundJobQueue extends EventEmitter {
  private queue: EnqueueJobOptions[] = [];
  private activeJobs = new Map<string, CrawlEngine>();
  private maxConcurrentJobs = 2;
  private isProcessing = false;

  constructor() {
    super();
  }

  /**
   * Enqueue a new crawl job.
   */
  enqueue(job: EnqueueJobOptions): void {
    this.queue.push(job);
    this.emit('job:enqueued', { jobId: job.id, url: job.url });
    this.processNext();
  }

  /**
   * Cancel an active or queued job.
   */
  cancel(jobId: string): boolean {
    // 1. Remove from waiting queue if not yet started
    const queueIndex = this.queue.findIndex((j) => j.id === jobId);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      updateJobStatus(jobId, 'cancelled');
      this.emit('job:cancelled', { jobId });
      return true;
    }

    // 2. Signal running engine
    const activeEngine = this.activeJobs.get(jobId);
    if (activeEngine) {
      activeEngine.cancel();
      updateJobStatus(jobId, 'cancelled');
      this.emit('job:cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Check if a job is currently actively crawling
   */
  isRunning(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  /**
   * Internal queue processing loop
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeJobs.size < this.maxConcurrentJobs && this.queue.length > 0) {
        const nextJob = this.queue.shift();
        if (!nextJob) break;

        // Launch job asynchronously
        this.runJob(nextJob).catch((err) => {
          console.error(`Unhandled error running job ${nextJob.id}:`, err);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single crawl job
   */
  private async runJob(job: EnqueueJobOptions): Promise<void> {
    const startedAt = Date.now();
    updateJobStatus(job.id, 'crawling');

    const engine = new CrawlEngine({
      seedUrl: job.url,
      outputDir: job.outputDir,
      mode: job.mode,
      scopeConfig: job.scopeConfig,
      captureRules: job.captureRules,
      limits: job.limits,
      storageState: job.storageState,
      onProgress: (prog: CrawlEngineProgress) => {
        updateJobProgress(job.id, {
          pages_downloaded: prog.pagesDownloaded,
          assets_downloaded: prog.assetsDownloaded,
          bytes_downloaded: prog.bytesDownloaded,
          errors_count: prog.errorsCount,
        });

        this.emit(`progress:${job.id}`, prog);
      },
      onLog: async (msg, level) => {
        this.emit(`log:${job.id}`, { message: msg, level, timestamp: Date.now() });
        const logLine = `[${new Date().toISOString()}] [${(level || 'info').toUpperCase()}] ${msg}\n`;
        try {
          const logDir = path.join(job.outputDir, 'logs');
          await fs.mkdir(logDir, { recursive: true });
          await fs.appendFile(path.join(logDir, 'crawl.log'), logLine);
          await fs.appendFile(path.join(job.outputDir, 'crawl_logs.txt'), logLine);
          if (level === 'error' || level === 'warn') {
            await fs.appendFile(path.join(logDir, 'errors.log'), logLine);
          }
        } catch {}
      },
    });

    this.activeJobs.set(job.id, engine);

    try {
      const result = await engine.run();
      const completedAt = Date.now();

      if (result.status === 'cancelled') {
        updateJobStatus(job.id, 'cancelled');
        this.emit(`completed:${job.id}`, { status: 'cancelled' });
      } else if (result.status === 'failed') {
        failJob(job.id, result.error || 'Unknown crawler failure');
        this.emit(`completed:${job.id}`, { status: 'failed', error: result.error });
      } else {
        // Successful completion: generate manifest & intelligence
        let htmlSample = '';
        try {
          const indexPath = path.join(job.outputDir, 'index.html');
          htmlSample = await fs.readFile(indexPath, 'utf-8');
        } catch {
          // ignore if no index.html
        }

        const tech = detectTechnology(htmlSample);
        const health = calculateMirrorHealth({
          pagesFound: result.counters.pagesFound,
          pagesCaptured: result.counters.pagesDownloaded,
          assetsFound: result.counters.assetsFound,
          assetsCaptured: result.counters.assetsDownloaded,
          errorsCount: result.counters.errorsCount,
        });

        // Ensure analysis directory exists
        const analysisDir = path.join(job.outputDir, 'analysis');
        await fs.mkdir(analysisDir, { recursive: true }).catch(() => {});
        await fs.writeFile(path.join(analysisDir, 'technology.json'), JSON.stringify(tech, null, 2)).catch(() => {});
        await fs.writeFile(path.join(analysisDir, 'health.json'), JSON.stringify(health, null, 2)).catch(() => {});

        const manifest = createManifest({
          jobId: job.id,
          sourceUrl: job.url,
          startedAt,
          completedAt,
          status: 'completed',
          crawlerMode: job.mode,
          stats: {
            pagesDownloaded: result.counters.pagesDownloaded,
            assetsDownloaded: result.counters.assetsDownloaded,
            totalBytes: result.counters.bytesDownloaded,
            errorsCount: result.counters.errorsCount,
          },
          resources: Array.from(result.urlToLocalMap.entries()).map(([u, p]) => {
            const cl = classifyResource(u);
            return {
              url: u,
              localPath: p,
              type: cl.type,
              status: 200,
              size: 0,
              contentType: '',
              sha256: '',
            };
          }),
          technology: tech,
          health,
          screenshots: result.screenshots,
          apiCatalog: result.apiCatalog,
          auth: sanitizeManifestAuth(job.storageState ? { authType: 'playwright_storage_state' } : undefined),
        });

        // Save manifest to disk alongside mirror
        try {
          await fs.writeFile(
            path.join(job.outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
          );
        } catch {
          // ignore
        }

        completeJob(job.id, manifest);
        this.emit(`completed:${job.id}`, { status: 'completed', manifest });
      }
    } catch (err: any) {
      failJob(job.id, err.message);
      this.emit(`completed:${job.id}`, { status: 'failed', error: err.message });
    } finally {
      this.activeJobs.delete(job.id);
      // Process next waiting job
      this.processNext();
    }
  }
}

// Global Singleton Queue Instance across hot-reloads
const globalForQueue = globalThis as unknown as { jobQueue?: BackgroundJobQueue };
export const jobQueue = globalForQueue.jobQueue ?? new BackgroundJobQueue();
if (process.env.NODE_ENV !== 'production') globalForQueue.jobQueue = jobQueue;
