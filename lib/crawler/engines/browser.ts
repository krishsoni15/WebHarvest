/**
 * WebHarvest V3 Browser Crawler Engine (Playwright)
 *
 * Advanced Chromium crawler for dynamic Single Page Applications (React, Next.js, Vue, Nuxt, Angular).
 * Supports:
 * - Authenticated browser sessions via Playwright storageState
 * - Destructive action shielding (blocks logout, account deletion, checkout mutations)
 * - Interception of XHR / fetch API metadata for reverse-engineering
 * - 3D assets & texture preservation
 * - Dual responsive screenshots (desktop 1440x900 and mobile 390x844 viewports)
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import { ConcurrencyController } from '../concurrency';
import { ApiRequestRecord } from '../../analysis/api';
import { launchChromiumSafe } from '../playwrightHelper';

export interface BrowserEngineConfig {
  headless?: boolean;
  timeoutMs?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  storageState?: any;
  blockDestructiveActions?: boolean;
  autoLogin?: boolean;
  credentials?: {
    email?: string;
    password?: string;
  };
}

export interface CapturedNetworkAsset {
  url: string;
  contentType: string;
  status: number;
  buffer: Buffer;
  headers: Record<string, string>;
}

export interface BrowserCrawlResult {
  url: string;
  renderedHtml: string;
  title: string;
  capturedAssets: CapturedNetworkAsset[];
  apiRequests: ApiRequestRecord[];
  desktopScreenshot?: Buffer;
  mobileScreenshot?: Buffer;
  newStorageState?: any;
  authMessage?: string;
}

export class BrowserCrawler {
  private browser: Browser | null = null;
  private timeoutMs: number;

  constructor(
    private config: BrowserEngineConfig = {},
    private concurrency?: ConcurrencyController
  ) {
    this.timeoutMs = config.timeoutMs || 30000;
  }

  /**
   * Launch browser instance lazily.
   */
  async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      const launched = await launchChromiumSafe(chromium, {
        headless: this.config.headless ?? true,
      });
      if (!launched) {
        throw new Error('Chromium browser engine is unavailable on this host environment. Falling back to HTTP crawler.');
      }
      this.browser = launched;
    }
    return this.browser as Browser;
  }

  /**
   * Crawl a single page with full JS rendering, session state, and network request interception.
   */
  async crawlPage(
    url: string,
    captureScreenshot: boolean = false
  ): Promise<BrowserCrawlResult> {
    const browser = await this.ensureBrowser();
    const hostname = new URL(url).hostname;

    const release = this.concurrency
      ? await this.concurrency.acquire(hostname, 'browser')
      : () => {};

    let context: BrowserContext | null = null;

    try {
      context = await browser.newContext({
        viewport: this.config.viewport || { width: 1440, height: 900 },
        userAgent:
          this.config.userAgent ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true,
        storageState: this.config.storageState || undefined,
      });

      // Mask automation marker to prevent WAF bot triggers (403 Forbidden)
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      const page = await context.newPage();
      const capturedAssets: CapturedNetworkAsset[] = [];
      const apiRequests: ApiRequestRecord[] = [];

      // Destructive action shield: block dangerous mutations (POST/PUT/DELETE/logout/checkout)
      if (this.config.blockDestructiveActions ?? true) {
        await page.route('**/*', async (route) => {
          const request = route.request();
          const reqUrl = request.url().toLowerCase();
          const method = request.method().toUpperCase();

          const isDestructive =
            reqUrl.includes('/logout') ||
            reqUrl.includes('/signout') ||
            reqUrl.includes('/delete-account') ||
            reqUrl.includes('/cancel-subscription') ||
            reqUrl.includes('/checkout');

          const isMutation = method === 'DELETE' || method === 'PATCH' || (method === 'POST' && isDestructive);

          if (isMutation || isDestructive) {
            await route.abort('blockedbyclient');
            return;
          }

          await route.continue();
        });
      }

      // Intercept and record all network responses
      page.on('response', async (response) => {
        try {
          const reqUrl = response.url();
          if (
            reqUrl.startsWith('data:') ||
            reqUrl.startsWith('blob:') ||
            reqUrl.startsWith('javascript:')
          ) {
            return;
          }

          const status = response.status();
          const headers = response.headers();
          const contentType = headers['content-type'] || '';
          const request = response.request();
          const method = request.method();
          const resourceType = request.resourceType();

          // Catalog API / XHR / fetch requests
          if (resourceType === 'xhr' || resourceType === 'fetch' || contentType.includes('application/json')) {
            try {
              const textSample = await response.text().catch(() => '');
              apiRequests.push({
                url: reqUrl,
                method,
                status,
                contentType,
                size: textSample.length,
                timestamp: Date.now(),
                headers: { 'content-type': contentType },
                responsePreview: textSample.slice(0, 500),
              });
            } catch {
              // ignore
            }
          }

          if (status < 200 || status >= 400) return;

          // Skip websocket / event-stream / huge video chunks in memory buffer
          if (contentType.includes('text/event-stream') || contentType.includes('video/')) {
            return;
          }

          const body = await response.body();
          capturedAssets.push({
            url: reqUrl,
            status,
            contentType,
            buffer: body,
            headers,
          });
        } catch {
          // Ignore responses that closed early or cannot be buffered
        }
      });

      // Navigate to the target page
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.timeoutMs,
      }).catch(async () => {
        // Fallback to load state if networkidle times out
        await page.waitForLoadState('domcontentloaded');
      });

      // Small delay to allow framework hydration to complete
      await page.waitForTimeout(1000);

      let newStorageState: any = undefined;
      let authMessage: string | undefined = undefined;

      // ── Smart Auto-Login Detection & Demo Credential Bypass ───────────────────────
      const pageUrl = page.url().toLowerCase();
      const hasPasswordInput = (await page.$('input[type="password"]')) !== null;
      const isLoginPage =
        pageUrl.includes('/login') ||
        pageUrl.includes('/signin') ||
        pageUrl.includes('/auth') ||
        hasPasswordInput;

      if ((this.config.autoLogin ?? true) && isLoginPage && !this.config.storageState) {
        try {
          const bodyText = await page.innerText('body').catch(() => '');
          let emailToUse = this.config.credentials?.email;
          let passToUse = this.config.credentials?.password;

          // 1. Check for demo credentials in page text (e.g., "Email: admin@vuexy.com / Pass: admin")
          if (!emailToUse || !passToUse) {
            const emailMatch = bodyText.match(/(?:email|user(?:name)?)\s*[:=]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_-]+)/i);
            const passMatch = bodyText.match(/(?:pass(?:word)?)\s*[:=]\s*([a-zA-Z0-9._%+-@!#]+)/i);
            if (emailMatch && passMatch) {
              emailToUse = emailMatch[1].trim();
              passToUse = passMatch[1].trim();
            }
          }

          // 2. Check for prefilled input values
          if (!emailToUse) {
            const prefilledEmail = await page.$eval('input[type="email"], input[name*="user"], input[name*="email"], input[id*="email"]', (el) => (el as HTMLInputElement).value).catch(() => '');
            if (prefilledEmail && (prefilledEmail.includes('@') || prefilledEmail.length > 2)) {
              emailToUse = prefilledEmail;
            }
          }
          if (!passToUse) {
            const prefilledPass = await page.$eval('input[type="password"]', (el) => (el as HTMLInputElement).value).catch(() => '');
            if (prefilledPass) {
              passToUse = prefilledPass;
            }
          }

          // 3. Known template defaults (Vuexy / Pixinvent)
          if (!emailToUse || !passToUse) {
            if (hostname.includes('pixinvent.com') || pageUrl.includes('vuexy')) {
              emailToUse = pageUrl.includes('nextjs') ? 'admin@vuexy.com' : 'admin@demo.com';
              passToUse = 'admin';
            }
          }

          const emailInput = await page.$('input[type="email"], input[name="email"], input[name*="email"], input[id*="email"], input[placeholder*="email" i], input[type="text"]');
          const passInput = await page.$('input[type="password"]');
          const submitBtn = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Sign In")');

          if (emailInput && passInput && emailToUse && passToUse) {
            await emailInput.fill(emailToUse).catch(() => {});
            await passInput.fill(passToUse).catch(() => {});

            if (submitBtn) {
              await submitBtn.click().catch(() => {});

              // Wait for navigation or response
              await Promise.race([
                page.waitForURL((u) => !u.href.toLowerCase().includes('/login') && !u.href.toLowerCase().includes('/signin'), { timeout: 8000 }).catch(() => {}),
                page.waitForTimeout(5000),
              ]);

              await page.waitForTimeout(1500);

              const postLoginUrl = page.url();
              const cookies = await context.cookies();
              const hasAuthCookie = cookies.some((c) =>
                c.name.includes('session') || c.name.includes('token') || c.name.includes('auth') || c.name.includes('jwt')
              );

              if (hasAuthCookie || !postLoginUrl.toLowerCase().includes('/login')) {
                const capturedState = await context.storageState();
                newStorageState = capturedState;
                this.config.storageState = capturedState;
                authMessage = `Auto-authenticated with ${emailToUse}. Successfully captured session tokens & cookies.`;
              }
            }
          }
        } catch {
          // ignore auto-login failure and continue capture
        }
      }

      // Extract rendered HTML and title (after potential auto-login navigation)
      const renderedHtml = await page.content();
      const title = await page.title();

      let desktopScreenshot: Buffer | undefined;
      let mobileScreenshot: Buffer | undefined;

      if (captureScreenshot) {
        try {
          // 1. Desktop full-page screenshot
          desktopScreenshot = await page.screenshot({ fullPage: true });

          // 2. Mobile viewport screenshot (390x844)
          await page.setViewportSize({ width: 390, height: 844 });
          await page.waitForTimeout(400);
          mobileScreenshot = await page.screenshot({ fullPage: false });
        } catch {
          // Continue if screenshot fails
        }
      }

      return {
        url: page.url(),
        renderedHtml,
        title,
        capturedAssets,
        apiRequests,
        desktopScreenshot,
        mobileScreenshot,
        newStorageState,
        authMessage,
      };
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
      release();
    }
  }

  /**
   * Close browser on shutdown.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}
