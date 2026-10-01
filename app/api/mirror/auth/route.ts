import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { activeJobs, Job } from '@/lib/jobStore';
import { getBaseDownloadDir } from '@/lib/resolveDir';
import { runAuthCrawler } from '@/lib/authCrawler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      loginUrl = 'https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/en/login',
      email = 'admin@vuexy.com',
      password = 'admin',
      targetPages = [
        'https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/en/dashboards/analytics',
        'https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/en/dashboards/crm',
        'https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/en/dashboards/ecommerce'
      ],
      headless = true
    } = body;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(loginUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid loginUrl format' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const downloadDir = getBaseDownloadDir(id);

    fs.mkdirSync(downloadDir, { recursive: true });

    const newJob: Job = {
      id,
      url: loginUrl,
      hostname,
      status: 'downloading',
      addedAt: Date.now(),
    };
    activeJobs.set(id, newJob);

    // Run crawler in background so response returns quickly
    runAuthCrawler({
      id,
      loginUrl,
      email,
      password,
      targetPages,
      downloadDir,
      headless
    }).catch(err => {
      console.error('Background Auth Crawler error:', err);
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'Authenticated crawler started',
      loginUrl,
      targetPagesCount: targetPages.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
