/**
 * WebHarvest V3 API & Network Discovery Engine
 *
 * Catalogs XHR/fetch requests, endpoints, methods, and payloads intercepted
 * during crawling for API reverse-engineering and offline data replication.
 */

export interface ApiRequestRecord {
  url: string;
  method: string;
  status: number;
  contentType: string;
  size: number;
  timestamp: number;
  headers?: Record<string, string>;
  responsePreview?: string;
}

export interface ApiCatalog {
  totalRequests: number;
  discoveredAt: number;
  endpoints: ApiRequestRecord[];
  summary: {
    methods: Record<string, number>;
    contentTypes: Record<string, number>;
    statusCodes: Record<string, number>;
  };
}

export function buildApiCatalog(records: ApiRequestRecord[]): ApiCatalog {
  const methods: Record<string, number> = {};
  const contentTypes: Record<string, number> = {};
  const statusCodes: Record<string, number> = {};

  // Deduplicate endpoints by method + URL pathname
  const uniqueEndpoints: ApiRequestRecord[] = [];
  const seen = new Set<string>();

  for (const rec of records) {
    const key = `${rec.method.toUpperCase()} ${rec.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEndpoints.push(rec);
    }

    methods[rec.method] = (methods[rec.method] || 0) + 1;
    const ct = rec.contentType.split(';')[0].trim() || 'unknown';
    contentTypes[ct] = (contentTypes[ct] || 0) + 1;
    const sc = rec.status.toString();
    statusCodes[sc] = (statusCodes[sc] || 0) + 1;
  }

  return {
    totalRequests: records.length,
    discoveredAt: Date.now(),
    endpoints: uniqueEndpoints,
    summary: {
      methods,
      contentTypes,
      statusCodes,
    },
  };
}
