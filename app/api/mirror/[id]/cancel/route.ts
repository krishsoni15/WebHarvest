import { NextRequest, NextResponse } from 'next/server';
import { JobManager } from '@/lib/jobs/manager';
import { activeProcesses, activeJobs, activeJobControls } from '@/lib/jobStore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Parse options from body or query
    let purge = req.nextUrl.searchParams.get('purge') === 'true';
    let keepSnapshot = req.nextUrl.searchParams.get('keepSnapshot') === 'true';

    try {
      const body = await req.json();
      if (typeof body.purge === 'boolean') purge = body.purge;
      if (typeof body.keepSnapshot === 'boolean') keepSnapshot = body.keepSnapshot;
    } catch {}

    // Signal active crawler control
    const ctrl = activeJobControls.get(id) || { isPaused: false, isCancelled: false };
    ctrl.isCancelled = true;
    ctrl.purgeOnCancel = purge;
    if (ctrl.pausePromiseResolve) {
      ctrl.pausePromiseResolve();
      ctrl.pausePromiseResolve = null;
    }
    activeJobControls.set(id, ctrl);

    // 1. Cancel in background job queue
    JobManager.cancelJob(id);

    // 2. Kill legacy process if running
    if (activeProcesses.has(id)) {
      const proc = activeProcesses.get(id);
      if (proc) {
        try {
          proc.kill('SIGTERM');
        } catch {}
      }
      activeProcesses.delete(id);
    }

    if (purge) {
      // Purge data completely from disk
      await JobManager.deleteJob(id);
      activeJobs.delete(id);
      activeJobControls.delete(id);
      return NextResponse.json({
        success: true,
        jobId: id,
        status: 'deleted',
        message: 'Crawl stopped and all downloaded files have been deleted.',
      });
    } else {
      // Keep captured snapshot intact
      const job = activeJobs.get(id);
      if (job) {
        job.status = keepSnapshot ? 'completed' : 'cancelled';
        activeJobs.set(id, job);
      }
      return NextResponse.json({
        success: true,
        jobId: id,
        status: keepSnapshot ? 'completed' : 'cancelled',
        message: 'Crawl halted. Existing snapshot preserved for preview.',
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel job' }, { status: 500 });
  }
}
