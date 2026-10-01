/**
 * WebHarvest Job Lifecycle Manager
 *
 * Facade coordinating persistent SQLite storage with the background execution queue,
 * authentication profiles, scope boundaries, and capture rules.
 */

import {
  createJob as dbCreateJob,
  getJob as dbGetJob,
  listJobs as dbListJobs,
  deleteJob as dbDeleteJob,
  getAuthProfile,
  touchAuthProfile,
} from '../db/client';
import { JobRecord, JobStatus } from '../db/schema';
import { jobQueue } from './queue';
import { EngineMode } from '../crawler/engine';
import { CrawlScopeConfig } from '../crawler/scope';
import { CaptureRules } from '../crawler/presets';
import { CrawlLimits } from '../crawler/limits';
import { getSessionStorageState } from '../auth/manual-login';
import fs from 'fs/promises';

import { getBaseDownloadDir } from '../resolveDir';

export interface CreateJobInput {
  url: string;
  mode?: EngineMode;
  scopeConfig?: Partial<CrawlScopeConfig>;
  captureRules?: Partial<CaptureRules>;
  limits?: Partial<CrawlLimits>;
  authProfileId?: string;
  authSessionId?: string;
}

export class JobManager {
  /**
   * Create, persist, and queue a new website reconstruction job.
   */
  static async createJob(input: CreateJobInput): Promise<JobRecord> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const parsed = new URL(input.url);
    const hostname = parsed.hostname;
    const mode = input.mode || 'auto';

    // 1. Resolve authentication state if requested
    let storageState: any = undefined;
    if (input.authProfileId) {
      const profile = getAuthProfile(input.authProfileId);
      if (profile && profile.storage_state) {
        try {
          storageState = JSON.parse(profile.storage_state);
          touchAuthProfile(input.authProfileId);
        } catch {
          // ignore corrupted profile
        }
      }
    } else if (input.authSessionId) {
      storageState = getSessionStorageState(input.authSessionId);
    }

    // Job output directory on disk
    const downloadDir = getBaseDownloadDir(id);
    await fs.mkdir(downloadDir, { recursive: true });

    // 2. Persist record to SQLite
    const record = dbCreateJob({
      id,
      url: input.url,
      hostname,
      mode,
      download_dir: downloadDir,
      crawl_config: {
        mode,
        scopeConfig: input.scopeConfig,
        captureRules: input.captureRules,
        hasAuth: !!storageState,
      },
    });

    // 3. Enqueue into background worker
    jobQueue.enqueue({
      id,
      url: input.url,
      mode,
      outputDir: downloadDir,
      scopeConfig: input.scopeConfig,
      captureRules: input.captureRules,
      limits: input.limits,
      storageState,
    });

    return record;
  }

  /**
   * Retrieve a job by ID.
   */
  static getJob(id: string): JobRecord | null {
    return dbGetJob(id);
  }

  /**
   * List recent jobs with optional filtering.
   */
  static listJobs(options?: { status?: JobStatus; limit?: number; offset?: number }): JobRecord[] {
    return dbListJobs(options);
  }

  /**
   * Cancel an in-progress or queued job.
   */
  static cancelJob(id: string): boolean {
    return jobQueue.cancel(id);
  }

  /**
   * Retry a failed or cancelled job.
   */
  static async retryJob(id: string): Promise<JobRecord | null> {
    const existing = dbGetJob(id);
    if (!existing) return null;

    let crawlConfig: any = {};
    try {
      crawlConfig = typeof existing.crawl_config === 'string'
        ? JSON.parse(existing.crawl_config)
        : existing.crawl_config || {};
    } catch {}

    return this.createJob({
      url: existing.url,
      mode: (existing.mode as EngineMode) || 'auto',
      scopeConfig: crawlConfig.scopeConfig,
      captureRules: crawlConfig.captureRules,
    });
  }

  /**
   * Delete a job and its downloaded files from disk.
   */
  static async deleteJob(id: string): Promise<boolean> {
    const existing = dbGetJob(id);
    if (existing && existing.download_dir) {
      await fs.rm(existing.download_dir, { recursive: true, force: true }).catch(() => {});
    }
    dbDeleteJob(id);
    return true;
  }
}
