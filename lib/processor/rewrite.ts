/**
 * WebHarvest Link & Asset Rewriting Engine
 *
 * Rewrites URLs in HTML documents and CSS stylesheets so that:
 * 1. All internal references resolve to local files when served or viewed offline.
 * 2. Relative directory depth is maintained correctly from any page level.
 * 3. Inlined assets or data URIs are preserved.
 * 4. External links not captured remain absolute or point to their live web targets.
 */

import * as cheerio from 'cheerio';
import path from 'path';

export interface RewriteOptions {
  currentPageLocalPath: string; // e.g. "blog/post-1.html" or "index.html"
  urlToLocalMap: Map<string, string>; // Maps normalized URL to local file path
  previewPrefix?: string; // Optional proxy prefix e.g. "/api/mirror/[id]/preview"
}

/**
 * Calculates a relative path from the current page's directory to the target file.
 */
function getRelativePath(fromPageLocalPath: string, toTargetLocalPath: string): string {
  const fromDir = path.posix.dirname(fromPageLocalPath);
  let rel = path.posix.relative(fromDir, toTargetLocalPath);
  if (!rel.startsWith('.') && !rel.startsWith('/')) {
    rel = './' + rel;
  }
  return rel;
}

/**
 * Rewrites URLs inside an HTML string.
 */
export function rewriteHtmlUrls(html: string, options: RewriteOptions): string {
  const $ = cheerio.load(html);

  function resolveTarget(rawUrl: string): string | null {
    if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('javascript:') || rawUrl.startsWith('#')) {
      return null;
    }

    // 1. Exact match in map
    let localPath = options.urlToLocalMap.get(rawUrl);

    // 2. Clean URL without query/hash
    if (!localPath) {
      const clean = rawUrl.split('?')[0].split('#')[0];
      localPath = options.urlToLocalMap.get(clean);
    }

    // 3. Root-relative pathname match (e.g. /_next/static/chunks/foo.css)
    if (!localPath && rawUrl.startsWith('/')) {
      const cleanPath = rawUrl.split('?')[0].split('#')[0];
      localPath = options.urlToLocalMap.get(cleanPath);
    }

    // 4. Filename fallback (e.g. 017r-ibrf-le-.css)
    if (!localPath) {
      try {
        const clean = rawUrl.split('?')[0].split('#')[0];
        const baseName = path.posix.basename(clean);
        if (baseName && baseName.length > 3) {
          localPath = options.urlToLocalMap.get(baseName);
        }
      } catch {}
    }

    // 5. Next.js image optimizer fallback (extract inner url parameter)
    if (!localPath && (rawUrl.includes('/_next/image') || rawUrl.includes('/image?'))) {
      try {
        const dummyUrl = new URL(rawUrl, 'http://dummy');
        const innerUrl = dummyUrl.searchParams.get('url') || dummyUrl.searchParams.get('src');
        if (innerUrl) {
          localPath =
            options.urlToLocalMap.get(innerUrl) ||
            options.urlToLocalMap.get(decodeURIComponent(innerUrl)) ||
            options.urlToLocalMap.get(path.posix.basename(innerUrl));
        }
      } catch {}
    }

    if (!localPath) return null;

    if (options.previewPrefix) {
      return path.posix.join(options.previewPrefix, localPath);
    }

    return getRelativePath(options.currentPageLocalPath, localPath);
  }

  // 1. Rewrite <a href>
  $('a[href], area[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const rewritten = resolveTarget(href);
      if (rewritten) $(el).attr('href', rewritten);
    }
  });

  // 2. Rewrite <link href>
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const rewritten = resolveTarget(href);
      if (rewritten) $(el).attr('href', rewritten);
    }
  });

  // 3. Rewrite <script src>
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const rewritten = resolveTarget(src);
      if (rewritten) $(el).attr('src', rewritten);
    }
  });

  // 4. Rewrite <img src> and <img srcset>
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const rewritten = resolveTarget(src);
      if (rewritten) $(el).attr('src', rewritten);
    }
  });

  $('img[srcset], source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const entries = srcset.split(',').map((entry) => {
        const parts = entry.trim().split(/\s+/);
        if (parts[0]) {
          const rewritten = resolveTarget(parts[0]);
          if (rewritten) parts[0] = rewritten;
        }
        return parts.join(' ');
      });
      $(el).attr('srcset', entries.join(', '));
    }
  });

  // 5. Rewrite media <video>, <audio>, <source>, <track>
  $('video[src], audio[src], source[src], track[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const rewritten = resolveTarget(src);
      if (rewritten) $(el).attr('src', rewritten);
    }
  });

  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    if (poster) {
      const rewritten = resolveTarget(poster);
      if (rewritten) $(el).attr('poster', rewritten);
    }
  });

  // 6. Rewrite inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style && style.includes('url(')) {
      const rewritten = rewriteCssUrls(style, options.currentPageLocalPath, options);
      $(el).attr('style', rewritten);
    }
  });

  return $.html();
}

/**
 * Rewrites url(...) and @import references inside a CSS string.
 */
export function rewriteCssUrls(
  css: string,
  cssFileLocalPath: string,
  options: Pick<RewriteOptions, 'urlToLocalMap' | 'previewPrefix'>
): string {
  // Regex to match url(...) with optional quotes
  const urlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;

  return css.replace(urlRegex, (match, quote, targetUrl) => {
    const cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl || cleanUrl.startsWith('data:') || cleanUrl.startsWith('#')) {
      return match;
    }

    let localPath = options.urlToLocalMap.get(cleanUrl);
    if (!localPath) {
      const clean = cleanUrl.split('?')[0].split('#')[0];
      localPath = options.urlToLocalMap.get(clean);
    }
    if (!localPath && cleanUrl.startsWith('/')) {
      const clean = cleanUrl.split('?')[0].split('#')[0];
      localPath = options.urlToLocalMap.get(clean);
    }
    if (!localPath) {
      try {
        const baseName = path.posix.basename(cleanUrl.split('?')[0].split('#')[0]);
        if (baseName && baseName.length > 3) {
          localPath = options.urlToLocalMap.get(baseName);
        }
      } catch {}
    }

    if (!localPath) return match;

    let finalRef: string;
    if (options.previewPrefix) {
      finalRef = path.posix.join(options.previewPrefix, localPath);
    } else {
      finalRef = getRelativePath(cssFileLocalPath, localPath);
    }

    return `url(${quote || '"'}${finalRef}${quote || '"'})`;
  });
}
