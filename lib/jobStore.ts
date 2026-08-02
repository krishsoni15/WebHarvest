import { ChildProcess } from 'child_process';

export interface Job {
  id: string;
  url: string;
  hostname: string;
  status: 'downloading' | 'completed' | 'failed';
  error?: string;
  addedAt: number;
  completedAt?: number;
  resolvedDir?: string;
  cachedOverview?: any;
  cachedAssets?: any;
  cachedFileTree?: any;
  lastOverviewUpdate?: number;
  lastAssetsUpdate?: number;
  lastFilesUpdate?: number;
}

// Persist the jobs map across hot-reloads in Next.js dev server
const globalForJobs = global as unknown as {
  activeJobs?: Map<string, Job>;
  activeProcesses?: Map<string, ChildProcess>;
};

export const activeJobs = globalForJobs.activeJobs || new Map<string, Job>();
export const activeProcesses = globalForJobs.activeProcesses || new Map<string, ChildProcess>();

// Force reload comment update to reset global cache
if (process.env.NODE_ENV !== 'production') {
  globalForJobs.activeJobs = activeJobs;
  globalForJobs.activeProcesses = activeProcesses;
}
