import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { activeJobs } from '@/lib/jobStore';
import { resolveTargetDir, getBaseDownloadDir, ensureJobExists } from '@/lib/resolveDir';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!ensureJobExists(id)) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const job = activeJobs.get(id)!;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Read latest log lines for real-time streaming
  let initialLogs = '';
  try {
    const logFilePath = path.join(getBaseDownloadDir(id), 'crawl_logs.txt');
    if (fs.existsSync(logFilePath)) {
      const logStat = fs.statSync(logFilePath);
      const tailBytes = Math.min(logStat.size, 64 * 1024);
      if (logStat.size <= tailBytes) {
        initialLogs = fs.readFileSync(logFilePath, 'utf-8');
      } else {
        const fd = fs.openSync(logFilePath, 'r');
        const buffer = Buffer.alloc(tailBytes);
        fs.readSync(fd, buffer, 0, tailBytes, logStat.size - tailBytes);
        fs.closeSync(fd);
        const text = buffer.toString('utf-8');
        const firstNl = text.indexOf('\n');
        initialLogs = firstNl >= 0 ? text.slice(firstNl + 1) : text;
      }
      const logLines = initialLogs.trim().split('\n');
      initialLogs = logLines.slice(-100).join('\n');
    }
  } catch {}

  // If logs already indicate crawl completed or failed, update job status immediately
  if (job.status !== 'completed' && job.status !== 'failed') {
    if (initialLogs.includes('Crawl completed') || initialLogs.includes('Offline mirror bundle ready')) {
      job.status = 'completed';
      job.completedAt = Date.now();
      activeJobs.set(id, job);
    } else if (initialLogs.includes('Fatal crawl error') || initialLogs.includes('Crawl failed')) {
      job.status = 'failed';
      activeJobs.set(id, job);
    }
  }

  // Send initial progress payload
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
        logs: initialLogs,
      })}\n\n`
    )
  );

  // If job is already completed or failed, close stream immediately
  if (job.status === 'completed' || job.status === 'failed') {
    try {
      writer.close();
    } catch {}
    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }

  const interval = setInterval(async () => {
    ensureJobExists(id);
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

    // Read latest log lines for real-time streaming
    let recentLogs = '';
    try {
      const logFilePath = path.join(getBaseDownloadDir(id), 'crawl_logs.txt');
      if (fs.existsSync(logFilePath)) {
        const logStat = fs.statSync(logFilePath);
        const tailBytes = Math.min(logStat.size, 64 * 1024);
        if (logStat.size <= tailBytes) {
          recentLogs = fs.readFileSync(logFilePath, 'utf-8');
        } else {
          const fd = fs.openSync(logFilePath, 'r');
          const buffer = Buffer.alloc(tailBytes);
          fs.readSync(fd, buffer, 0, tailBytes, logStat.size - tailBytes);
          fs.closeSync(fd);
          const text = buffer.toString('utf-8');
          const firstNl = text.indexOf('\n');
          recentLogs = firstNl >= 0 ? text.slice(firstNl + 1) : text;
        }
        // Only send last 100 lines via SSE to keep payload small
        const logLines = recentLogs.trim().split('\n');
        recentLogs = logLines.slice(-100).join('\n');
      }
    } catch {}

    // Check completion cues in logs
    if (currentJob.status !== 'completed' && currentJob.status !== 'failed') {
      if (recentLogs.includes('Crawl completed') || recentLogs.includes('Offline mirror bundle ready')) {
        currentJob.status = 'completed';
        currentJob.completedAt = Date.now();
        activeJobs.set(id, currentJob);
      } else if (recentLogs.includes('Fatal crawl error') || recentLogs.includes('Crawl failed')) {
        currentJob.status = 'failed';
        activeJobs.set(id, currentJob);
      }
    }

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
            logs: recentLogs,
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
  }, 2000);

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

const statsCache = new Map<string, { time: number; data: { stats: any; recentFiles: any } }>();

function scanFolderStats(id: string, hostname: string) {
  const cached = statsCache.get(id);
  const now = Date.now();
  if (cached && (now - cached.time < 3500)) {
    return cached.data;
  }

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

  const result = { stats, recentFiles: latestFiles };
  statsCache.set(id, { time: now, data: result });
  return result;
}
