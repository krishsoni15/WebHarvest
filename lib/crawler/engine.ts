/**
 * WebHarvest V3 Unified Crawl Orchestrator
 *
 * Coordinates URL scheduling, concurrency control, dual-engine fetching
 * (HTTP fast path with adaptive Playwright fallback), asset processing,
 * content deduplication, link rewriting, authenticated sessions,
 * scope boundaries, action safety shielding, and API discovery cataloging.
 */

import { CrawlQueue, QueueItem } from './queue';
import { VisitedSet } from './visited';
import { ConcurrencyController } from './concurrency';
import { LimitEnforcer, CrawlLimits, CrawlCounters, DEFAULT_LIMITS } from './limits';
import { CrawlPolicy, DomainPolicy } from './policy';
import { HttpCrawler } from './engines/http';
import { BrowserCrawler } from './engines/browser';
import { needsBrowserRendering } from './engines/detect';
import { AssetProcessor, ProcessedResource } from '../processor/pipeline';
import { rewriteHtmlUrls, rewriteCssUrls } from '../processor/rewrite';
import { canonicalKey } from './normalize';
import { ScopeEnforcer, CrawlScopeConfig } from './scope';
import { CaptureRules, DEFAULT_CAPTURE_RULES, shouldCaptureResourceType } from './presets';
import { ApiRequestRecord, buildApiCatalog, ApiCatalog } from '../analysis/api';
import fs from 'fs/promises';
import path from 'path';

export type EngineMode = 'fast' | 'balanced' | 'browser' | 'auto';

export interface CrawlEngineOptions {
  seedUrl: string;
  outputDir: string;
  mode?: EngineMode;
  domainPolicy?: DomainPolicy;
  limits?: Partial<CrawlLimits>;
  scopeConfig?: Partial<CrawlScopeConfig>;
  captureRules?: Partial<CaptureRules>;
  storageState?: any;
  onProgress?: (progress: CrawlEngineProgress) => void;
  onLog?: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

export interface CrawlEngineProgress {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  pagesDiscovered: number;
  pagesDownloaded: number;
  assetsDiscovered: number;
  assetsDownloaded: number;
  bytesDownloaded: number;
  errorsCount: number;
  currentUrl?: string;
  activeWorkers: number;
  durationMs: number;
}

export interface CrawlEngineResult {
  status: 'completed' | 'cancelled' | 'failed';
  counters: CrawlCounters;
  processedCount: number;
  urlToLocalMap: Map<string, string>;
  apiCatalog?: ApiCatalog;
  screenshots?: {
    desktop?: string;
    mobile?: string;
  };
  error?: string;
}

export class CrawlEngine {
  private queue: CrawlQueue;
  private visited: VisitedSet;
  private concurrency: ConcurrencyController;
  private limits: LimitEnforcer;
  private policy: CrawlPolicy;
  private scope: ScopeEnforcer;
  private captureRules: CaptureRules;
  private httpCrawler: HttpCrawler;
  private browserCrawler: BrowserCrawler;
  private processor: AssetProcessor;

  private isCancelled = false;
  private startTime = 0;
  private activeWorkers = 0;
  private urlToLocalMap = new Map<string, string>();
  private processedPages: ProcessedResource[] = [];
  private processedStylesheets: ProcessedResource[] = [];
  private allApiRequests: ApiRequestRecord[] = [];
  private screenshots: { desktop?: string; mobile?: string } = {};

