import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getBaseDownloadDir } from '@/lib/resolveDir';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logFilePath = path.join(getBaseDownloadDir(id), 'crawl_logs.txt');

    if (!fs.existsSync(logFilePath)) {
      return NextResponse.json({ logs: 'Waiting for crawl process to start...' });
    }

    // Read only the last ~32KB of the log file to prevent massive payloads
    const stat = fs.statSync(logFilePath);
    const maxBytes = 32 * 1024;
    let logs: string;

    if (stat.size <= maxBytes) {
      logs = fs.readFileSync(logFilePath, 'utf-8');
    } else {
      // Read only the tail portion
      const fd = fs.openSync(logFilePath, 'r');
      const buffer = Buffer.alloc(maxBytes);
      fs.readSync(fd, buffer, 0, maxBytes, stat.size - maxBytes);
      fs.closeSync(fd);
      // Skip the first partial line
      const text = buffer.toString('utf-8');
      const firstNewline = text.indexOf('\n');
      logs = firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
    }

    // Return only last 200 lines for UI display
    const lines = logs.trim().split('\n');
    const tailLines = lines.slice(-200).join('\n');

    return NextResponse.json({ logs: tailLines || 'No log output yet.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read logs' }, { status: 500 });
  }
}
