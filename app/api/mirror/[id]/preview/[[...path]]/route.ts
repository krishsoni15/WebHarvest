import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { activeJobs } from '@/lib/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  try {
    const { id, path: pathSegments } = await params;
    const job = activeJobs.get(id);

    if (!job) {
      return new Response('Job not found', { status: 404 });
    }

    const baseDir = path.join(process.cwd(), 'tmp', 'downloads', id);
    let targetDir = path.join(baseDir, job.hostname);
    if (!fs.existsSync(targetDir)) {
      if (job.hostname.startsWith('www.')) {
        const noWww = path.join(baseDir, job.hostname.substring(4));
        if (fs.existsSync(noWww)) targetDir = noWww;
      } else {
        const withWww = path.join(baseDir, 'www.' + job.hostname);
        if (fs.existsSync(withWww)) targetDir = withWww;
      }
    }

    if (!fs.existsSync(targetDir)) {
      try {
        const subdirs = fs.readdirSync(baseDir).filter(f => {
          const p = path.join(baseDir, f);
          return fs.statSync(p).isDirectory() && !f.startsWith('.');
        });
        const indexMatch = subdirs.find(d => fs.existsSync(path.join(baseDir, d, 'index.html')));
        if (indexMatch) {
          targetDir = path.join(baseDir, indexMatch);
        } else if (subdirs.length > 0) {
          const primaryDir = subdirs.find(d => !d.includes('cdn') && !d.includes('google') && !d.includes('cloudflare'));
          if (primaryDir) {
            targetDir = path.join(baseDir, primaryDir);
          }
        }
      } catch {}
    }

    if (!fs.existsSync(targetDir)) {
      return new Response('Download files not found', { status: 404 });
    }

    // Default to index.html if no path is provided
    const segments = pathSegments && pathSegments.length > 0 ? pathSegments : ['index.html'];
    const filePath = path.join(targetDir, ...segments);

    // Prevent directory traversal attacks
    const safeBase = path.resolve(targetDir);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(safeBase)) {
      return new Response('Forbidden: Path traversal detected', { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new Response(`File not found: ${segments.join('/')}`, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // If it's a directory, check if there's an index.html inside it
      const indexHtmlPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        const fileBuffer = fs.readFileSync(indexHtmlPath);
        const mimeType = mime.lookup(indexHtmlPath) || 'text/html';
        return new Response(fileBuffer, {
          headers: {
            'Content-Type': mimeType,
            'X-Frame-Options': 'ALLOWALL',
            'Content-Security-Policy': "frame-ancestors 'self'",
          },
        });
      }
      return new Response('Directory listing forbidden', { status: 403 });
    }

    // Read the file and serve it with correct content-type
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stat.size.toString(),
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    });
  } catch (err: any) {
    return new Response(err.message || 'Internal server error', { status: 500 });
  }
}
