import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { activeJobs } from '@/lib/jobStore';

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

    const stats = {
      pages: 0,
      images: 0,
      files: 0,
      size: 0,
    };

    const dirToScan = fs.existsSync(targetDir) ? targetDir : baseDir;

    // Scan directory
    function walk(dir: string) {
      try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          if (file.startsWith('.')) continue;

          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (stat.isFile()) {
            stats.files++;
            stats.size += stat.size;

            const ext = path.extname(file).toLowerCase();
            if (ext === '.html' || ext === '.htm') {
              stats.pages++;
            } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
              stats.images++;
            }
          }
        }
      } catch {}
    }

    if (fs.existsSync(dirToScan)) {
      walk(dirToScan);
    }

    // Heuristics for Framework/CMS Stack detection
    let techStack = 'Static HTML/CSS';
    const indexHtmlPath = path.join(dirToScan, 'index.html');

    if (fs.existsSync(indexHtmlPath)) {
      try {
        const content = fs.readFileSync(indexHtmlPath, 'utf-8');
        if (/wp-content|wp-includes/i.test(content)) {
          techStack = 'WordPress';
        } else if (/cdn\.shopify\.com/i.test(content)) {
          techStack = 'Shopify';
        } else if (/wix\.com|_wix/i.test(content)) {
          techStack = 'Wix';
        } else if (/squarespace\.com/i.test(content)) {
          techStack = 'Squarespace';
        } else if (/webflow\.com|data-wf-page/i.test(content)) {
          techStack = 'Webflow';
        } else if (/_next\/static|next\.js/i.test(content)) {
          techStack = 'Next.js (React)';
        } else if (/vue\.js|nuxt/i.test(content)) {
          techStack = 'Vue.js';
        } else if (/angular/i.test(content)) {
          techStack = 'Angular';
        } else if (/jquery/i.test(content)) {
          techStack = 'jQuery Library';
        }
      } catch {}
    }

    return NextResponse.json({
      id: job.id,
      url: job.url,
      hostname: job.hostname,
      techStack,
      stats: {
        pages: stats.pages,
        images: stats.images,
        files: stats.files,
        size: formatBytes(stats.size),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
