/**
 * WebHarvest HTML Resource Discovery
 *
 * Replaces fragile regular expressions with high-performance Cheerio (DOM) parsing.
 * Discovers links for deep crawling and extracts every resource reference
 * (images, scripts, styles, fonts, media, favicons, manifests, and inline styles).
 */

import * as cheerio from 'cheerio';
import { normalizeURL } from '../normalize';

export interface DiscoveredResource {
  rawUrl: string;
  resolvedUrl: string;
  type: 'stylesheet' | 'script' | 'image' | 'font' | 'video' | 'audio' | 'manifest' | 'document' | 'threed' | 'sourcemap' | 'other';
  attribute: string;
  tag: string;
  isInlineStyle?: boolean;
}

export interface DiscoveredLink {
  rawUrl: string;
  resolvedUrl: string;
  anchorText?: string;
  isNavigation: boolean;
}

export interface HTMLDiscoveryResult {
  links: DiscoveredLink[];
  resources: DiscoveredResource[];
  title?: string;
  metaTags: Record<string, string>;
  hasInlineScripts: boolean;
  hasFrameworkRoots: boolean;
}

/**
 * Resolves a potentially relative URL against a base URL.
 */
function resolveUrl(url: string, baseURL: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#')
  ) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, baseURL).href;
    return normalizeURL(resolved);
  } catch {
    return null;
  }
}

/**
 * Parses srcset attribute (e.g. "image-320w.jpg 320w, image-480w.jpg 480w")
 */
function parseSrcset(srcset: string, baseURL: string): DiscoveredResource[] {
  const results: DiscoveredResource[] = [];
  const entries = srcset.split(',');

  for (const entry of entries) {
    const parts = entry.trim().split(/\s+/);
    if (parts.length > 0 && parts[0]) {
      const resolved = resolveUrl(parts[0], baseURL);
      if (resolved) {
        results.push({
          rawUrl: parts[0],
          resolvedUrl: resolved,
          type: 'image',
          attribute: 'srcset',
          tag: 'img/source',
        });
      }
    }
  }

  return results;
}

/**
 * Extracts URLs from inline style attributes like style="background-image: url('...')"
 */
