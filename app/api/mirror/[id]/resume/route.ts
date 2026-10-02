import { NextRequest, NextResponse } from 'next/server';
import { activeJobs, activeJobControls } from '@/lib/jobStore';
import { jobQueue } from '@/lib/jobs/queue';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Unpause control
    const ctrl = activeJobControls.get(id);
    if (ctrl) {
      ctrl.isPaused = false;
      if (ctrl.pausePromiseResolve) {
        ctrl.pausePromiseResolve();
        ctrl.pausePromiseResolve = null;
      }
      activeJobControls.set(id, ctrl);
    }

    // Update active job status
    const job = activeJobs.get(id);
    if (job) {
      job.status = 'downloading';
      activeJobs.set(id, job);
    }

    // Try resuming BackgroundJobQueue engine if active
    try {
      jobQueue.resume?.(id);
    } catch {}

    return NextResponse.json({
      success: true,
      jobId: id,
      status: 'downloading',
      message: 'Crawl resumed from last position.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resume job' }, { status: 500 });
  }
}
