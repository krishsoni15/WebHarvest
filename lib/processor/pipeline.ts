/**
 * WebHarvest Asset Processor Pipeline
 *
 * Coordinates processing of downloaded buffers:
 * - Computes SHA-256 hash for deduplication
 * - Determines local target file path based on URL structure or content-addressing
 * - Discovers nested resources in HTML and CSS
 * - Saves binary/text files to mirror workspace
 */

import path from 'path';
import fs from 'fs/promises';
import { hashBuffer } from './hash';
import { classifyResource, ResourceType } from './classify';
import { discoverHTML, DiscoveredResource, DiscoveredLink } from '../crawler/discovery/html';
import { discoverCSS, DiscoveredCSSResource } from '../crawler/discovery/css';

export interface ProcessedResource {
  url: string;
  localPath: string;
  type: ResourceType;
  status: number;
  size: number;
  contentType: string;
  sha256: string;
  discoveredFrom: string;
  downloadedAt: number;
  discoveredLinks?: DiscoveredLink[];
  discoveredResources?: Array<DiscoveredResource | DiscoveredCSSResource>;
  rawBuffer?: Buffer;
}

export class AssetProcessor {
  private seedHostname: string = '';

  constructor(private outputDir: string, private seedUrl?: string) {
    if (seedUrl) {
      try {
        this.seedHostname = new URL(seedUrl).hostname.toLowerCase();
      } catch {}
    }
  }