function extractUrlsFromStyleAttr(style: string, baseURL: string): DiscoveredResource[] {
  const results: DiscoveredResource[] = [];
  const urlRegex = /url\(\s*(?:['"]?)(.*?)(?:['"]?)\s*\)/gi;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(style)) !== null) {
    const raw = match[1];
    const resolved = resolveUrl(raw, baseURL);
    if (resolved) {
      results.push({
        rawUrl: raw,
        resolvedUrl: resolved,
        type: 'image',
        attribute: 'style',
        tag: 'style-inline',
        isInlineStyle: true,
      });
    }
  }

  return results;
}

/**
 * Discover all navigable links and embedded resources in an HTML string.
 */
export function discoverHTML(html: string, baseURL: string): HTMLDiscoveryResult {
  const $ = cheerio.load(html);
  const links: DiscoveredLink[] = [];
  const resources: DiscoveredResource[] = [];
  const metaTags: Record<string, string> = {};

  const seenLinks = new Set<string>();
  const seenResources = new Set<string>();

  function addResource(res: DiscoveredResource) {
    if (!seenResources.has(res.resolvedUrl)) {
      seenResources.add(res.resolvedUrl);
      resources.push(res);
    }
  }

  function addLink(link: DiscoveredLink) {
    if (!seenLinks.has(link.resolvedUrl)) {
      seenLinks.add(link.resolvedUrl);
      links.push(link);
    }
  }

  // 1. Page Title & Meta tags
  const title = $('title').first().text().trim() || undefined;
  $('meta').each((_, el) => {
    const rawName = $(el).attr('name') || $(el).attr('property') || '';
    const name = rawName.toLowerCase();
    const content = $(el).attr('content');
    if (name && content) {
      metaTags[name] = content;
      // Social/OG Images - only match genuine image resource URLs, exclude dimensions (width, height, type)
      const isImageMeta =
        ['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src', 'image'].includes(name);
      if (isImageMeta && !/^\d+$/.test(content.trim()) && !/^image\//i.test(content.trim())) {
        const resolved = resolveUrl(content, baseURL);
        if (resolved) {
          addResource({
            rawUrl: content,
            resolvedUrl: resolved,
            type: 'image',
            attribute: rawName,
            tag: 'meta',
          });
        }
      }
    }
  });

  // 2. Links: <a href>, <area href>
  $('a[href], area[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const resolved = resolveUrl(href, baseURL);
    if (!resolved) return;

    const lower = resolved.toLowerCase();
    const isImage =
      /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)(\?.*)?$/i.test(resolved) ||
      lower.includes('/_next/image') ||
      lower.includes('/opengraph-image') ||
      lower.includes('/twitter-image') ||
      lower.includes('/apple-icon') ||
      (lower.includes('/image?') && (lower.includes('url=') || lower.includes('src=')));

    const isDocument = /\.(pdf|docx?|xlsx?|csv|zip|tar|gz)(\?.*)?$/i.test(resolved);
    const isMedia = /\.(mp4|webm|mp3|wav|ogg)(\?.*)?$/i.test(resolved);

    if (isImage) {
      addResource({
        rawUrl: href,
        resolvedUrl: resolved,
        type: 'image',
        attribute: 'href',
        tag: 'a',
      });
    } else if (isDocument) {
      addResource({
        rawUrl: href,
        resolvedUrl: resolved,
        type: 'document',
        attribute: 'href',
        tag: 'a',
      });
    } else if (isMedia) {
      addResource({
        rawUrl: href,
        resolvedUrl: resolved,
        type: 'video',
        attribute: 'href',
        tag: 'a',
      });
    } else {
      addLink({
        rawUrl: href,
        resolvedUrl: resolved,
        anchorText: $(el).text().trim().slice(0, 100),
        isNavigation: true,
      });
    }
  });

  // 3. Stylesheets, Icons & Preloaded Assets: <link>
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    const rel = ($(el).attr('rel') || '').toLowerCase().trim();
    if (!href) return;

    // Filter out non-resource browser hints and metadata links
    const nonResourceRels = [
      'dns-prefetch',
      'preconnect',
      'prefetch',
      'prerender',
      'profile',
      'pingback',
      'canonical',
      'shortlink',
      'alternate',
      'search',
      'help',
      'license',
      'author',
      'prev',
      'next',
    ];
    const isStylesheet = rel.includes('stylesheet');
    const isIcon = rel.includes('icon') || rel.includes('apple-touch-icon');
    const isManifest = rel.includes('manifest');
    const isPreload = rel.includes('preload') && Boolean($(el).attr('as'));

    // If it's a non-resource link and not an explicit stylesheet or icon, ignore it completely
    if (nonResourceRels.some((nr) => rel.includes(nr)) && !isStylesheet && !isIcon) {
      return;
    }

    if (!isStylesheet && !isIcon && !isManifest && !isPreload) {
      return;
    }

    const resolved = resolveUrl(href, baseURL);
    if (!resolved) return;

    let type: DiscoveredResource['type'] = 'other';
    if (isStylesheet) {
      type = 'stylesheet';
    } else if (isIcon) {
      type = 'image';
    } else if (isManifest) {
      type = 'manifest';
    } else if (isPreload) {
      const as = ($(el).attr('as') || '').toLowerCase();
      if (as === 'style') type = 'stylesheet';
      else if (as === 'script') type = 'script';
      else if (as === 'font') type = 'font';
      else if (as === 'image') type = 'image';
      else type = 'other';
    }

    addResource({
      rawUrl: href,
      resolvedUrl: resolved,
      type,
      attribute: 'href',
      tag: 'link',
    });
  });

  // 4. Scripts: <script src>
  let hasInlineScripts = false;
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveUrl(src, baseURL);
      if (resolved) {
        addResource({
          rawUrl: src,
          resolvedUrl: resolved,
          type: 'script',
          attribute: 'src',
          tag: 'script',
        });
      }
    } else if ($(el).html()?.trim()) {
      hasInlineScripts = true;
    }
  });

  // 5. Images: <img src>, <img srcset>, lazyload data-src
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveUrl(src, baseURL);
      if (resolved) {
        addResource({
          rawUrl: src,
          resolvedUrl: resolved,
          type: 'image',
          attribute: 'src',
          tag: 'img',
        });
      }
    }

    const dataSrc = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original');
    if (dataSrc) {
      const resolved = resolveUrl(dataSrc, baseURL);
      if (resolved) {
        addResource({
          rawUrl: dataSrc,
          resolvedUrl: resolved,
          type: 'image',
          attribute: 'data-src',
          tag: 'img',
        });
      }
    }

    const srcset = $(el).attr('srcset');
    if (srcset) {
      parseSrcset(srcset, baseURL).forEach(addResource);
    }

    const dataSrcset = $(el).attr('data-srcset');
    if (dataSrcset) {
      parseSrcset(dataSrcset, baseURL).forEach(addResource);
    }
  });

  // 6. Media Elements: <audio>, <video>, <source>, <track>
  $('video[src], audio[src]').each((_, el) => {
    const src = $(el).attr('src');
    const isVideo = el.tagName.toLowerCase() === 'video';
    if (src) {
      const resolved = resolveUrl(src, baseURL);
      if (resolved) {
        addResource({
          rawUrl: src,
          resolvedUrl: resolved,
          type: isVideo ? 'video' : 'audio',
          attribute: 'src',
          tag: el.tagName.toLowerCase(),
        });
      }
    }
    const poster = $(el).attr('poster');
    if (poster) {
      const resolved = resolveUrl(poster, baseURL);
      if (resolved) {
        addResource({
          rawUrl: poster,
          resolvedUrl: resolved,
          type: 'image',
          attribute: 'poster',
          tag: 'video',
        });
      }
    }
  });

  $('source[src], source[srcset]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveUrl(src, baseURL);
      if (resolved) {
        addResource({
          rawUrl: src,
          resolvedUrl: resolved,
          type: 'video', // Generic media
          attribute: 'src',
          tag: 'source',
        });
      }
    }
    const srcset = $(el).attr('srcset');
    if (srcset) {
      parseSrcset(srcset, baseURL).forEach(addResource);
    }
  });

  // 7. Embedded frames & objects: <iframe>, <embed>, <object>
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveUrl(src, baseURL);
      if (resolved) {
        addResource({
          rawUrl: src,
          resolvedUrl: resolved,
          type: 'document',
          attribute: 'src',
          tag: 'iframe',
        });
      }
    }
  });

  // 8. Inline styles on any element: [style]
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style) {
      extractUrlsFromStyleAttr(style, baseURL).forEach(addResource);
    }
  });

  // 9. SVG xlink:href / href
  $('use').each((_, el) => {
    const href = $(el).attr('xlink:href') || $(el).attr('href');
    if (href && !href.startsWith('#')) {
      const resolved = resolveUrl(href, baseURL);
      if (resolved) {
        addResource({
          rawUrl: href,
          resolvedUrl: resolved,
          type: 'image',
          attribute: 'href',
          tag: 'use',
        });
      }
    }
  });

  // 10. SPA / Framework Detection flags
  const hasFrameworkRoots =
    $('#root, #app, #__next, [data-reactroot], [data-v-app]').length > 0;

  return {
    links,
    resources,
    title,
    metaTags,
    hasInlineScripts,
    hasFrameworkRoots,
  };
}
