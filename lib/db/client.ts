/**
 * WebHarvest Database Client — SQLite via better-sqlite3
 *
 * Provides a singleton database connection with helper methods
 * for all CRUD operations on jobs, pages, assets, and errors.
 * Survives server restarts — data persists on disk.
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { SCHEMA_SQL, JobRecord, PageRecord, AssetRecord, ErrorRecord, AuthProfileRecord, JobStatus } from './schema';

/** Database file location */
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'webharvest.db');

/** Singleton database instance */
let db: Database.Database | null = null;

/**
 * Get or create the database connection.
 * Initializes schema on first call.
 */
export function getDB(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(SCHEMA_SQL);

  return db;
}

// ─── Job Operations ──────────────────────────────────────────────────

/**
 * Create a new job record.
 */
export function createJob(job: {
  id: string;
  url: string;
  hostname: string;
  mode?: string;
  download_dir?: string;
  crawl_config?: object;
}): JobRecord {
  const db = getDB();
  const now = Date.now();

  db.prepare(`
    INSERT INTO jobs (id, url, hostname, status, mode, created_at, download_dir, crawl_config)
    VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)
  `).run(
    job.id,
    job.url,
    job.hostname,
    job.mode ?? 'auto',
    now,
    job.download_dir ?? null,
    job.crawl_config ? JSON.stringify(job.crawl_config) : null,
  );

  return getJob(job.id)!;
}

/**
 * Get a job by ID.
 */
export function getJob(id: string): JobRecord | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRecord | undefined;
  return row ?? null;
}

/**
 * List jobs, optionally filtered by status.
 */
export function listJobs(options?: {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}): JobRecord[] {
  const db = getDB();
  let sql = 'SELECT * FROM jobs';
  const params: any[] = [];

  if (options?.status) {
    sql += ' WHERE status = ?';
    params.push(options.status);
  }

  sql += ' ORDER BY created_at DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  return db.prepare(sql).all(...params) as JobRecord[];
}

/**
 * Update a job's status.
 */