  /**
   * Generates a safe, clean local path structured according to the V3 folder hierarchy:
   * pages/ -> HTML pages
   * assets/{images,fonts,css,js,video,audio,documents,3d}/ -> Classified assets
   * data/api/ -> Captured API payloads
   */
  deriveLocalPath(urlStr: string, type: ResourceType, extension: string): string {
    try {
      const url = new URL(urlStr);
      let pathname = decodeURIComponent(url.pathname);

      // Root index.html handling: ONLY seed domain root page can be root index.html
      if (type === 'page' || !pathname || pathname === '/' || pathname === '/index.html' || pathname === '/index.htm') {
        if (!pathname || pathname === '/' || pathname === '/index.html' || pathname === '/index.htm') {
          // If we have a known seedHostname, ensure this root page actually belongs to the seed domain!
          if (this.seedHostname) {
            const host = url.hostname.toLowerCase();
            const cleanSeed = this.seedHostname.replace(/^www\./, '');
            const cleanHost = host.replace(/^www\./, '');
            if (cleanHost !== cleanSeed) {
              // External origin root page (e.g. fonts.googleapis.com/, cdnjs.cloudflare.com/) must NEVER overwrite index.html!
              return path.posix.join('pages', host.replace(/[^a-zA-Z0-9.-]/g, '_'), 'index.html');
            }
          }
          return 'index.html';
        }

        // Subpages are placed under pages/
        let pageRel = pathname.replace(/^\/+/, '');
        if (pageRel.endsWith('/')) {
          pageRel = path.posix.join(pageRel, 'index.html');
        } else if (!path.posix.extname(pageRel)) {
          pageRel += '.html';
        }
        pageRel = pageRel.replace(/[<>:"|?*]/g, '_');
        return path.posix.join('pages', pageRel);
      }

      // Non-page assets: organize by type category
      let categoryDir = 'assets/other';
      switch (type) {
        case 'stylesheet':
          categoryDir = 'assets/css';
          break;
        case 'script':
          categoryDir = 'assets/js';
          break;
        case 'image':
          categoryDir = 'assets/images';
          break;
        case 'font':
          categoryDir = 'assets/fonts';
          break;
        case 'video':
          categoryDir = 'assets/video';
          break;
        case 'audio':
          categoryDir = 'assets/audio';
          break;
        case 'threed':
          categoryDir = 'assets/3d';
          break;
        case 'document':
          categoryDir = 'assets/documents';
          break;
        case 'manifest':
          categoryDir = 'assets/manifests';
          break;
        case 'sourcemap':
          categoryDir = 'assets/sourcemaps';
          break;
        case 'api':
        case 'data':
          categoryDir = 'data/api';
          break;
      }

      // Extract filename from URL
      let filename = '';

      // Special handling for dynamic / optimizer image endpoints:
      // e.g. /_next/image?url=...&w=..., /image?url=..., /_ipx/...
      if (type === 'image' && (url.searchParams.has('url') || url.searchParams.has('src') || url.searchParams.has('img'))) {
        const innerUrl = url.searchParams.get('url') || url.searchParams.get('src') || url.searchParams.get('img') || '';
        try {
          const decoded = decodeURIComponent(innerUrl);
          const innerPath = decoded.startsWith('http') ? new URL(decoded).pathname : decoded.split('?')[0];
          const innerBase = path.posix.basename(innerPath);
          const width = url.searchParams.get('w') || url.searchParams.get('width') || '';
          const namePart = innerBase ? innerBase.replace(/\.[^.]+$/, '') : 'img';
          const extPart = path.posix.extname(innerBase) || extension || '.png';
          filename = width ? `${namePart}_w${width}${extPart}` : `${namePart}${extPart}`;
        } catch {
          filename = '';
        }
      }

      // If not derived from query param, derive from pathname
      if (!filename) {
        filename = path.posix.basename(pathname);
      }

      // If filename is generic or collision-prone (e.g. image, opengraph-image, twitter-image, icon, thumb, media)
      const genericNames = [
        'image', 'img', 'media', 'thumb', 'thumbnail', 'photo', 'picture',
        'file', 'asset', 'opengraph-image', 'twitter-image', 'icon', 'apple-icon', 'favicon'
      ];
      const baseWithoutExt = filename.replace(/\.[^.]+$/, '').toLowerCase();
      if ((genericNames.includes(baseWithoutExt) || !baseWithoutExt) && (url.search || pathname.includes('_next'))) {
        const hashInput = url.search || url.pathname;
        const queryHash = hashBuffer(Buffer.from(hashInput)).slice(0, 8);
        const curExt = path.posix.extname(filename) || extension || '.png';
        filename = `${baseWithoutExt || 'img'}_${queryHash}${curExt}`;
      }

      if (!filename || filename === '/') {
        filename = `asset_${Date.now()}`;
      }
      if (!path.posix.extname(filename) && extension) {
        filename += extension;
      }

      // Sanitize
      filename = filename.replace(/[<>:"|?*]/g, '_');

      // Preserve URL sub-path if deep, or group under category
      return path.posix.join(categoryDir, filename);
    } catch {
      return `assets/other/asset_${Date.now()}${extension}`;
    }
  }

  /**
   * Process a downloaded response buffer.
   */
  async process(
    url: string,
    buffer: Buffer,
    contentType: string,
    status: number,
    discoveredFrom: string
  ): Promise<ProcessedResource> {
    const sha256 = hashBuffer(buffer);
    const size = buffer.length;
    const classification = classifyResource(url, contentType);
    const localPath = this.deriveLocalPath(url, classification.type, classification.extension);

    const result: ProcessedResource = {
      url,
      localPath,
      type: classification.type,
      status,
      size,
      contentType,
      sha256,
      discoveredFrom,
      downloadedAt: Date.now(),
      rawBuffer: buffer,
    };

    // 1. Process HTML for nested links and assets
    if (classification.type === 'page') {
      const htmlText = buffer.toString('utf-8');
      const isErrorPage =
        status >= 400 ||
        htmlText.includes('404 | This page could not be found') ||
        htmlText.includes('This page could not be found.') ||
        htmlText.includes('<title>404') ||
        htmlText.includes('<title>Page Not Found') ||
        htmlText.includes('<title>Error 404');

      const discovery = discoverHTML(htmlText, url);
      // QUARANTINE: Never follow outbound links from 404 or error pages to prevent runaway spider traps!
      result.discoveredLinks = isErrorPage ? [] : discovery.links;
      result.discoveredResources = discovery.resources;
    }

    // 2. Process CSS for nested url() and @import
    if (classification.type === 'stylesheet') {
      const cssText = buffer.toString('utf-8');
      const cssDiscovery = discoverCSS(cssText, url);
      result.discoveredResources = cssDiscovery;
    }

    // 3. Write file to disk
    const absolutePath = path.join(this.outputDir, localPath);

    // Safeguard index.html: NEVER overwrite with HTTP error (>= 400), Google 404, or tiny error pages
    if (localPath === 'index.html') {
      const text = buffer.toString('utf-8');
      const isErrorPage =
        status >= 400 ||
        text.includes('<title>Error 404') ||
        text.includes('404. That’s an error') ||
        text.includes('af-error-container') ||
        text.includes('robot.png');

      if (isErrorPage) {
        // Divert error page to pages/errors/ so it NEVER touches root index.html
        result.localPath = path.posix.join('pages', 'errors', `http_${status || 404}_index.html`);
        const errPath = path.join(this.outputDir, result.localPath);
        await fs.mkdir(path.dirname(errPath), { recursive: true });
        await fs.writeFile(errPath, buffer);
        return result;
      }

      try {
        const existing = await fs.stat(absolutePath).catch(() => null);
        if (existing && existing.size > 2000 && buffer.length < 2500) {
          if (text.includes('404') || text.includes('Error') || text.includes('That’s an error')) {
            // Keep the original legitimate index.html intact
            return result;
          }
        }
      } catch {}
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    // Keep pages/index.html in sync with root index.html for tree navigation consistency
    if (localPath === 'index.html') {
      const pagesIndexPath = path.join(this.outputDir, 'pages', 'index.html');
      await fs.mkdir(path.dirname(pagesIndexPath), { recursive: true });
      await fs.writeFile(pagesIndexPath, buffer).catch(() => {});
    }

    return result;
  }
}
