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
  constructor(private outputDir: string) {}

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

      if (type === 'page') {
        // Root index.html stays at root for instant double-click offline viewing
        if (!pathname || pathname === '/' || pathname === '/index.html' || pathname === '/index.htm') {
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
      let filename = path.posix.basename(pathname);
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
      const discovery = discoverHTML(htmlText, url);
      result.discoveredLinks = discovery.links;
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
