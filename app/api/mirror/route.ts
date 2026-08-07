import { NextRequest, NextResponse } from 'next/server';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { activeJobs, activeProcesses, Job } from '@/lib/jobStore';
import { getBaseDownloadDir } from '@/lib/resolveDir';
import { runNativeMirror } from '@/lib/nativeMirror';

// Rate limiting: max concurrent downloads
const MAX_CONCURRENT_JOBS = 5;

// Blocked hostnames/IPs for security
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
];

function prepareWgetBinary(): string {
  // Always prefer system 'wget' if available in PATH
  try {
    const check = spawnSync('wget', ['--version']);
    if (check.status === 0) {
      return 'wget';
    }
  } catch {}

  const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER || process.env.NODE_ENV === 'production');
  
  if (isServerless) {
    const targetPath = path.join(os.tmpdir(), 'wget');
    const sourcePath = path.join(process.cwd(), 'bin', 'wget');
    
    try {
      if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        fs.chmodSync(targetPath, '755');
        return targetPath;
      }
    } catch {}
  }

  // Locally, use the bundled binary as last resort
  const localBinPath = path.join(process.cwd(), 'bin', 'wget');
  if (fs.existsSync(localBinPath)) {
    try {
      fs.chmodSync(localBinPath, '755');
      return localBinPath;
    } catch {}
  }
  
  return 'wget';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Trim and sanitize
    url = url.trim();
    if (url.length > 2048) {
      return NextResponse.json({ error: 'URL is too long' }, { status: 400 });
    }

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Security: block private/internal hostnames
    const hostname = parsedUrl.hostname;
    if (BLOCKED_PATTERNS.some(pattern => pattern.test(hostname))) {
      return NextResponse.json({ error: 'Cannot mirror local or private network addresses' }, { status: 400 });
    }

    // Rate limiting: check concurrent job count
    const activeCount = Array.from(activeJobs.values()).filter(j => j.status === 'downloading').length;
    if (activeCount >= MAX_CONCURRENT_JOBS) {
      return NextResponse.json({ error: `Server busy: ${activeCount} mirrors in progress. Please try again shortly.` }, { status: 429 });
    }

    // Follow redirects to resolve final target URL
    let resolvedUrl = url;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeoutId);
      resolvedUrl = res.url;
    } catch (e) {
      console.warn("Failed to resolve URL redirect, using original:", e);
    }
    url = resolvedUrl;

    // Re-parse after redirect resolution
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL after redirect resolution' }, { status: 400 });
    }

    const resolvedHostname = parsedUrl.hostname;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const downloadDir = getBaseDownloadDir(id);

    fs.mkdirSync(downloadDir, { recursive: true });

    const newJob: Job = {
      id,
      url,
      hostname: resolvedHostname,
      status: 'downloading',
      addedAt: Date.now(),
    };
    activeJobs.set(id, newJob);

    // Save job state to disk for stateless serverless functions
    try {
      fs.writeFileSync(path.join(downloadDir, 'job.json'), JSON.stringify(newJob, null, 2));
    } catch {}

    const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);

    if (isServerless) {
      // Execute high-speed native Node mirroring for Vercel
      const result = await runNativeMirror(id, url, resolvedHostname, downloadDir);
      return NextResponse.json(result);
    }

    // Spawn wget background process locally
    const logFilePath = path.join(downloadDir, 'crawl_logs.txt');
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    const cleanHostname = resolvedHostname.toLowerCase().replace('www.', '');
    const domains = `${cleanHostname},www.${cleanHostname}`;

    const wgetExecutable = prepareWgetBinary();
    let wgetProcess: any;

    try {
      wgetProcess = spawn(wgetExecutable, [
        '--mirror',
        '--page-requisites',
        '--adjust-extension',
        '--convert-links',
        '--no-parent',
        '--span-hosts',
        `--domains=${domains}`,
        '--timeout=8',
        '--tries=1',
        '--wait=0',
        '--no-check-certificate',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        `--directory-prefix=${downloadDir}`,
        url
      ]);
    } catch (e) {
      // Fallback to Native Node Scraper if spawn fails
      console.warn("Failed to spawn wget, falling back to Native Mirroring:", e);
      await runNativeMirror(id, url, resolvedHostname, downloadDir);
      return NextResponse.json({ id });
    }

    wgetProcess.stdout.pipe(logStream);
    wgetProcess.stderr.pipe(logStream);

    const timeout = setTimeout(() => {
      if (activeProcesses.has(id)) {
        console.log(`[TIMEOUT] Mirroring job ${id} exceeded 300s limit. Terminating wget.`);
        wgetProcess.kill('SIGTERM');
      }
    }, 300000); // 5 minutes overall timeout limit

    activeProcesses.set(id, wgetProcess);

    wgetProcess.on('close', (code: number | null) => {
      clearTimeout(timeout);
      logStream.end();
      activeProcesses.delete(id);
      const job = activeJobs.get(id);
      if (job) {
        let hasFiles = false;
        try {
          if (fs.existsSync(downloadDir)) {
            const items = fs.readdirSync(downloadDir).filter(f => !f.startsWith('.') && f !== 'job.json');
            hasFiles = items.length > 0;
          }
        } catch {}

        if (hasFiles) {
          job.status = 'completed';
        } else {
          job.status = 'failed';
          job.error = `wget failed to retrieve site files (exit code ${code ?? 'terminated'})`;
        }
        job.completedAt = Date.now();
        activeJobs.set(id, job);
        try {
          fs.writeFileSync(path.join(downloadDir, 'job.json'), JSON.stringify(job, null, 2));
        } catch {}
      }
    });

    wgetProcess.on('error', async (err: any) => {
      clearTimeout(timeout);
      logStream.end();
      activeProcesses.delete(id);
      // Fallback to native mirror if process error
      await runNativeMirror(id, url, resolvedHostname, downloadDir);
    });

    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
