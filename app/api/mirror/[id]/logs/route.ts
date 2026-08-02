import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logFilePath = path.join(process.cwd(), 'tmp', 'downloads', id, 'crawl_logs.txt');

    if (!fs.existsSync(logFilePath)) {
      return NextResponse.json({ logs: 'No crawl logs recorded.' });
    }

    const logs = fs.readFileSync(logFilePath, 'utf-8');
    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read logs' }, { status: 500 });
  }
}
