/**
 * WebHarvest Network Waterfall & Host Analysis
 *
 * Analyzes network traffic captured during website reconstruction.
 */

export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number;
  contentType: string;
  size: number;
  durationMs?: number;
  isFirstParty: boolean;
}

export interface NetworkAnalysisResult {
  totalRequests: number;
  totalBytes: number;
  firstPartyRequests: number;
  thirdPartyRequests: number;
  hosts: Array<{ hostname: string; count: number; bytes: number }>;
  byStatus: Record<string, number>;
  slowestRequests?: NetworkLogEntry[];
}

export function analyzeNetworkTraffic(
  entries: NetworkLogEntry[],
  baseHostname: string
): NetworkAnalysisResult {
  let totalBytes = 0;
  let firstParty = 0;
  let thirdParty = 0;
  const hostMap = new Map<string, { count: number; bytes: number }>();
  const byStatus: Record<string, number> = {};

  for (const entry of entries) {
    totalBytes += entry.size || 0;

    let host = 'unknown';
    try {
      host = new URL(entry.url).hostname;
    } catch {
      // ignore
    }

    const isFirstParty = host === baseHostname || host.endsWith('.' + baseHostname);
    if (isFirstParty) firstParty++;
    else thirdParty++;

    const hostStats = hostMap.get(host) || { count: 0, bytes: 0 };
    hostStats.count += 1;
    hostStats.bytes += entry.size || 0;
    hostMap.set(host, hostStats);

    const statusGroup = `${Math.floor((entry.status || 200) / 100)}xx`;
    byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;
  }

  const hosts = Array.from(hostMap.entries())
    .map(([hostname, stats]) => ({ hostname, count: stats.count, bytes: stats.bytes }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalRequests: entries.length,
    totalBytes,
    firstPartyRequests: firstParty,
    thirdPartyRequests: thirdParty,
    hosts,
    byStatus,
  };
}
