import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { activeJobs, activeProcesses, Job } from '@/lib/jobStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    // Follow redirects to resolve final target URL (like www. redirection)
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

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const downloadDir = path.join(process.cwd(), 'tmp', 'downloads', id);

    // Create the download directory
    fs.mkdirSync(downloadDir, { recursive: true });

    // Store in-memory metadata
    const newJob: Job = {
      id,
      url,
      hostname,
      status: 'downloading',
      addedAt: Date.now(),
    };
    activeJobs.set(id, newJob);

    // Spawn wget background process
    // Arguments:
    // --mirror: Recursively mirror the site
    // --page-requisites: Get all assets (CSS, JS, images) required to render pages
    // --adjust-extension: Append .html to files if required
    // --convert-links: Make all links relative for offline viewing
    // --no-parent: Prevent crawling parent domains/directories
    const logFilePath = path.join(downloadDir, 'crawl_logs.txt');
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    const wgetProcess = spawn('wget', [
      '--mirror',
      '--page-requisites',
      '--adjust-extension',
      '--convert-links',
      '--no-parent',
      '--span-hosts',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      `--directory-prefix=${downloadDir}`,
      url
    ]);

    // Pipe outputs to file log stream
    wgetProcess.stdout.pipe(logStream);
    wgetProcess.stderr.pipe(logStream);

    const timeout = setTimeout(() => {
      if (activeProcesses.has(id)) {
        console.log(`[TIMEOUT] Mirroring job ${id} exceeded 120s limit. Terminating wget.`);
        wgetProcess.kill('SIGTERM');
      }
    }, 120000);

    activeProcesses.set(id, wgetProcess);

    wgetProcess.on('close', (code) => {
      clearTimeout(timeout);
      logStream.end();
      activeProcesses.delete(id);
      const job = activeJobs.get(id);
      if (job) {
        // wget exits with 0 for success, and 8 for some warnings/errors, but we can accept both or treat non-zero as warnings
        // For security, if it completes we'll check if the directory actually has any files
        const sitePath = path.join(downloadDir, hostname);
        const hasFiles = fs.existsSync(sitePath) && fs.readdirSync(sitePath).length > 0;

        if (hasFiles) {
          job.status = 'completed';
        } else {
          job.status = 'failed';
          job.error = `wget failed to retrieve site files (exit code ${code})`;
        }
        job.completedAt = Date.now();
        activeJobs.set(id, job);
      }
    });

    wgetProcess.on('error', (err) => {
      clearTimeout(timeout);
      logStream.end();
      activeProcesses.delete(id);
      const job = activeJobs.get(id);
      if (job) {
        job.status = 'failed';
        job.error = err.message || 'Failed to execute wget process';
        job.completedAt = Date.now();
        activeJobs.set(id, job);
      }
    });

    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