  constructor(private options: CrawlEngineOptions) {
    const limitsConfig: CrawlLimits = {
      ...DEFAULT_LIMITS,
      ...(options.limits || {}),
    };

    this.queue = new CrawlQueue();
    this.visited = new VisitedSet();
    this.concurrency = new ConcurrencyController();
    this.limits = new LimitEnforcer(limitsConfig);
    this.policy = new CrawlPolicy(options.seedUrl, options.domainPolicy || 'allow-external-assets');
    this.scope = new ScopeEnforcer(options.seedUrl, options.scopeConfig);
    this.captureRules = {
      ...DEFAULT_CAPTURE_RULES,
      ...(options.captureRules || {}),
    };

    this.httpCrawler = new HttpCrawler(
      {
        limits: limitsConfig,
        policy: this.policy,
      },
      this.concurrency
    );

    this.browserCrawler = new BrowserCrawler(
      {
        storageState: options.storageState,
        blockDestructiveActions: options.scopeConfig?.blockDestructiveActions ?? true,
        autoLogin: true,
      },
      this.concurrency
    );

    this.processor = new AssetProcessor(options.outputDir);
  }

  /**
   * Cancel an ongoing crawl gracefully.
   */
  cancel(): void {
    this.isCancelled = true;
    this.options.onLog?.('Crawl cancellation requested', 'warn');
  }

  /**
   * Run the crawl loop to completion or limit exhaustion.
   */
  async run(): Promise<CrawlEngineResult> {
    this.startTime = Date.now();
    this.options.onLog?.(
      `Initiating V3 capture for: ${this.options.seedUrl} [Engine: ${this.options.mode || 'auto'}, Scope: ${this.scope.getConfig().mode}]`
    );

    // 1. Seed initial root URL
    this.queue.enqueue({
      url: this.options.seedUrl,
      canonicalKey: canonicalKey(this.options.seedUrl),
      depth: 0,
      priority: 100,
      type: 'page',
      discoveredFrom: 'seed',
      retries: 0,
      maxRetries: 3,
    });

    try {
      while (!this.queue.isEmpty() && !this.isCancelled && !this.limits.shouldStop()) {
        const item = this.queue.dequeue();
        if (!item) break;

        const key = canonicalKey(item.url);
        if (this.visited.hasURL(key)) continue;
        this.visited.addURL(key);

        await this.processQueueItem(item);
        this.emitProgress();
      }

      // 2. Post-crawl rewrite phase
      this.options.onLog?.('Rewriting document links and stylesheets for offline mirror...');
      await this.rewriteAllFiles();

      // 3. API Discovery Cataloging
      let apiCatalog: ApiCatalog | undefined;
      if (this.captureRules.apiMetadata && this.allApiRequests.length > 0) {
        apiCatalog = buildApiCatalog(this.allApiRequests);
        try {
          const apiDir = path.join(this.options.outputDir, 'data', 'api');
          await fs.mkdir(apiDir, { recursive: true });
          await fs.writeFile(
            path.join(apiDir, 'catalog.json'),
            JSON.stringify(apiCatalog, null, 2),
            'utf-8'
          );
          this.options.onLog?.(`Cataloged ${apiCatalog.endpoints.length} unique API endpoints.`);
        } catch {
          // ignore
        }
      }

      // 4. Save crawl execution report
      try {
        const report = {
          seedUrl: this.options.seedUrl,
          mode: this.options.mode || 'auto',
          scope: this.scope.getConfig(),
          captureRules: this.captureRules,
          counters: this.limits.getCounters(),
          durationMs: Date.now() - this.startTime,
          completedAt: new Date().toISOString(),
          screenshots: this.screenshots,
          apiEndpointsCount: apiCatalog?.endpoints.length || 0,
        };
        await fs.writeFile(
          path.join(this.options.outputDir, 'report.json'),
          JSON.stringify(report, null, 2),
          'utf-8'
        );
      } catch {
        // ignore
      }

      const finalStatus = this.isCancelled ? 'cancelled' : 'completed';
      this.options.onLog?.(`Crawl ${finalStatus}. Processed ${this.urlToLocalMap.size} unique resources.`);

      return {
        status: finalStatus,
        counters: this.limits.getCounters(),
        processedCount: this.urlToLocalMap.size,
        urlToLocalMap: this.urlToLocalMap,
        apiCatalog,
        screenshots: this.screenshots,
      };
    } catch (err: any) {
      this.options.onLog?.(`Fatal crawl error: ${err.message}`, 'error');
      return {
        status: 'failed',
        counters: this.limits.getCounters(),
        processedCount: this.urlToLocalMap.size,
        urlToLocalMap: this.urlToLocalMap,
        error: err.message,
      };
    } finally {
      await this.browserCrawler.close().catch(() => {});
    }
  }

