import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { resolveTargetDir, ensureJobExists } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ensureJobExists(id)) {
      return new Response('Job not found', { status: 404 });
    }

    const job = activeJobs.get(id)!;
    const targetDir = resolveTargetDir(id, job.hostname);

    if (!fs.existsSync(targetDir)) {
      return new Response('Downloaded files not found', { status: 404 });
    }

    const zip = new JSZip();

    function addDirectoryToZip(dir: string, baseDir: string) {
      try {
        const list = fs.readdirSync(dir);
        for (const item of list) {
          if (item.startsWith('.')) continue;

          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          const relativePath = path.relative(baseDir, fullPath);

          if (stat.isDirectory()) {
            addDirectoryToZip(fullPath, baseDir);
          } else if (stat.isFile()) {
            const fileData = fs.readFileSync(fullPath);
            zip.file(relativePath, fileData);
          }
        }
      } catch {}
    }

    addDirectoryToZip(targetDir, targetDir);

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${job.hostname}-mirror.zip"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return new Response(err.message || 'Internal server error', { status: 500 });
  }
}
