import { NextRequest, NextResponse } from 'next/server';
import { activeJobs, activeJobControls } from '@/lib/jobStore';
import { JobManager } from '@/lib/jobs/manager';
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

    // Update job control
    const ctrl = activeJobControls.get(id) || { isPaused: false, isCancelled: false };
    ctrl.isPaused = true;
    activeJobControls.set(id, ctrl);

    // Update active job status
    const job = activeJobs.get(id);
    if (job) {
      job.status = 'paused';
      activeJobs.set(id, job);
    }

    // Try pausing BackgroundJobQueue engine if active
    try {
      jobQueue.pause?.(id);
    } catch {}

    return NextResponse.json({
      success: true,
      jobId: id,
      status: 'paused',
      message: 'Crawl paused. Current progress safely frozen.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to pause job' }, { status: 500 });
  }
}
