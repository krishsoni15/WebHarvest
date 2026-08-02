import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { resolveTargetDir, ensureJobExists, getBaseDownloadDir } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';

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

    // Helper to verify if a path can be resolved (either as a file or directory with index.html)
    function resolveFileOrDirectoryIndex(p: string): string | null {
      try {
        let actualPath = p;
        if (!fs.existsSync(actualPath)) {
          // Fallback: check if the file exists on disk with query parameters appended (e.g. filename?v=123)
          const dir = path.dirname(p);
          const base = path.basename(p);
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            const matched = files.find(f => f === base || f.startsWith(base + '?'));
            if (matched) {
              actualPath = path.join(dir, matched);
            } else {
              return null;
            }
          } else {
            return null;
          }
        }

        const stat = fs.statSync(actualPath);
        if (stat.isDirectory()) {
          const indexHtml = path.join(actualPath, 'index.html');
          if (fs.existsSync(indexHtml) && !fs.statSync(indexHtml).isDirectory()) {
            return indexHtml;
          }
        } else {
          return actualPath;
        }
      } catch {}
      return null;
    }

    let resolvedFilePath = resolveFileOrDirectoryIndex(primaryPath);
    let pathFound = resolvedFilePath !== null;
    let filePath = resolvedFilePath || primaryPath;

    // Fallback: search across all subdirectories if not found in primary
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

    // Prevent directory traversal attacks
    const safeBaseJob = path.resolve(baseDir);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(safeBaseJob)) {
      return new Response('Forbidden: Path traversal detected', { status: 403 });
    }

    if (!pathFound) {
      return new Response(`File not found: ${segments.join('/')}`, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const indexHtmlPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        let fileBuffer = fs.readFileSync(indexHtmlPath);
        const mimeType = mime.lookup(indexHtmlPath) || 'text/html';
        
        let content = fileBuffer.toString('utf-8');

        // Rewrite links in index.html to load locally via preview API (only when completed)
        if (job.status === 'completed') {
          const cleanHostname = job.hostname.toLowerCase().replace('www.', '');
          const domainRegex = new RegExp(`(?:https?:)?//(?:www\\.)?${escapeRegExp(cleanHostname)}\\/?`, 'gi');
          content = content.replace(domainRegex, `/api/mirror/${id}/preview/`);
        }

        // Inject script to override IntersectionObserver for lazy-loading compatibility
        const observerOverrideScript = `
          <script>
            (function() {
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

        fileBuffer = Buffer.from(content, 'utf-8');

        const headers: Record<string, string> = {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': "frame-ancestors 'self'",
        };

        if (job.status === 'downloading') {
          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        } else {
          headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
        }

        return new Response(fileBuffer, { headers });
      }
      return new Response('Directory listing forbidden', { status: 403 });
    }

    // Serve the file with correct content-type
    let fileBuffer = fs.readFileSync(filePath);
    const mimeType = mime.lookup(filePath.split('?')[0]) || 'application/octet-stream';

    // Intercept and rewrite absolute links in HTML or CSS to point to local preview API (only when completed)
    if (mimeType.startsWith('text/html') || mimeType.startsWith('text/css')) {
      let content = fileBuffer.toString('utf-8');
      
      if (job.status === 'completed') {
        const cleanHostname = job.hostname.toLowerCase().replace('www.', '');
        const domainRegex = new RegExp(`(?:https?:)?//(?:www\\.)?${escapeRegExp(cleanHostname)}\\/?`, 'gi');
        content = content.replace(domainRegex, `/api/mirror/${id}/preview/`);
      }

      if (mimeType.startsWith('text/html')) {
        // Inject script to override IntersectionObserver for lazy-loading compatibility
        const observerOverrideScript = `
          <script>
            (function() {
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

    // Check if download is requested (for individual asset download)
    const download = req.nextUrl.searchParams.get('download');
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors 'self'",
    };

    if (download === 'true') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath.split('?')[0])}"`;
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else if (job.status === 'downloading') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
    }

    if (download === 'true') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath.split('?')[0])}"`;
    }

    return new Response(fileBuffer, { headers });
  } catch (err: any) {
    return new Response(err.message || 'Internal server error', { status: 500 });
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