export function updateJobStatus(
  id: string,
  status: JobStatus,
  extra?: Partial<Pick<JobRecord, 'started_at' | 'completed_at' | 'error_message' | 'resolved_dir'>>,
): void {
  const db = getDB();
  const sets = ['status = ?'];
  const params: any[] = [status];

  if (extra?.started_at !== undefined) {
    sets.push('started_at = ?');
    params.push(extra.started_at);
  }
  if (extra?.completed_at !== undefined) {
    sets.push('completed_at = ?');
    params.push(extra.completed_at);
  }
  if (extra?.error_message !== undefined) {
    sets.push('error_message = ?');
    params.push(extra.error_message);
  }
  if (extra?.resolved_dir !== undefined) {
    sets.push('resolved_dir = ?');
    params.push(extra.resolved_dir);
  }

  params.push(id);
  db.prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Mark a job as completed with optional manifest.
 */
export function completeJob(id: string, manifest?: object): void {
  updateJobStatus(id, 'completed', { completed_at: Date.now() });
  if (manifest) {
    saveManifest(id, manifest);
  }
}

/**
 * Mark a job as failed with an error message.
 */
export function failJob(id: string, error: string): void {
  updateJobStatus(id, 'failed', { error_message: error, completed_at: Date.now() });
}

/**
 * Update job progress counters.
 */
export function updateJobProgress(
  id: string,
  progress: {
    pages_found?: number;
    pages_downloaded?: number;
    assets_found?: number;
    assets_downloaded?: number;
    bytes_downloaded?: number;
    errors_count?: number;
  },
): void {
  const db = getDB();
  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(progress)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (sets.length === 0) return;

  params.push(id);
  db.prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Save job manifest (JSON).
 */
export function saveManifest(id: string, manifest: object): void {
  const db = getDB();
  db.prepare('UPDATE jobs SET manifest = ? WHERE id = ?').run(JSON.stringify(manifest), id);
}

/**
 * Delete a job and all associated records (cascading).
 */
export function deleteJob(id: string): void {
  const db = getDB();
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
}

/**
 * Count active (downloading/crawling) jobs.
 */
export function countActiveJobs(): number {
  const db = getDB();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM jobs WHERE status IN ('queued', 'crawling')"
  ).get() as { count: number };
  return row.count;
}

// ─── Page Operations ─────────────────────────────────────────────────

/**
 * Insert a page record.
 */
export function insertPage(page: Omit<PageRecord, 'id'>): number {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO pages (job_id, url, canonical, local_path, status_code, content_type, size, sha256, depth, discovered_from, crawled_at, needs_browser, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    page.job_id, page.url, page.canonical, page.local_path,
    page.status_code, page.content_type, page.size, page.sha256,
    page.depth, page.discovered_from, page.crawled_at,
    page.needs_browser, page.error,
  );
  return result.lastInsertRowid as number;
}

/**
 * Get all pages for a job.
 */
export function getJobPages(jobId: string): PageRecord[] {
  const db = getDB();
  return db.prepare('SELECT * FROM pages WHERE job_id = ? ORDER BY crawled_at ASC').all(jobId) as PageRecord[];
}

/**
 * Count pages for a job.
 */
export function countJobPages(jobId: string): number {
  const db = getDB();
  const row = db.prepare('SELECT COUNT(*) as count FROM pages WHERE job_id = ?').get(jobId) as { count: number };
  return row.count;
}

// ─── Asset Operations ────────────────────────────────────────────────

/**
 * Insert an asset record.
 */
export function insertAsset(asset: Omit<AssetRecord, 'id'>): number {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO assets (job_id, url, canonical, local_path, type, status_code, content_type, size, sha256, discovered_from, downloaded_at, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    asset.job_id, asset.url, asset.canonical, asset.local_path,
    asset.type, asset.status_code, asset.content_type, asset.size,
    asset.sha256, asset.discovered_from, asset.downloaded_at, asset.error,
  );
  return result.lastInsertRowid as number;
}

/**
 * Get all assets for a job.
 */
export function getJobAssets(jobId: string): AssetRecord[] {
  const db = getDB();
  return db.prepare('SELECT * FROM assets WHERE job_id = ? ORDER BY downloaded_at ASC').all(jobId) as AssetRecord[];
}

/**
 * Get asset stats for a job (grouped by type).
 */
export function getAssetStats(jobId: string): Record<string, { count: number; size: number }> {
  const db = getDB();
  const rows = db.prepare(`
    SELECT type, COUNT(*) as count, COALESCE(SUM(size), 0) as size
    FROM assets WHERE job_id = ?
    GROUP BY type
  `).all(jobId) as Array<{ type: string; count: number; size: number }>;

  const stats: Record<string, { count: number; size: number }> = {};
  for (const row of rows) {
    stats[row.type || 'unknown'] = { count: row.count, size: row.size };
  }
  return stats;
}

// ─── Error Operations ────────────────────────────────────────────────

/**
 * Insert a crawl error record.
 */
export function insertError(error: Omit<ErrorRecord, 'id'>): number {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO crawl_errors (job_id, url, error_type, status_code, message, retries, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    error.job_id, error.url, error.error_type,
    error.status_code, error.message, error.retries, error.created_at,
  );
  return result.lastInsertRowid as number;
}

/**
 * Get all errors for a job.
 */
export function getJobErrors(jobId: string): ErrorRecord[] {
  const db = getDB();
  return db.prepare('SELECT * FROM crawl_errors WHERE job_id = ? ORDER BY created_at DESC').all(jobId) as ErrorRecord[];
}

/**
 * Count errors for a job.
 */
export function countJobErrors(jobId: string): number {
  const db = getDB();
  const row = db.prepare('SELECT COUNT(*) as count FROM crawl_errors WHERE job_id = ?').get(jobId) as { count: number };
  return row.count;
}

// ─── Authentication Profile Operations ───────────────────────────────

/**
 * Save an authentication profile.
 */
export function createAuthProfile(profile: {
  id: string;
  name: string;
  domain: string;
  auth_type?: 'manual_session' | 'storage_state' | 'cookies';
  storage_state: string;
}): AuthProfileRecord {
  const db = getDB();
  const now = Date.now();

  db.prepare(`
    INSERT INTO auth_profiles (id, name, domain, auth_type, storage_state, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    profile.id,
    profile.name,
    profile.domain.toLowerCase(),
    profile.auth_type ?? 'manual_session',
    profile.storage_state,
    now,
    now
  );

  return getAuthProfile(profile.id)!;
}

/**
 * Get an authentication profile by ID.
 */
export function getAuthProfile(id: string): AuthProfileRecord | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM auth_profiles WHERE id = ?').get(id) as AuthProfileRecord | undefined;
  return row ?? null;
}

/**
 * List all authentication profiles, optionally filtered by domain.
 */
export function listAuthProfiles(domain?: string): AuthProfileRecord[] {
  const db = getDB();
  if (domain) {
    const cleanDomain = domain.toLowerCase().replace('www.', '');
    return db.prepare('SELECT * FROM auth_profiles WHERE domain LIKE ? ORDER BY created_at DESC').all(`%${cleanDomain}%`) as AuthProfileRecord[];
  }
  return db.prepare('SELECT * FROM auth_profiles ORDER BY created_at DESC').all() as AuthProfileRecord[];
}

/**
 * Delete an authentication profile.
 */
export function deleteAuthProfile(id: string): void {
  const db = getDB();
  db.prepare('DELETE FROM auth_profiles WHERE id = ?').run(id);
}

/**
 * Update the last_used timestamp of a profile.
 */
export function touchAuthProfile(id: string): void {
  const db = getDB();
  db.prepare('UPDATE auth_profiles SET last_used_at = ? WHERE id = ?').run(Date.now(), id);
}

// ─── Cleanup Operations ──────────────────────────────────────────────

/**
 * Delete jobs older than a given age.
 * Returns the number of deleted jobs.
 */
export function cleanupOldJobs(maxAgeMs: number): number {
  const db = getDB();
  const cutoff = Date.now() - maxAgeMs;
  const result = db.prepare('DELETE FROM jobs WHERE created_at < ? AND status IN (?, ?, ?)').run(
    cutoff, 'completed', 'failed', 'cancelled'
  );
  return result.changes;
}

/**
 * Close the database connection.
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
