import path from 'path';
import fs from 'fs';
import os from 'os';
import { activeJobs } from '@/lib/jobStore';

/**
 * Get the base directory for downloads, handling read-only environments like Vercel.
 */
export function getBaseDownloadDir(id?: string): string {
  const baseDir = (process.env.VERCEL || process.env.NOW_BUILDER || process.env.NODE_ENV === 'production')
    ? path.join(os.tmpdir(), 'downloads')
    : path.join(process.cwd(), 'tmp', 'downloads');
  return id ? path.join(baseDir, id) : baseDir;
}

/**
 * Centralized directory resolution for mirrored sites.
 * 
 * Every API route MUST use this single function to find the correct
 * target directory for a given job. This eliminates race conditions
 * and inconsistencies caused by each route independently guessing
 * the hostname subdirectory.
 * 
 * Resolution priority:
 *   1. Cached `resolvedDir` on the job object (instant, stable)
 *   2. Exact hostname match
 *   3. www. variant (add or remove)
 *   4. Subdirectory containing index.html
 *   5. Largest-file-count heuristic (fallback)
 */
export function resolveTargetDir(id: string, hostname: string): string {
  const baseDir = getBaseDownloadDir(id);

  if (!fs.existsSync(baseDir)) {
    return baseDir;
  }

  const job = activeJobs.get(id);

  // Check if we already resolved this job's directory (only use cache if completed and directory actually exists and has content)
  if (job?.status === 'completed' && job?.resolvedDir && fs.existsSync(job.resolvedDir)) {
    if (fs.existsSync(path.join(job.resolvedDir, 'index.html')) || countFilesRecursive(job.resolvedDir) > 0) {
      return job.resolvedDir;
    }
  }

  try {
    const items = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && f !== 'crawl_logs.txt');

    const subdirs = items.filter(f => {
      try {
        return fs.statSync(path.join(baseDir, f)).isDirectory();
      } catch {
        return false;
      }
    });

    if (subdirs.length > 0) {
      const cleanHostname = hostname.toLowerCase().replace('www.', '');

      const scoredDirs = subdirs.map(dir => {
        const dirPath = path.join(baseDir, dir);
        const count = countFilesRecursive(dirPath);
        
        const lowerDir = dir.toLowerCase();
        const isDomainMatch = lowerDir.includes(cleanHostname) || cleanHostname.includes(lowerDir);
        const hasIndex = fs.existsSync(path.join(dirPath, 'index.html'));
        
        let multiplier = 1;
        if (isDomainMatch) multiplier *= 10000;
        if (hasIndex) multiplier *= 5;

        const score = count * multiplier;

        return { dir, count, score };
      });

      scoredDirs.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.count - a.count;
      });

      if (scoredDirs[0].count > 0) {
        const targetDir = path.join(baseDir, scoredDirs[0].dir);
        if (job?.status === 'completed') {
          cacheResolvedDir(id, targetDir);
        }
        return targetDir;
      }
    }

    // Check if index.html or files exist directly in baseDir
    const nonLogFiles = items.filter(f => {
      try {
        return fs.statSync(path.join(baseDir, f)).isFile();
      } catch {
        return false;
      }
    });

    if (fs.existsSync(path.join(baseDir, 'index.html')) || nonLogFiles.length > 0) {
      if (job?.status === 'completed') {
        cacheResolvedDir(id, baseDir);
      }
      return baseDir;
    }
  } catch {}

  const fallbackPath = path.join(baseDir, hostname);
  if (fs.existsSync(fallbackPath)) {
    if (job?.status === 'completed') {
      cacheResolvedDir(id, fallbackPath);
    }
    return fallbackPath;
  }

  return baseDir;
}

/**
 * Ensures a job entry exists in the activeJobs map for the given id.
 * Used by routes that may be called after a server restart (hot reload).
 */
export function ensureJobExists(id: string): boolean {
  if (activeJobs.has(id)) return true;

  const baseDir = getBaseDownloadDir(id);

  if (!fs.existsSync(baseDir)) return false;

  const jobJsonPath = path.join(baseDir, 'job.json');
  if (fs.existsSync(jobJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jobJsonPath, 'utf-8'));
      activeJobs.set(id, data);
      return true;
    } catch {}
  }

  try {
    const items = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && f !== 'crawl_logs.txt' && f !== 'job.json');
    if (items.length === 0) return false;

    const subdirs = items.filter(f => {
      try {
        return fs.statSync(path.join(baseDir, f)).isDirectory();
      } catch {
        return false;
      }
    });

    let bestHostname = 'mirrored-site';
    let maxFiles = -1;

    for (const dir of subdirs) {
      const count = countFilesRecursive(path.join(baseDir, dir));
      if (count > maxFiles) {
        maxFiles = count;
        bestHostname = dir;
      }
    }

    activeJobs.set(id, {
      id,
      url: `https://${bestHostname}`,
      hostname: bestHostname,
      status: 'completed',
      addedAt: Date.now(),
    });

    return true;
  } catch {
    return false;
  }
}

/** Cache the resolved directory on the job object for stability */
function cacheResolvedDir(id: string, dir: string) {
  const job = activeJobs.get(id);
  if (job) {
    job.resolvedDir = dir;
    activeJobs.set(id, job);
  }
}

/** Count files recursively in a directory */
function countFilesRecursive(dir: string): number {
  let count = 0;
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (item.startsWith('.') || item === 'crawl_logs.txt') continue;
      const fp = path.join(dir, item);
      try {
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) {
          count += countFilesRecursive(fp);
        } else {
          count++;
        }
      } catch {}
    }
  } catch {}
  return count;
}
