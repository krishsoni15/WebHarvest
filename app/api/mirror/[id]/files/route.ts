import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { resolveTargetDir, ensureJobExists } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: string;
  children?: FileNode[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ensureJobExists(id)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = activeJobs.get(id)!;

    // Caching layer: return immediately if completed or cached within last 4 seconds
    const now = Date.now();
    if (job.cachedFileTree) {
      if (job.status === 'completed' || (now - (job.lastFilesUpdate || 0) < 4000)) {
        return NextResponse.json(job.cachedFileTree);
      }
    }

    const targetDir = resolveTargetDir(id, job.hostname);

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json([]);
    }

    const fileTree = buildFileTree(targetDir, targetDir);

    // Save cache
    job.cachedFileTree = fileTree;
    job.lastFilesUpdate = now;

    return NextResponse.json(fileTree);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function buildFileTree(dir: string, baseDir: string): FileNode[] {
  const result: FileNode[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (item.startsWith('.')) continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      const relativePath = path.relative(baseDir, fullPath);

      if (stat.isDirectory()) {
        result.push({
          name: item,
          type: 'directory',
          path: relativePath,
          children: buildFileTree(fullPath, baseDir),
        });
      } else if (stat.isFile()) {
        result.push({
          name: item,
          type: 'file',
          path: relativePath,
          size: formatBytes(stat.size),
        });
      }
    }
  } catch {}

  return result.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