  /**
   * Process a single queued item (Page or Asset).
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    this.activeWorkers++;
    const counters = this.limits.getCounters();

    try {
      const mode = this.options.mode || 'auto';
      let processed: ProcessedResource | null = null;
      const isPage = item.type === 'page';

      // Decide whether to use Playwright browser engine
      const forceBrowser = mode === 'browser' || !!this.options.storageState;
      const shouldUseBrowser =
        isPage && (forceBrowser || mode === 'auto' || mode === 'balanced');

      if (shouldUseBrowser) {
        if (!forceBrowser) {
          try {
            const httpRes = await this.httpCrawler.fetchResource(
              item.url,
              counters.bytesDownloaded,
              item.discoveredFrom
            );

            const htmlContent = httpRes.buffer.toString('utf-8');
            const isBlockedOrChallenge =
              httpRes.status === 403 ||
              httpRes.status === 401 ||
              httpRes.status === 429 ||
              htmlContent.includes('<title>403 - Forbidden</title>') ||
              htmlContent.includes('403 - Forbidden') ||
              htmlContent.includes('Access to this page is forbidden') ||
              htmlContent.includes('Just a moment...') ||
              htmlContent.includes('Attention Required! | Cloudflare');

            if (isBlockedOrChallenge) {
              this.options.onLog?.(
                `Anti-bot / 403 block detected on ${item.url} (status: ${httpRes.status}). Escalating to stealth Playwright browser...`,
                'warn'
              );
              processed = await this.fetchWithBrowser(item);
            } else {
              const detect = needsBrowserRendering(htmlContent);
              if (detect.needed) {
                this.options.onLog?.(
                  `SPA detected on ${item.url} (${detect.reasons.join(', ')}). Escalating to Playwright.`
                );
                processed = await this.fetchWithBrowser(item);
              } else {
                processed = await this.processor.process(
                  httpRes.url,
                  httpRes.buffer,
                  httpRes.contentType,
                  httpRes.status,
                  item.discoveredFrom
                );
              }
            }
          } catch {
            processed = await this.fetchWithBrowser(item);
          }
        } else {
          processed = await this.fetchWithBrowser(item);
        }
      } else {
        try {
          const httpRes = await this.httpCrawler.fetchResource(
            item.url,
            counters.bytesDownloaded,
            item.discoveredFrom
          );

          processed = await this.processor.process(
            httpRes.url,
            httpRes.buffer,
            httpRes.contentType,
            httpRes.status,
            item.discoveredFrom
          );
        } catch (fetchErr: any) {
          if (isPage) {
            this.options.onLog?.(`HTTP fetch failed for ${item.url}. Escalating to browser engine.`, 'info');
            processed = await this.fetchWithBrowser(item);
          } else {
            throw fetchErr;
          }
        }
      }

      if (!processed) return;

      // Content-addressed deduplication: reuse physical file if SHA-256 match exists
      const existingPath = this.visited.hasContent(processed.sha256);
      if (existingPath && processed.type !== 'page') {
        this.urlToLocalMap.set(item.url, existingPath);
        this.urlToLocalMap.set(processed.url, existingPath);
        this.limits.recordAsset(processed.size);
        return;
      } else {
        this.visited.addContent(processed.sha256, processed.localPath);
      }

      this.urlToLocalMap.set(item.url, processed.localPath);
      this.urlToLocalMap.set(processed.url, processed.localPath);

      // Track limits & counters
      if (processed.type === 'page') {
        this.limits.recordPage(processed.size);
        this.processedPages.push(processed);
      } else {
        this.limits.recordAsset(processed.size);
        if (processed.type === 'stylesheet') {
          this.processedStylesheets.push(processed);
        }
      }

      // Enqueue discovered links and assets within scope and capture rules
      this.enqueueDiscovered(processed, item.depth);
    } catch (err: any) {
      this.limits.recordError();
      this.options.onLog?.(`Failed to crawl [${item.type}] ${item.url}: ${err.message}`, 'warn');
    } finally {
      this.activeWorkers--;
    }
  }

  /**
   * Browser-based capture for client-rendered pages
   */
  private async fetchWithBrowser(item: QueueItem): Promise<ProcessedResource> {
    const shouldScreenshot = this.captureRules.screenshots && item.depth === 0;
    let browserRes = await this.browserCrawler.crawlPage(item.url, shouldScreenshot);

    // Save and propagate captured session state if auto-login occurred
    if (browserRes.newStorageState) {
      this.options.storageState = browserRes.newStorageState;
      this.options.onLog?.(
        `[AUTH SUCCESS] ${browserRes.authMessage || 'Authenticated session captured. Crawling protected routes.'}`,
        'info'
      );
      try {
        await fs.writeFile(
          path.join(this.options.outputDir, 'auth_state.json'),
          JSON.stringify(browserRes.newStorageState, null, 2),
          'utf-8'
        );
      } catch {}
    }

    // Save screenshots if captured
    if (browserRes.desktopScreenshot) {
      try {
        const desktopDir = path.join(this.options.outputDir, 'screenshots', 'desktop');
        await fs.mkdir(desktopDir, { recursive: true });
        const desktopRel = 'screenshots/desktop/viewport_1440.png';
        await fs.writeFile(path.join(this.options.outputDir, desktopRel), browserRes.desktopScreenshot);
        this.screenshots.desktop = desktopRel;
      } catch {}
    }

    if (browserRes.mobileScreenshot) {
      try {
        const mobileDir = path.join(this.options.outputDir, 'screenshots', 'mobile');
        await fs.mkdir(mobileDir, { recursive: true });
        const mobileRel = 'screenshots/mobile/viewport_390.png';
        await fs.writeFile(path.join(this.options.outputDir, mobileRel), browserRes.mobileScreenshot);
        this.screenshots.mobile = mobileRel;
      } catch {}
    }

    // Accumulate API requests
    if (browserRes.apiRequests.length > 0) {
      this.allApiRequests.push(...browserRes.apiRequests);
    }

    // If the captured HTML is still a 403 page, attempt redirect recovery
    if (
      browserRes.renderedHtml.includes('<title>403 - Forbidden</title>') ||
      browserRes.title.includes('403')
    ) {
      this.options.onLog?.(`Browser encountered 403 on ${item.url}. Attempting alternative path...`, 'warn');
      if (item.url.includes('/pages/')) {
        const altUrl = item.url.replace('/pages/', '/');
        const altRes = await this.browserCrawler.crawlPage(altUrl, false).catch(() => null);
        if (altRes && !altRes.title.includes('403')) {
          browserRes = altRes;
        }
      }
    }

    const htmlBuffer = Buffer.from(browserRes.renderedHtml, 'utf-8');

    // Save browser captured page
    const processedPage = await this.processor.process(
      item.url,
      htmlBuffer,
      'text/html; charset=utf-8',
      200,
      item.discoveredFrom
    );

    // Save all intercepted background assets
    for (const asset of browserRes.capturedAssets) {
      const assetKey = canonicalKey(asset.url);
      if (!this.visited.hasURL(assetKey) && this.policy.shouldDownload(asset.url)) {
        try {
          const processedAsset = await this.processor.process(
            asset.url,
            asset.buffer,
            asset.contentType,
            asset.status,
            item.url
          );
          this.urlToLocalMap.set(asset.url, processedAsset.localPath);
          this.limits.recordAsset(processedAsset.size);
          this.visited.addURL(assetKey);
        } catch {
          // Ignore secondary asset failures
        }
      }
    }

    return processedPage;
  }

