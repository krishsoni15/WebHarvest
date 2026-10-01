import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { resolveTargetDir, ensureJobExists, getBaseDownloadDir } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';

// Explicit MIME mappings for modern web assets to guarantee proper parsing
const MIME_OVERRIDES: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  try {
    const { id, path: pathSegments } = await params;

    // Ensure job exists (handles server restart / hot reload)
    if (!ensureJobExists(id)) {
      return new Response('Job not found', { status: 404 });
    }

    const job = activeJobs.get(id)!;
    const baseDir = getBaseDownloadDir(id);
    const targetDir = resolveTargetDir(id, job.hostname);

    if (!fs.existsSync(targetDir)) {
      return new Response('Download files not found', { status: 404 });
    }

    // Default to index.html if no path is provided
    const segments = pathSegments && pathSegments.length > 0 ? pathSegments : ['index.html'];
    const primaryPath = path.join(targetDir, ...segments);

    // Helper to resolve exact file, .html variant, or directory index
    function resolveFileOrDirectoryIndex(p: string): string | null {
      try {
        let actualPath = p;

        // 1. Direct path exists
        if (fs.existsSync(actualPath)) {
          const stat = fs.statSync(actualPath);
          if (stat.isDirectory()) {
            const indexHtml = path.join(actualPath, 'index.html');
            if (fs.existsSync(indexHtml) && !fs.statSync(indexHtml).isDirectory()) {
              return indexHtml;
            }
          } else {
            return actualPath;
          }
        }

        // 2. Extensionless route check (e.g. /apps/email -> /apps/email.html)
        if (fs.existsSync(actualPath + '.html')) {
          return actualPath + '.html';
        }
        if (fs.existsSync(actualPath + '.htm')) {
          return actualPath + '.htm';
        }

        // 3. Fallback: match file ignoring query parameters or URL-encoded symbols
        const dir = path.dirname(p);
        const base = path.basename(p);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const cleanBase = base.split('?')[0].split('%3F')[0].split('@')[0];
          const matched = files.find(f => {
            if (f === base) return true;
            const cleanF = f.split('?')[0].split('%3F')[0].split('@')[0];
            if (cleanF === cleanBase || cleanF === base) return true;
            if (f.startsWith(base + '?') || f.startsWith(base + '%3F') || f.startsWith(base + '@')) return true;
            if (f.startsWith(cleanBase + '?') || f.startsWith(cleanBase + '%3F') || f.startsWith(cleanBase + '@')) return true;
            return false;
          });
          if (matched) {
            return path.join(dir, matched);
          }
        }
      } catch {}
      return null;
    }

    let resolvedFilePath = resolveFileOrDirectoryIndex(primaryPath);
    let pathFound = resolvedFilePath !== null;
    let filePath = resolvedFilePath || primaryPath;

    // Fallback 1: Search across all subdirectories in baseDir (handles multi-domain crawls like pixinvent.com vs demos.pixinvent.com)
    if (!pathFound) {
      try {
        const subdirs = fs.readdirSync(baseDir).filter(f => {
          try {
            const p = path.join(baseDir, f);
            return fs.statSync(p).isDirectory() && !f.startsWith('.');
          } catch {
            return false;
          }
        });

        const primaryDomain = job.hostname.replace('www.', '');
        const sortedSubdirs = subdirs.sort((a, b) => {
          const aMatch = a.toLowerCase().includes(primaryDomain) ? 1 : 0;
          const bMatch = b.toLowerCase().includes(primaryDomain) ? 1 : 0;
          return bMatch - aMatch;
        });

        for (const dir of sortedSubdirs) {
          const altPath = path.join(baseDir, dir, ...segments);
          const resolvedAlt = resolveFileOrDirectoryIndex(altPath);
          if (resolvedAlt) {
            filePath = resolvedAlt;
            pathFound = true;
            break;
          }
        }
      } catch {}
    }

    // Fallback 2: Direct filename search across baseDir for static assets (CSS, JS, fonts, images)
    if (!pathFound && segments.length > 0) {
      const fileName = segments[segments.length - 1].split('?')[0];
      const ext = path.extname(fileName).toLowerCase();
      if (['.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.json', '.webp', '.ico'].includes(ext)) {
        const found = findFileRecursive(baseDir, fileName);
        if (found) {
          filePath = found;
          pathFound = true;
        }
      }
    }

    // Fallback 3: Single Page Application (SPA) routing fallback
    // If an HTML navigation route is requested and no specific page exists on disk, serve the main index.html
    if (!pathFound) {
      const requestedExt = path.extname(segments[segments.length - 1] || '');
      const isRouteRequest = !requestedExt || requestedExt === '.html' || requestedExt === '.htm';
      if (isRouteRequest) {
        const rootIndex = path.join(targetDir, 'index.html');
        const baseIndex = path.join(baseDir, 'index.html');
        if (fs.existsSync(rootIndex)) {
          filePath = rootIndex;
          pathFound = true;
        } else if (fs.existsSync(baseIndex)) {
          filePath = baseIndex;
          pathFound = true;
        }
      }
    }

    // Security: Prevent directory traversal attacks
    const safeBaseJob = path.resolve(baseDir);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(safeBaseJob)) {
      return new Response('Forbidden: Path traversal detected', { status: 403 });
    }

    if (!pathFound || !fs.existsSync(filePath)) {
      return new Response(`File not found: ${segments.join('/')}`, { status: 404 });
    }

    let fileBuffer = fs.readFileSync(filePath);
    const cleanExt = path.extname(filePath.split('?')[0]).toLowerCase();
    const mimeType = MIME_OVERRIDES[cleanExt] || mime.lookup(filePath.split('?')[0]) || 'application/octet-stream';

    // Intercept and adapt HTML/CSS content
    if (mimeType.startsWith('text/html') || mimeType.startsWith('text/css')) {
      let content = fileBuffer.toString('utf-8');

      if (job.status === 'completed') {
        const cleanHostname = job.hostname.toLowerCase().replace('www.', '');
        const domainRegex = new RegExp(`(?:https?:)?//(?:www\\.)?${escapeRegExp(cleanHostname)}\\/?`, 'gi');
        content = content.replace(domainRegex, `/api/mirror/${id}/preview/`);
      }

      if (mimeType.startsWith('text/html')) {
        // Inject script to override IntersectionObserver and preserve offline hydration
        const observerOverrideScript = `
          <script>
            (function() {
              // Ensure cookie is set for asset routing
              try { document.cookie = "webharvest_preview_id=${id}; path=/; SameSite=Lax"; } catch(e) {}

              // Force eager loading for images and components
              if (window.IntersectionObserver) {
                const OriginalObserver = window.IntersectionObserver;
                window.IntersectionObserver = class extends OriginalObserver {
                  constructor(callback, options) {
                    super(callback, options);
                    this._callback = callback;
                  }
                  observe(target) {
                    super.observe(target);
                    setTimeout(() => {
                      try {
                        this._callback([{
                          target: target,
                          isIntersecting: true,
                          intersectionRatio: 1,
                          boundingClientRect: target.getBoundingClientRect(),
                          intersectionRect: target.getBoundingClientRect(),
                          rootBounds: {},
                          time: Date.now()
                        }], this);
                      } catch (e) {}
                    }, 50);
                  }
                };
              }
            })();
          </script>
        `;
        content = content.replace(/<head>/i, `<head>${observerOverrideScript}`);
        content = content.replace(/loading=["']lazy["']/gi, 'loading="eager"');
      }

      fileBuffer = Buffer.from(content, 'utf-8');
    }

    const download = req.nextUrl.searchParams.get('download');
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      // Attach active mirror preview cookie so all sub-resource requests route seamlessly
      'Set-Cookie': `webharvest_preview_id=${id}; Path=/; SameSite=Lax`,
    };

    if (download === 'true') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath.split('?')[0])}"`;
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else if (job.status === 'downloading') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
    }

    return new Response(fileBuffer, { headers });
  } catch (err: any) {
    return new Response(err.message || 'Internal server error', { status: 500 });
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Recursively search for a file by name within a directory */
function findFileRecursive(dir: string, targetName: string): string | null {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (item.startsWith('.')) continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const found = findFileRecursive(full, targetName);
        if (found) return found;
      } else if (item === targetName) {
        return full;
      }
    }
  } catch {}
  return null;
}
