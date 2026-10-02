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

    // If download requested, serve entire log file as attachment
    if (req.nextUrl.searchParams.get('download') === 'true') {
      const fullLogs = fs.readFileSync(logFilePath, 'utf-8');
      return new NextResponse(fullLogs, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${id}-crawl-logs.txt"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Support configurable limit (default 3000, max 10000)
    const limitParam = req.nextUrl.searchParams.get('limit');
    const lineLimit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 3000, 100), 10000) : 3000;

    // Read up to 1MB of the log file tail for real-time streaming
    const stat = fs.statSync(logFilePath);
    const maxBytes = 1024 * 1024; // 1MB tail buffer
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

    // Return last N lines for UI display
    const lines = logs.trim().split('\n');
    const tailLines = lines.slice(-lineLimit).join('\n');

    return NextResponse.json(
      {
        logs: tailLines || 'No log output yet.',
        totalLines: lines.length,
        isTruncated: stat.size > maxBytes || lines.length > lineLimit,
      },
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read logs' }, { status: 500 });
  }
}