  /**
   * Enqueue links and resources discovered inside processed pages/styles.
   */
  private enqueueDiscovered(resource: ProcessedResource, currentDepth: number): void {
    const nextDepth = currentDepth + 1;

    // 1. Enqueue links for page crawling (check scope bounds, depth, and domain policy)
    if (resource.discoveredLinks && nextDepth <= this.limits.getCounters().maxDepth) {
      for (const link of resource.discoveredLinks) {
        const scopeCheck = this.scope.shouldCrawlLink(link.resolvedUrl, nextDepth);
        if (scopeCheck.allowed && this.policy.shouldCrawl(link.resolvedUrl)) {
          this.queue.enqueue({
            url: link.resolvedUrl,
            canonicalKey: canonicalKey(link.resolvedUrl),
            depth: nextDepth,
            priority: Math.max(10, 80 - nextDepth * 10),
            type: 'page',
            discoveredFrom: resource.url,
            retries: 0,
            maxRetries: 3,
          });
        }
      }
    }

    // 2. Enqueue assets for downloading (check capture rules and domain policy)
    if (resource.discoveredResources) {
      for (const res of resource.discoveredResources) {
        const isAllowedByRules = shouldCaptureResourceType(res.type, this.captureRules);
        if (isAllowedByRules && this.policy.shouldDownload(res.resolvedUrl)) {
          let priority = 50;
          if (res.type === 'stylesheet') priority = 90;
          else if (res.type === 'script') priority = 85;
          else if (res.type === 'font') priority = 75;
          else if (res.type === 'threed') priority = 70;

          this.queue.enqueue({
            url: res.resolvedUrl,
            canonicalKey: canonicalKey(res.resolvedUrl),
            depth: currentDepth,
            priority,
            type: res.type as any,
            discoveredFrom: resource.url,
            retries: 0,
            maxRetries: 3,
          });
        }
      }
    }
  }

