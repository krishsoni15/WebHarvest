import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/db/client';
import { calculateMirrorHealth } from '@/lib/analysis/health';
import { resolveTargetDir, getBaseDownloadDir } from '@/lib/resolveDir';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbJob = getJob(id);

    // If manifest exists on disk, read health directly
    const baseDir = getBaseDownloadDir(id);
    const manifestPath = path.join(baseDir, 'manifest.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (manifest.health) {
          return NextResponse.json({ health: manifest.health });
        }
      } catch {}
    }

    // Otherwise calculate dynamically from job stats or directory
    const pagesCount = dbJob?.pages_downloaded || 1;
    const assetsCount = dbJob?.assets_downloaded || 1;
    const errorsCount = dbJob?.errors_count || 0;

    const health = calculateMirrorHealth({
      pagesFound: pagesCount,
      pagesCaptured: pagesCount,
      assetsFound: assetsCount,
      assetsCaptured: assetsCount,
      errorsCount,
    });

    return NextResponse.json({ health });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get health score' }, { status: 500 });
  }
}
