/**
 * WebHarvest Database Schema — SQLite
 *
 * Defines the persistent storage schema for jobs, pages, assets, and errors.
 * Replaces the in-memory Map<string, Job> with durable storage.
 */

/** SQL statements to create the database schema */
export const SCHEMA_SQL = `
-- Jobs table: persistent job state
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  hostname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  mode TEXT DEFAULT 'auto',
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  pages_found INTEGER DEFAULT 0,
  pages_downloaded INTEGER DEFAULT 0,
  assets_found INTEGER DEFAULT 0,
  assets_downloaded INTEGER DEFAULT 0,
  bytes_downloaded INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_message TEXT,
  crawl_config TEXT,
  manifest TEXT,
  download_dir TEXT,
  resolved_dir TEXT
);

-- Pages table: tracks every page discovered/crawled
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  canonical TEXT,
  local_path TEXT,
  status_code INTEGER,
  content_type TEXT,
  size INTEGER DEFAULT 0,
  sha256 TEXT,
  depth INTEGER DEFAULT 0,
  discovered_from TEXT,
  crawled_at INTEGER,
  needs_browser INTEGER DEFAULT 0,
  error TEXT
);

-- Assets table: tracks every asset (CSS, JS, images, fonts, etc.)
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  canonical TEXT,
  local_path TEXT,
  type TEXT,
  status_code INTEGER,
  content_type TEXT,
  size INTEGER DEFAULT 0,
  sha256 TEXT,
  discovered_from TEXT,
  downloaded_at INTEGER,
  error TEXT
);

-- Crawl errors table: detailed error tracking
CREATE TABLE IF NOT EXISTS crawl_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  error_type TEXT,
  status_code INTEGER,
  message TEXT,
  retries INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Authentication Profiles table: persistent browser/session states
CREATE TABLE IF NOT EXISTS auth_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'manual_session',
  storage_state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_pages_job ON pages(job_id);
CREATE INDEX IF NOT EXISTS idx_pages_sha ON pages(sha256);
CREATE INDEX IF NOT EXISTS idx_assets_job ON assets(job_id);
CREATE INDEX IF NOT EXISTS idx_assets_sha ON assets(sha256);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_errors_job ON crawl_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_auth_domain ON auth_profiles(domain);
`;

/** Authentication profile record */
export interface AuthProfileRecord {
  id: string;
  name: string;
  domain: string;
  auth_type: 'manual_session' | 'storage_state' | 'cookies';
  storage_state: string; // JSON Playwright storage state
  created_at: number;
  last_used_at: number | null;
}

/** Job status enum */
export type JobStatus = 'queued' | 'crawling' | 'completed' | 'failed' | 'cancelled' | 'paused';

/** Job record as stored in the database */
export interface JobRecord {
  id: string;
  url: string;
  hostname: string;
  status: JobStatus;
  mode: string;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  pages_found: number;
  pages_downloaded: number;
  assets_found: number;
  assets_downloaded: number;
  bytes_downloaded: number;
  errors_count: number;
  error_message: string | null;
  crawl_config: string | null;
  manifest: string | null;
  download_dir: string | null;
  resolved_dir: string | null;
}

/** Page record */
export interface PageRecord {
  id?: number;
  job_id: string;
  url: string;
  canonical: string | null;
  local_path: string | null;
  status_code: number | null;
  content_type: string | null;
  size: number;
  sha256: string | null;
  depth: number;
  discovered_from: string | null;
  crawled_at: number | null;
  needs_browser: number;
  error: string | null;
}

/** Asset record */
export interface AssetRecord {
  id?: number;
  job_id: string;
  url: string;
  canonical: string | null;
  local_path: string | null;
  type: string | null;
  status_code: number | null;
  content_type: string | null;
  size: number;
  sha256: string | null;
  discovered_from: string | null;
  downloaded_at: number | null;
  error: string | null;
}

/** Error record */
export interface ErrorRecord {
  id?: number;
  job_id: string;
  url: string;
  error_type: string | null;
  status_code: number | null;
  message: string | null;
  retries: number;
  created_at: number;
}