  /**
   * Rewrites links across all saved HTML pages and CSS files.
   */
  private async rewriteAllFiles(): Promise<void> {
    // 1. Rewrite HTML pages
    for (const page of this.processedPages) {
      try {
        const filePath = path.join(this.options.outputDir, page.localPath);
        const originalHtml = await fs.readFile(filePath, 'utf-8');
        const rewrittenHtml = rewriteHtmlUrls(originalHtml, {
          currentPageLocalPath: page.localPath,
          urlToLocalMap: this.urlToLocalMap,
        });
        await fs.writeFile(filePath, rewrittenHtml, 'utf-8');
      } catch (err: any) {
        this.options.onLog?.(`Failed to rewrite HTML ${page.localPath}: ${err.message}`, 'warn');
      }
    }

    // 2. Rewrite CSS stylesheets
    for (const css of this.processedStylesheets) {
      try {
        const filePath = path.join(this.options.outputDir, css.localPath);
        const originalCss = await fs.readFile(filePath, 'utf-8');
        const rewrittenCss = rewriteCssUrls(originalCss, css.localPath, {
          urlToLocalMap: this.urlToLocalMap,
        });
        await fs.writeFile(filePath, rewrittenCss, 'utf-8');
      } catch (err: any) {
        this.options.onLog?.(`Failed to rewrite CSS ${css.localPath}: ${err.message}`, 'warn');
      }
    }
  }

  private emitProgress(): void {
    if (!this.options.onProgress) return;
    const counters = this.limits.getCounters();
    this.options.onProgress({
      status: this.isCancelled ? 'cancelled' : 'running',
      pagesDiscovered: counters.pagesFound,
      pagesDownloaded: counters.pagesDownloaded,
      assetsDiscovered: counters.assetsFound,
      assetsDownloaded: counters.assetsDownloaded,
      bytesDownloaded: counters.bytesDownloaded,
      errorsCount: counters.errorsCount,
      activeWorkers: this.activeWorkers,
      durationMs: Date.now() - this.startTime,
    });
  }
}
