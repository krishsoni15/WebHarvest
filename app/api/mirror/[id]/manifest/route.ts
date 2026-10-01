import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/db/client';
import { getBaseDownloadDir } from '@/lib/resolveDir';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const baseDir = getBaseDownloadDir(id);
    const manifestPath = path.join(baseDir, 'manifest.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        return NextResponse.json(manifest);
      } catch {}
    }

    const job = getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.manifest) {
      try {
        return NextResponse.json(JSON.parse(job.manifest));
      } catch {}
    }

    return NextResponse.json({
      jobId: job.id,
      sourceUrl: job.url,
      hostname: job.hostname,
      status: job.status,
      stats: {
        pagesDownloaded: job.pages_downloaded,
        assetsDownloaded: job.assets_downloaded,
        totalBytes: job.bytes_downloaded,
        errorsCount: job.errors_count,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read manifest' }, { status: 500 });
  }
}
