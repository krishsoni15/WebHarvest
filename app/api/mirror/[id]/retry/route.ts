import { NextRequest, NextResponse } from 'next/server';
import { JobManager } from '@/lib/jobs/manager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const newJob = await JobManager.retryJob(id);
    if (!newJob) {
      return NextResponse.json({ error: 'Original job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      newJobId: newJob.id,
      url: newJob.url,
      status: newJob.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retry job' }, { status: 500 });
  }
}
