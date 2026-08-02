import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { activeJobs } from '@/lib/jobStore';
import { resolveTargetDir, getBaseDownloadDir } from '@/lib/resolveDir';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = activeJobs.get(id);

  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send an initial progress payload
  const { stats: initialStats, recentFiles: initialRecent } = scanFolderStats(id, job.hostname);
  writer.write(
    encoder.encode(
      `data: ${JSON.stringify({
        status: job.status,
        error: job.error,
        stats: initialStats,
        recentFiles: initialRecent,
        hostname: job.hostname,
        url: job.url,
      })}\n\n`
    )
  );

  const interval = setInterval(async () => {
    const currentJob = activeJobs.get(id);
    if (!currentJob) {
      clearInterval(interval);
      try {
        writer.write(encoder.encode(`event: error\ndata: Job lost\n\n`));
      } catch {}
      writer.close();
      return;
    }

    const { stats, recentFiles } = scanFolderStats(id, currentJob.hostname);

    try {
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            status: currentJob.status,
            error: currentJob.error,
            stats,
            recentFiles,
            hostname: currentJob.hostname,
            url: currentJob.url,
          })}\n\n`
        )
      );
    } catch {
      clearInterval(interval);
      writer.close();
      return;
    }

    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      clearInterval(interval);
      try {
        writer.close();
      } catch {}
    }
  }, 1000);

  req.signal.addEventListener('abort', () => {
    clearInterval(interval);
    try {
      writer.close();
    } catch {}
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

function scanFolderStats(id: string, hostname: string) {
  const targetDir = resolveTargetDir(id, hostname);
  const baseDir = getBaseDownloadDir(id);

  const stats = {
    html: 0,
    css: 0,
    images: 0,
    fonts: 0,
    js: 0,
    totalFiles: 0,
    totalSize: 0,
  };

  const recentFiles: { name: string; size: number; mtime: number }[] = [];

  const dirToScan = fs.existsSync(targetDir) ? targetDir : baseDir;
  if (!fs.existsSync(dirToScan)) {
    return { stats, recentFiles: [] };
  }

  function walk(dir: string) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file.startsWith('.')) continue;

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile()) {
          stats.totalFiles++;
          stats.totalSize += stat.size;

          const cleanFile = file.split('?')[0];
          const ext = path.extname(cleanFile).toLowerCase();
          if (ext === '.html' || ext === '.htm') {
            stats.html++;
          } else if (ext === '.css') {
            stats.css++;
          } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
            stats.images++;
          } else if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
            stats.fonts++;
          } else if (ext === '.js') {
            stats.js++;
          }

          const relativePath = path.relative(dirToScan, fullPath);
          recentFiles.push({
            name: relativePath,
            size: stat.size,
            mtime: stat.mtimeMs,
          });
        }
      }
    } catch {}
  }

  walk(dirToScan);

  recentFiles.sort((a, b) => b.mtime - a.mtime);

  const latestFiles = recentFiles.slice(0, 15).map(f => ({
    name: f.name,
    size: f.size,
  }));

  return { stats, recentFiles: latestFiles };
}
