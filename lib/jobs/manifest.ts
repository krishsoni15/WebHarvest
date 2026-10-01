/**
 * WebHarvest Job Manifest
 *
 * Produces structured, reproducible manifest metadata for every completed
 * or partial website reconstruction job.
 */

import { ResourceType } from '../processor/classify';

export interface ManifestResource {
  url: string;
  localPath: string;
  type: ResourceType;
  status: number;
  size: number;
  contentType: string;
  sha256: string;
}

export interface ManifestError {
  url: string;
  message: string;
  type: string;
  statusCode?: number;
}

export interface CrawlManifest {
  jobId: string;
  sourceUrl: string;
  hostname: string;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'cancelled' | 'failed';
  crawlerMode: string;
  stats: {
    pagesDownloaded: number;
    assetsDownloaded: number;
    totalBytes: number;
    errorsCount: number;
    durationMs: number;
  };
  resources: ManifestResource[];
  errors: ManifestError[];
  technology?: any;
  health?: any;
  screenshots?: {
    desktop?: string;
    mobile?: string;
  };
  apiCatalog?: any;
  auth?: {
    authenticated: boolean;
    profileName?: string;
    authType?: string;
  };
}

export function createManifest(params: {
  jobId: string;
  sourceUrl: string;
  startedAt: number;
  completedAt: number;
  status: 'completed' | 'cancelled' | 'failed';
  crawlerMode: string;
  stats: {
    pagesDownloaded: number;
    assetsDownloaded: number;
    totalBytes: number;
    errorsCount: number;
  };
  resources: ManifestResource[];
  errors?: ManifestError[];
  technology?: any;
  health?: any;
  screenshots?: {
    desktop?: string;
    mobile?: string;
  };
  apiCatalog?: any;
  auth?: {
    authenticated: boolean;
    profileName?: string;
    authType?: string;
  };
}): CrawlManifest {
  const urlObj = new URL(params.sourceUrl);

  return {
    jobId: params.jobId,
    sourceUrl: params.sourceUrl,
    hostname: urlObj.hostname,
    startedAt: new Date(params.startedAt).toISOString(),
    completedAt: new Date(params.completedAt).toISOString(),
    status: params.status,
    crawlerMode: params.crawlerMode,
    stats: {
      ...params.stats,
      durationMs: params.completedAt - params.startedAt,
    },
    resources: params.resources,
    errors: params.errors || [],
    technology: params.technology,
    health: params.health,
    screenshots: params.screenshots,
    apiCatalog: params.apiCatalog,
    auth: params.auth,
  };
}
