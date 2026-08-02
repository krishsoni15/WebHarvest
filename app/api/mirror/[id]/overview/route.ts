import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { resolveTargetDir, ensureJobExists, getBaseDownloadDir } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';

export const dynamic = 'force-dynamic';

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
    if (job.cachedOverview) {
      if (job.status === 'completed' || (now - (job.lastOverviewUpdate || 0) < 4000)) {
        return NextResponse.json(job.cachedOverview);
      }
    }

    const baseDir = getBaseDownloadDir(id);
    const targetDir = resolveTargetDir(id, job.hostname);

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ error: 'Download directory not found' }, { status: 404 });
    }

    const stats = { pages: 0, images: 0, files: 0, size: 0 };

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

            const cleanFile = file.split('?')[0];
            const ext = path.extname(cleanFile).toLowerCase();
            if (ext === '.html' || ext === '.htm') {
              stats.pages++;
            } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
              stats.images++;
            }
          }
        }
      } catch {}
    }

    walk(targetDir);

    // Enhanced tech stack detection
    let techStack = 'Static HTML/CSS';
    let indexHtmlPath = path.join(targetDir, 'index.html');

    if (!fs.existsSync(indexHtmlPath)) {
      try {
        const subdirs = fs.readdirSync(baseDir).filter(f => {
          try {
            return fs.statSync(path.join(baseDir, f)).isDirectory() && !f.startsWith('.');
          } catch { return false; }
        });
        const cleanHostname = job.hostname.toLowerCase().replace('www.', '');
        const sortedSubdirs = subdirs.sort((a, b) => {
          const aMatch = a.toLowerCase().includes(cleanHostname) ? 1 : 0;
          const bMatch = b.toLowerCase().includes(cleanHostname) ? 1 : 0;
          return bMatch - aMatch;
        });
        const indexMatch = sortedSubdirs.find(d => fs.existsSync(path.join(baseDir, d, 'index.html')));
        if (indexMatch) {
          indexHtmlPath = path.join(baseDir, indexMatch, 'index.html');
        }
      } catch {}
    }

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
        } else if (/_next\/static|__next|next\.js/i.test(content)) {
          techStack = 'Next.js (React)';
        } else if (/vue\.js|nuxt|__nuxt/i.test(content)) {
          techStack = 'Vue.js / Nuxt';
        } else if (/ng-version|angular/i.test(content)) {
          techStack = 'Angular';
        } else if (/gatsby/i.test(content)) {
          techStack = 'Gatsby (React)';
        } else if (/ghost\.org|ghost-/i.test(content)) {
          techStack = 'Ghost CMS';
        } else if (/drupal/i.test(content)) {
          techStack = 'Drupal';
        } else if (/joomla/i.test(content)) {
          techStack = 'Joomla';
        } else if (/tailwindcss|tailwind/i.test(content)) {
          techStack = 'Tailwind CSS';
        } else if (/bootstrap/i.test(content)) {
          techStack = 'Bootstrap';
        } else if (/react/i.test(content)) {
          techStack = 'React';
        } else if (/jquery/i.test(content)) {
          techStack = 'jQuery';
        }
      } catch {}
    }

    const result = {
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
    };

    job.cachedOverview = result;
    job.lastOverviewUpdate = now;

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
