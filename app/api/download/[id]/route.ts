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
      // Ensure complete zero-dependency runnable bundle and rich README.md exist before zipping
      try {
        const pages: string[] = [];
        function scanHtml(dir: string, base: string = '') {
          try {
            const list = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of list) {
              if (item.name.startsWith('.')) continue;
              const rel = base ? `${base}/${item.name}` : item.name;
              if (item.isFile() && (item.name.endsWith('.html') || item.name.endsWith('.htm'))) {
                pages.push(rel);
              } else if (item.isDirectory() && pages.length < 50) {
                scanHtml(path.join(dir, item.name), rel);
              }
            }
          } catch {}
        }
        scanHtml(targetDir);

        let totalBytes = 0;
        function getDirSize(d: string) {
          try {
            const files = fs.readdirSync(d, { withFileTypes: true });
            for (const f of files) {
              const full = path.join(d, f.name);
              if (f.isFile()) {
                totalBytes += fs.statSync(full).size;
              } else if (f.isDirectory() && !f.name.startsWith('.')) {
                getDirSize(full);
              }
            }
          } catch {}
        }
        getDirSize(targetDir);

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = totalBytes > 0 ? Math.floor(Math.log(totalBytes) / Math.log(k)) : 0;
        const totalSizeFormatted = totalBytes > 0 ? (parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]) : '0 B';

        createCompleteRunnableBundle(targetDir, baseDir, job.hostname, {
          url: job.url,
          totalSize: totalSizeFormatted,
          htmlPages: pages,
        });
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
        console.warn('System zip failed, falling back to streaming archiver:', zipErr);
      }

      // 2. FALLBACK: Node streaming archiver if system zip was unavailable
      if (!hasValidZip) {
        try {
          const { createMirrorZipStream } = await import('@/lib/export/zip');
          const archiveStream = createMirrorZipStream(targetDir);
          const writeStream = fs.createWriteStream(zipFilePath);
          await new Promise<void>((resolve, reject) => {
            archiveStream.pipe(writeStream);
            archiveStream.on('end', () => resolve());
            archiveStream.on('error', reject);
            writeStream.on('error', reject);
          });
          if (fs.existsSync(zipFilePath) && fs.statSync(zipFilePath).size > 0) {
            hasValidZip = true;
          }
        } catch (archErr) {
          console.error('Archiver fallback failed:', archErr);
        }
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
