import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { resolveTargetDir, ensureJobExists, getBaseDownloadDir } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';
import { createCompleteRunnableBundle } from '@/lib/authCrawler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ensureJobExists(id)) {
      return new Response('Job not found', { status: 404 });
    }

    const job = activeJobs.get(id)!;
    const targetDir = resolveTargetDir(id, job.hostname);
    const baseDir = getBaseDownloadDir(id);

    if (!fs.existsSync(targetDir)) {
      return new Response('Downloaded files not found', { status: 404 });
    }

    const zipName = `${job.hostname || 'mirror'}-mirror.zip`;
    const zipFilePath = path.join(baseDir, zipName);
    const tmpZipPath = path.join(baseDir, `${job.hostname || 'mirror'}-mirror.tmp.zip`);

    // 1. FAST PATH: If ZIP already exists and has content, serve it INSTANTLY!
    let hasValidZip = false;
    if (fs.existsSync(zipFilePath)) {
      try {
        const stat = fs.statSync(zipFilePath);
        if (stat.size > 0) {
          hasValidZip = true;
        }
      } catch {}
    }

    if (!hasValidZip) {
      // Ensure complete zero-dependency runnable bundle exists before zipping
      try {
        createCompleteRunnableBundle(targetDir, baseDir, job.hostname);
      } catch {}

      // Fast system zip
      try {
        const { execSync } = await import('child_process');
        execSync(`zip -r -q -1 "${tmpZipPath}" . -x "*.git*" "crawl_logs.txt" "*.zip"`, {
          cwd: targetDir,
          maxBuffer: 1024 * 1024 * 50,
          timeout: 60000,
        });

        if (fs.existsSync(tmpZipPath) && fs.statSync(tmpZipPath).size > 0) {
          fs.renameSync(tmpZipPath, zipFilePath);
          hasValidZip = true;
        }
      } catch (zipErr) {
        console.error('System zip failed:', zipErr);
      }
    }

    // Stream the zip file with native high-performance WebStream
    if (fs.existsSync(zipFilePath) && fs.statSync(zipFilePath).size > 0) {
      const stat = fs.statSync(zipFilePath);
      const nodeStream = fs.createReadStream(zipFilePath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new Response(webStream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(job.hostname)}-mirror.zip"`,
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    return new Response('Failed to generate snapshot archive', { status: 500 });
  } catch (err: any) {
    console.error('Download error:', err);
    return new Response(err.message || 'Internal server error', { status: 500 });
  }
}
