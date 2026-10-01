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

    // Caching layer: return cached only within last 5 seconds unless refresh requested
    const now = Date.now();
    const shouldRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
    if (!shouldRefresh && job.cachedOverview && (now - (job.lastOverviewUpdate || 0) < 5000)) {
      return NextResponse.json(job.cachedOverview);
    }

    const baseDir = getBaseDownloadDir(id);
    const targetDir = resolveTargetDir(id, job.hostname);
    const effectiveDir = fs.existsSync(targetDir) ? targetDir : baseDir;

    if (!fs.existsSync(effectiveDir)) {
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

    walk(effectiveDir);

    // Enhanced tech stack detection
    let techStack = 'Static HTML/CSS';
    let indexHtmlPath = path.join(effectiveDir, 'index.html');

    // Fallback: search manifest or pages directory for HTML content if root index.html does not exist
    if (!fs.existsSync(indexHtmlPath)) {
      const manifestPath = path.join(baseDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const firstHtml = manifest.resources?.find((r: any) =>
            r.localPath && (r.localPath.endsWith('.html') || r.localPath.endsWith('.htm')) &&
            fs.existsSync(path.join(baseDir, r.localPath))
          );
          if (firstHtml) {
            indexHtmlPath = path.join(baseDir, firstHtml.localPath);
          }
        } catch {}
      }
    }

    if (!fs.existsSync(indexHtmlPath)) {
      const pagesDir = path.join(baseDir, 'pages');
      if (fs.existsSync(pagesDir)) {
        function findHtml(d: string): string | null {
          try {
            const list = fs.readdirSync(d);
            for (const item of list) {
              const full = path.join(d, item);
              if (fs.statSync(full).isDirectory()) {
                const found = findHtml(full);
                if (found) return found;
              } else if (item.endsWith('.html') || item.endsWith('.htm')) {
                return full;
              }
            }
          } catch {}
          return null;
        }
        const found = findHtml(pagesDir);
        if (found) indexHtmlPath = found;
      }
    }

    let htmlSample = '';
    if (fs.existsSync(indexHtmlPath)) {
      try {
        htmlSample = fs.readFileSync(indexHtmlPath, 'utf-8');
      } catch {}
    }

    // Also check root baseDir index.html if different
    const baseIndexPath = path.join(baseDir, 'index.html');
    if (fs.existsSync(baseIndexPath) && baseIndexPath !== indexHtmlPath) {
      try {
        htmlSample += ' ' + fs.readFileSync(baseIndexPath, 'utf-8').slice(0, 10000);
      } catch {}
    }

    // Also sample a couple other HTML or JS files in targetDir for deeper fingerprinting
    try {
      if (fs.existsSync(targetDir)) {
        const sampleFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.html') || f.endsWith('.js')).slice(0, 5);
        for (const sf of sampleFiles) {
          try {
            htmlSample += ' ' + fs.readFileSync(path.join(targetDir, sf), 'utf-8').slice(0, 5000);
          } catch {}
        }
      }
    } catch {}

    const fullContext = (job.url + ' ' + job.hostname + ' ' + htmlSample).toLowerCase();

    // 1. Template & Product Brand Fingerprints (e.g. Vuexy on Pixinvent)
    if (fullContext.includes('vuexy')) {
      if (fullContext.includes('nextjs') || fullContext.includes('_next')) {
        techStack = 'Vuexy (Next.js / React)';
      } else if (fullContext.includes('vue') || fullContext.includes('vuetify')) {
        techStack = 'Vuexy (Vue.js / Vuetify)';
      } else if (fullContext.includes('html') || fullContext.includes('bootstrap')) {
        techStack = 'Vuexy (HTML5 / Bootstrap)';
      } else {
        techStack = 'Vuexy Admin Template';
      }
    }
    // 2. Fullstack & Modern Web Frameworks (Next.js, Nuxt, SvelteKit, Astro)
    else if (/_next\/static|__next|next\.js/i.test(htmlSample) || fullContext.includes('nextjs')) {
      techStack = 'Next.js (React)';
    } else if (/_nuxt|__nuxt/i.test(htmlSample) || fullContext.includes('nuxt')) {
      techStack = 'Nuxt.js (Vue)';
    } else if (/__svelte|svelte-/i.test(htmlSample) || fullContext.includes('svelte')) {
      techStack = 'SvelteKit';
    } else if (/astro-/i.test(htmlSample) || fullContext.includes('astro')) {
      techStack = 'Astro';
    }
    // 3. Reactive UI Component Libraries (Vue.js, React, Angular)
    else if (/vue(\.min|\.runtime|\.esm)?\.js|vuetify|data-v-|__vue/i.test(htmlSample) || fullContext.includes('vuejs') || fullContext.includes('vuetify')) {
      techStack = fullContext.includes('bootstrap') ? 'Vue.js & Bootstrap' : 'Vue.js (Vuetify)';
    } else if (/react-dom|data-reactroot|react\.production|_react/i.test(htmlSample) || fullContext.includes('react')) {
      techStack = fullContext.includes('tailwind') ? 'React / Tailwind CSS' : 'React (ES Modules)';
    } else if (/ng-version|angular/i.test(htmlSample) || fullContext.includes('angular')) {
      techStack = 'Angular';
    } else if (/gatsby/i.test(htmlSample)) {
      techStack = 'Gatsby (React)';
    }
    // 4. Modern CSS & UI Frameworks
    else if (/tailwindcss|tailwind/i.test(htmlSample)) {
      techStack = 'Tailwind CSS (HTML5)';
    } else if (/bootstrap/i.test(htmlSample)) {
      techStack = 'Bootstrap 5 (HTML5)';
    }
    // 5. CMS & E-Commerce Platforms (Only when no modern frontend framework was prioritized)
    else if (/wp-content|wp-includes/i.test(htmlSample)) {
      techStack = 'WordPress';
    } else if (/cdn\.shopify\.com|shopify/i.test(htmlSample)) {
      techStack = 'Shopify';
    } else if (/webflow\.com|data-wf-page/i.test(htmlSample)) {
      techStack = 'Webflow';
    } else if (/wix\.com|_wix/i.test(htmlSample)) {
      techStack = 'Wix';
    } else if (/squarespace\.com/i.test(htmlSample)) {
      techStack = 'Squarespace';
    } else if (/ghost\.org|ghost-/i.test(htmlSample)) {
      techStack = 'Ghost CMS';
    } else if (/drupal/i.test(htmlSample)) {
      techStack = 'Drupal';
    } else if (/joomla/i.test(htmlSample)) {
      techStack = 'Joomla';
    } else if (/jquery/i.test(htmlSample)) {
      techStack = 'jQuery & HTML5';
    }

    // Extract brand color palette from CSS files or fallback to harmonious palette
    const extractedColors = extractColorsFromDir(baseDir);

    const result = {
      id: job.id,
      url: job.url,
      hostname: job.hostname,
      techStack,
      colors: extractedColors,
      status: job.status,
      error: job.error,
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

function extractColorsFromDir(baseDir: string): string[] {
  const defaultPalette = ['#e11d48', '#06b6d4', '#10b981', '#84cc16', '#a855f7'];
  try {
    const cssFiles: string[] = [];
    function findCss(dir: string) {
      if (!fs.existsSync(dir)) return;
      const list = fs.readdirSync(dir);
      for (const item of list) {
        if (item.startsWith('.')) continue;
        const full = path.join(dir, item);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            findCss(full);
          } else if (item.endsWith('.css')) {
            cssFiles.push(full);
          }
        } catch {}
      }
    }

    findCss(path.join(baseDir, 'assets', 'css'));
    if (cssFiles.length === 0) findCss(baseDir);

    const colorCounts = new Map<string, number>();
    const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    const ignoredColors = new Set(['#fff', '#ffffff', '#000', '#000000', '#111', '#111111', '#222', '#222222', '#333', '#333333', '#eee', '#eeeeee', '#f5f5f5', '#fafafa', '#ccc', '#cccccc', '#ddd', '#dddddd']);

    for (const file of cssFiles.slice(0, 5)) {
      try {
        const text = fs.readFileSync(file, 'utf-8');
        let match;
        while ((match = hexRegex.exec(text)) !== null) {
          let hex = match[0].toLowerCase();
          if (hex.length === 4) {
            hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
          }
          if (!ignoredColors.has(hex)) {
            colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
          }
        }
      } catch {}
    }

    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex);

    if (sortedColors.length >= 3) {
      const distinct: string[] = [];
      for (const c of sortedColors) {
        if (distinct.length >= 5) break;
        if (!distinct.includes(c)) distinct.push(c);
      }
      while (distinct.length < 5) {
        distinct.push(defaultPalette[distinct.length % defaultPalette.length]);
      }
      return distinct.slice(0, 5);
    }
  } catch {}
  return defaultPalette;
}

