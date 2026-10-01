import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/db/client';
import { analyzeNetworkTraffic, NetworkLogEntry } from '@/lib/analysis/network';
import { getBaseDownloadDir } from '@/lib/resolveDir';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = getJob(id);

    // If manifest contains resource list, convert to network entries
    const baseDir = getBaseDownloadDir(id);
    const manifestPath = path.join(baseDir, 'manifest.json');
    let entries: NetworkLogEntry[] = [];

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (Array.isArray(manifest.resources)) {
          entries = manifest.resources.map((r: any) => ({
            url: r.url,
            method: 'GET',
            status: r.status || 200,
            contentType: r.contentType || 'application/octet-stream',
            size: r.size || 0,
            isFirstParty: true,
          }));
        }
      } catch {}
    }

    const hostname = job?.hostname || 'example.com';
    const analysis = analyzeNetworkTraffic(entries, hostname);

    return NextResponse.json({
      analysis,
      entries: entries.slice(0, 100),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to analyze network' }, { status: 500 });
  }
}
