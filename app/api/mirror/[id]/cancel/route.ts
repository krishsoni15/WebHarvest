import { NextRequest, NextResponse } from 'next/server';
import { JobManager } from '@/lib/jobs/manager';
import { activeProcesses } from '@/lib/jobStore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // 1. Cancel in background job queue
    const cancelledQueue = JobManager.cancelJob(id);

    // 2. Kill legacy process if running (wget)
    if (activeProcesses.has(id)) {
      const proc = activeProcesses.get(id);
      if (proc) {
        try {
          proc.kill('SIGTERM');
        } catch {}
      }
      activeProcesses.delete(id);
    }

    return NextResponse.json({
      success: true,
      jobId: id,
      status: 'cancelled',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel job' }, { status: 500 });
  }
}
