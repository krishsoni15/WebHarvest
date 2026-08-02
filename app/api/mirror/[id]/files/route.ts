import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
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
    const job = activeJobs.get(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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

    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ error: 'Download directory not found' }, { status: 404 });
    }

    const dirToScan = fs.existsSync(targetDir) ? targetDir : baseDir;

    const fileTree = buildFileTree(dirToScan, dirToScan);
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
      if (item.startsWith('.')) continue; // Skip hidden/dot files

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

  // Sort: Folders first alphabetically, then Files alphabetically
  return result.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
