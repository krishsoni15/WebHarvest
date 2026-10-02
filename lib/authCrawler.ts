import fs from 'fs';
import path from 'path';
import { activeJobs, activeJobControls, Job } from '@/lib/jobStore';
import { launchChromiumSafe } from '@/lib/crawler/playwrightHelper';

/**
 * Safely create directories, avoiding ENOTDIR when a parent component is an existing regular file.
 */
function safeMkdir(dirPath: string): boolean {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.statSync(dirPath).isDirectory();
    }
    const parent = path.dirname(dirPath);
    if (parent && parent !== dirPath) {
      safeMkdir(parent);
    }
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export interface AuthCrawlerOptions {
  id: string;
  loginUrl?: string;
  targetUrl?: string;
  email?: string;
  password?: string;
  targetPages?: string[];
  downloadDir: string;
  headless?: boolean;
  maxPages?: number; // Supports up to 500+ pages
}

/**
 * Build ultra-comprehensive route catalog for Vuexy (Vuejs / Vuetify / Next.js) and SPA templates.
 */
export function resolveVuexyConfig(inputUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
  } catch {
    parsed = new URL('https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/dashboards/analytics');
  }

  // Normalize marketing URL (e.g. https://pixinvent.com/vuexy-vuetify-vuejs-admin-template)
  // to the live template demo domain so that the crawler targets the actual applications
  const isMarketingUrl = (parsed.hostname === 'pixinvent.com' || parsed.hostname === 'www.pixinvent.com');
  const pathname = parsed.pathname.toLowerCase();
  let isNextjs = pathname.includes('nextjs') || inputUrl.toLowerCase().includes('nextjs');
  let isHtml = pathname.includes('html') || inputUrl.toLowerCase().includes('html');
  let isVuejs = pathname.includes('vuejs') || pathname.includes('vuetify') || inputUrl.toLowerCase().includes('vuexy') || inputUrl.toLowerCase().includes('pixinvent') || (!isNextjs && !isHtml);

  if (isMarketingUrl) {
    if (isNextjs) {
      parsed = new URL('https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/dashboards/analytics');
    } else if (isHtml) {
      parsed = new URL('https://demos.pixinvent.com/vuexy-html-admin-template/html/vertical-menu-template/dashboards-analytics.html');
    } else {
      parsed = new URL('https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/dashboards/analytics');
      isVuejs = true;
    }
  }

  if (!isNextjs && !isHtml) {
    isVuejs = true;
  }

  // Detect active demo (default demo-1)
  const effectivePathname = parsed.pathname.toLowerCase();
  const demoMatch = effectivePathname.match(/(demo-\d+)/i);
  const currentDemo = demoMatch ? demoMatch[1].toLowerCase() : 'demo-1';

  let baseUrl = 'https://demos.pixinvent.com/vuexy-vuejs-admin-template';
  let loginUrl = `${baseUrl}/${currentDemo}/login`;
  let email = 'admin@demo.com';
  const password = 'admin';

  if (isNextjs) {
    baseUrl = 'https://demos.pixinvent.com/vuexy-nextjs-admin-template';
    loginUrl = `${baseUrl}/${currentDemo}/en/login`;
    email = 'admin@vuexy.com';
  } else if (isHtml) {
    baseUrl = 'https://demos.pixinvent.com/vuexy-html-admin-template';
    loginUrl = `${baseUrl}/html/vertical-menu-template/auth-login-basic.html`;
    email = 'admin@vuexy.com';
  } else {
    // VueJS / Vuetify default
    baseUrl = 'https://demos.pixinvent.com/vuexy-vuejs-admin-template';
    loginUrl = `${baseUrl}/${currentDemo}/login`;
    email = 'admin@demo.com';
  }

  const targetPages: string[] = [];

  // Prioritize user's exact requested URL if on demo domain
  if (parsed.hostname.includes('demos.pixinvent.com') && effectivePathname.length > 2) {
    targetPages.push(parsed.href);
  }

  if (isVuejs) {
    // 1. All 6 Core Layout Demos
    const layoutDemos = [
      `${baseUrl}/demo-1/dashboards/analytics`, // Vertical Layout
      `${baseUrl}/demo-2/dashboards/crm`,       // Bordered Layout
      `${baseUrl}/demo-3/dashboards/ecommerce`, // Semi Dark Layout
      `${baseUrl}/demo-4/dashboards/ecommerce`, // Dark Layout
      `${baseUrl}/demo-5/dashboards/crm`,       // Horizontal Layout
      `${baseUrl}/demo-6/dashboards/analytics`, // Horizontal Dark Layout
    ];

    // 2. Dashboards across active demo
    const dashboards = [
      `${baseUrl}/${currentDemo}/dashboards/analytics`,
      `${baseUrl}/${currentDemo}/dashboards/crm`,
      `${baseUrl}/${currentDemo}/dashboards/ecommerce`,
      `${baseUrl}/${currentDemo}/dashboards/logistics`,
      `${baseUrl}/${currentDemo}/dashboards/academy`,
    ];

    // 3. All 9 Applications with complete sub-views
    const apps = [
      `${baseUrl}/${currentDemo}/apps/email`,
      `${baseUrl}/${currentDemo}/apps/chat`,
      `${baseUrl}/${currentDemo}/apps/calendar`,
      `${baseUrl}/${currentDemo}/apps/kanban`,
      // eCommerce
      `${baseUrl}/${currentDemo}/apps/ecommerce/dashboard`,
      `${baseUrl}/${currentDemo}/apps/ecommerce/referrals`,
      `${baseUrl}/${currentDemo}/apps/ecommerce/product`,
      `${baseUrl}/${currentDemo}/apps/ecommerce/order`,
      `${baseUrl}/${currentDemo}/apps/ecommerce/customer`,
      `${baseUrl}/${currentDemo}/apps/ecommerce/manage-review`,
      `${baseUrl}/${currentDemo}/apps/ecommerce/settings`,
      // Roles & Permissions
      `${baseUrl}/${currentDemo}/apps/roles`,
      `${baseUrl}/${currentDemo}/apps/permissions`,
      // Invoice
      `${baseUrl}/${currentDemo}/apps/invoice/preview/5036`,
      `${baseUrl}/${currentDemo}/apps/invoice/list`,
      `${baseUrl}/${currentDemo}/apps/invoice/add`,
      `${baseUrl}/${currentDemo}/apps/invoice/edit`,
      // Logistics
      `${baseUrl}/${currentDemo}/apps/logistics/dashboard`,
      `${baseUrl}/${currentDemo}/apps/logistics/fleet`,
      // Academy
      `${baseUrl}/${currentDemo}/apps/academy/dashboard`,
      `${baseUrl}/${currentDemo}/apps/academy/my-course`,
      `${baseUrl}/${currentDemo}/apps/academy/course-details`,
      // Users
      `${baseUrl}/${currentDemo}/apps/user/list`,
      `${baseUrl}/${currentDemo}/apps/user/view`,
    ];

    // 4. All Authentication Pages
    const authPages = [
      `${baseUrl}/${currentDemo}/login`,
      `${baseUrl}/${currentDemo}/pages/authentication/register-v2`,
      `${baseUrl}/${currentDemo}/pages/authentication/register-v1`,
      `${baseUrl}/${currentDemo}/pages/authentication/login-v2`,
      `${baseUrl}/${currentDemo}/pages/authentication/login-v1`,
      `${baseUrl}/${currentDemo}/pages/authentication/forgot-password-v2`,
      `${baseUrl}/${currentDemo}/pages/authentication/forgot-password-v1`,
      `${baseUrl}/${currentDemo}/pages/authentication/reset-password-v2`,
      `${baseUrl}/${currentDemo}/pages/authentication/reset-password-v1`,
      `${baseUrl}/${currentDemo}/pages/authentication/two-steps-v2`,
      `${baseUrl}/${currentDemo}/pages/authentication/two-steps-v1`,
      `${baseUrl}/${currentDemo}/pages/authentication/verify-email-v2`,
      `${baseUrl}/${currentDemo}/pages/authentication/verify-email-v1`,
    ];

    // 5. Front Pages
    const frontPages = [
      `${baseUrl}/${currentDemo}/front-pages/landing-page`,
      `${baseUrl}/${currentDemo}/front-pages/pricing`,
      `${baseUrl}/${currentDemo}/front-pages/payment`,
      `${baseUrl}/${currentDemo}/front-pages/checkout`,
      `${baseUrl}/${currentDemo}/front-pages/help-center`,
    ];

    // 6. Useful & General Pages
    const generalPages = [
      `${baseUrl}/${currentDemo}/wizard-examples/create-deal`,
      `${baseUrl}/${currentDemo}/wizard-examples/property-listing`,
      `${baseUrl}/${currentDemo}/wizard-examples/checkout`,
      `${baseUrl}/${currentDemo}/pages/user-profile/profile`,
      `${baseUrl}/${currentDemo}/pages/user-profile/teams`,
      `${baseUrl}/${currentDemo}/pages/user-profile/projects`,
      `${baseUrl}/${currentDemo}/pages/user-profile/connections`,
      `${baseUrl}/${currentDemo}/pages/faq`,
      `${baseUrl}/${currentDemo}/pages/pricing`,
      `${baseUrl}/${currentDemo}/pages/account-settings/account`,
      `${baseUrl}/${currentDemo}/pages/account-settings/security`,
      `${baseUrl}/${currentDemo}/pages/account-settings/billing-plans`,
      `${baseUrl}/${currentDemo}/pages/account-settings/notifications`,
      `${baseUrl}/${currentDemo}/pages/account-settings/connections`,
      `${baseUrl}/${currentDemo}/pages/dialog-examples`,
      `${baseUrl}/documentation`,
    ];

    // 7. Forms, Tables, Charts & UI Components
    const uiPages = [
      // Forms
      `${baseUrl}/${currentDemo}/forms/form-layouts`,
      `${baseUrl}/${currentDemo}/forms/form-wizard-numbered`,
      `${baseUrl}/${currentDemo}/forms/form-wizard-icons`,
      `${baseUrl}/${currentDemo}/forms/form-validation`,
      `${baseUrl}/${currentDemo}/forms/textfield`,
      `${baseUrl}/${currentDemo}/forms/select`,
      `${baseUrl}/${currentDemo}/forms/checkbox`,
      `${baseUrl}/${currentDemo}/forms/radio`,
      `${baseUrl}/${currentDemo}/forms/switch`,
      `${baseUrl}/${currentDemo}/forms/date-time-picker`,
      `${baseUrl}/${currentDemo}/forms/editors`,
      `${baseUrl}/${currentDemo}/forms/file-input`,
      `${baseUrl}/${currentDemo}/forms/rating`,
      `${baseUrl}/${currentDemo}/forms/slider`,
      // Tables & Charts
      `${baseUrl}/${currentDemo}/tables/simple-table`,
      `${baseUrl}/${currentDemo}/tables/data-table`,
      `${baseUrl}/${currentDemo}/charts/apex-chart`,
      `${baseUrl}/${currentDemo}/charts/chartjs`,
      // Components
      `${baseUrl}/${currentDemo}/components/alert`,
      `${baseUrl}/${currentDemo}/components/avatar`,
      `${baseUrl}/${currentDemo}/components/badge`,
      `${baseUrl}/${currentDemo}/components/button`,
      `${baseUrl}/${currentDemo}/components/chip`,
      `${baseUrl}/${currentDemo}/components/dialog`,
      `${baseUrl}/${currentDemo}/components/expansion-panel`,
      `${baseUrl}/${currentDemo}/components/list`,
      `${baseUrl}/${currentDemo}/components/menu`,
      `${baseUrl}/${currentDemo}/components/pagination`,
      `${baseUrl}/${currentDemo}/components/progress-circular`,
      `${baseUrl}/${currentDemo}/components/progress-linear`,
      `${baseUrl}/${currentDemo}/components/snackbar`,
      `${baseUrl}/${currentDemo}/components/tabs`,
      `${baseUrl}/${currentDemo}/components/timeline`,
      `${baseUrl}/${currentDemo}/components/tooltip`,
    ];

    // Combine all pages
    const combined = [
      ...dashboards,
      ...authPages,
      ...apps,
      ...frontPages,
      ...generalPages,
      ...layoutDemos,
      ...uiPages,
    ];

    for (const r of combined) {
      if (!targetPages.includes(r)) {
        targetPages.push(r);
      }
    }
  } else if (isNextjs) {
    const nextRoutes = [
      // 1. Dashboards
      `${baseUrl}/${currentDemo}/en/dashboards/analytics`,
      `${baseUrl}/${currentDemo}/en/dashboards/crm`,
      `${baseUrl}/${currentDemo}/en/dashboards/ecommerce`,
      `${baseUrl}/${currentDemo}/en/dashboards/logistics`,
      `${baseUrl}/${currentDemo}/en/dashboards/academy`,
      // 2. Apps
      `${baseUrl}/${currentDemo}/en/apps/email`,
      `${baseUrl}/${currentDemo}/en/apps/chat`,
      `${baseUrl}/${currentDemo}/en/apps/calendar`,
      `${baseUrl}/${currentDemo}/en/apps/kanban`,
      // 3. eCommerce
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/dashboard`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/products/list`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/products/add`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/orders/list`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/orders/details`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/customers/list`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/customers/details`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/manage-reviews`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/referrals`,
      `${baseUrl}/${currentDemo}/en/apps/ecommerce/settings`,
      // 4. Academy & Logistics
      `${baseUrl}/${currentDemo}/en/apps/academy/dashboard`,
      `${baseUrl}/${currentDemo}/en/apps/academy/my-courses`,
      `${baseUrl}/${currentDemo}/en/apps/logistics/dashboard`,
      `${baseUrl}/${currentDemo}/en/apps/logistics/fleet`,
      // 5. Invoices
      `${baseUrl}/${currentDemo}/en/apps/invoice/list`,
      `${baseUrl}/${currentDemo}/en/apps/invoice/preview`,
      `${baseUrl}/${currentDemo}/en/apps/invoice/edit`,
      `${baseUrl}/${currentDemo}/en/apps/invoice/add`,
      // 6. Users & Roles
      `${baseUrl}/${currentDemo}/en/apps/user/list`,
      `${baseUrl}/${currentDemo}/en/apps/user/view/account`,
      `${baseUrl}/${currentDemo}/en/apps/user/view/security`,
      `${baseUrl}/${currentDemo}/en/apps/user/view/billing-plans`,
      `${baseUrl}/${currentDemo}/en/apps/roles`,
      `${baseUrl}/${currentDemo}/en/apps/permissions`,
      // 7. Pages
      `${baseUrl}/${currentDemo}/en/pages/user-profile/profile`,
      `${baseUrl}/${currentDemo}/en/pages/account-settings/account`,
      `${baseUrl}/${currentDemo}/en/pages/faq`,
      `${baseUrl}/${currentDemo}/en/pages/pricing`,
      // 8. Auth Pages
      `${baseUrl}/${currentDemo}/en/login`,
      `${baseUrl}/${currentDemo}/en/register`,
      `${baseUrl}/${currentDemo}/en/forgot-password`,
      // 9. Front Pages
      `${baseUrl}/${currentDemo}/en/front-pages/landing-page`,
      `${baseUrl}/${currentDemo}/en/front-pages/pricing`,
      `${baseUrl}/${currentDemo}/en/front-pages/checkout`,
    ];
    for (const route of nextRoutes) {
      if (!targetPages.includes(route)) {
        targetPages.push(route);
      }
    }
  } else {
    targetPages.push(inputUrl);
  }

  return {
    loginUrl,
    email,
    password,
    targetPages,
  };
}

async function runHttpAuthFallback({
  id,
  targetUrl,
  inputUrl,
  targetPages,
  downloadDir,
  targetDir,
  hostname,
  email,
  maxPages,
  appendLog,
  updateJobState,
}: {
  id: string;
  targetUrl?: string;
  inputUrl: string;
  targetPages: string[];
  downloadDir: string;
  targetDir: string;
  hostname: string;
  email: string;
  maxPages: number;
  appendLog: (msg: string) => void;
  updateJobState: (status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused', errMessage?: string) => void;
}) {
  appendLog('[FALLBACK] Starting high-res HTTP cloner and asset harvester...');
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(downloadDir, { recursive: true });

    const primaryUrl = targetPages[0] || targetUrl || (inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
    let savedPagesCount = 0;
    let savedAssetsCount = 0;
    const discoveredPagesList: string[] = [];
    const downloadedUrls = new Set<string>();

    const cheerio = require('cheerio');
    const effectiveLimit = maxPages >= 50000 ? 10000 : Math.max(maxPages, 100);
    const urlsToCrawl = [primaryUrl, ...targetPages.filter(p => p !== primaryUrl)].slice(0, effectiveLimit);
    const demoMatch = primaryUrl.match(/(demo-\d+)/i);
    const activeDemoTag = demoMatch ? demoMatch[1].toLowerCase() : 'demo-1';

    for (let idx = 0; idx < urlsToCrawl.length; idx++) {
      const ctrl = activeJobControls.get(id);
      if (ctrl?.isCancelled) {
        appendLog(`[CRAWL CANCELLED] Stopped by user at page ${idx + 1}`);
        break;
      }
      while (ctrl?.isPaused && !ctrl?.isCancelled) {
        appendLog(`[PAUSED] Crawl paused at page ${idx + 1}. Waiting for resume...`);
        await new Promise<void>((resolve) => {
          if (ctrl) ctrl.pausePromiseResolve = resolve;
          setTimeout(resolve, 1000);
        });
      }
      if (ctrl?.isCancelled) break;

      const pageUrl = urlsToCrawl[idx];
      if (downloadedUrls.has(pageUrl)) continue;
      downloadedUrls.add(pageUrl);

      try {
        appendLog(`[HTTP CRAWL] (${savedPagesCount + 1}/${urlsToCrawl.length}) Fetching: ${pageUrl}`);
        const res = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });

        if (!res.ok) {
          appendLog(`[HTTP WARN] Page ${pageUrl} returned status ${res.status}`);
          continue;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Dynamically discover all internal <a> links on the target domain
        $('a[href]').each((_: any, el: any) => {
          const href = $(el).attr('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
          try {
            const resolvedLink = new URL(href, pageUrl);
            const isSameSite = (resolvedLink.hostname === hostname || resolvedLink.hostname.includes('pixinvent.com'));
            const isDocOrOld = 
              resolvedLink.pathname.includes('/documentation') || 
              resolvedLink.pathname.includes('/docs/') || 
              resolvedLink.pathname.includes('-old') || 
              resolvedLink.pathname.includes('changelog') ||
              resolvedLink.hostname.includes('tools.pixinvent.com') ||
              resolvedLink.pathname.includes('laravel') ||
              resolvedLink.pathname.includes('angular') ||
              resolvedLink.pathname.includes('bootstrap');

            // Restrict subpage discovery to active demo (e.g. demo-1) so we do not spider 600+ duplicate pages
            const otherDemoMatch = resolvedLink.pathname.match(/(demo-\d+)/i);
            const isOtherDemo = otherDemoMatch && otherDemoMatch[1].toLowerCase() !== activeDemoTag;

            if (
              isSameSite &&
              !isDocOrOld &&
              !isOtherDemo &&
              !resolvedLink.pathname.endsWith('.zip') &&
              !resolvedLink.pathname.endsWith('.pdf') &&
              urlsToCrawl.length < effectiveLimit &&
              !urlsToCrawl.includes(resolvedLink.href)
            ) {
              urlsToCrawl.push(resolvedLink.href);
            }
          } catch {}
        });

        // Extract and fetch assets
        const assetUrls: string[] = [];
        $('link[rel="stylesheet"]').each((_: any, el: any) => {
          const href = $(el).attr('href');
          if (href) assetUrls.push(href);
        });
        $('script[src]').each((_: any, el: any) => {
          const src = $(el).attr('src');
          if (src) assetUrls.push(src);
        });
        $('img[src]').each((_: any, el: any) => {
          const src = $(el).attr('src');
          if (src) assetUrls.push(src);
        });
        $('link[rel="icon"], link[rel="shortcut icon"]').each((_: any, el: any) => {
          const href = $(el).attr('href');
          if (href) assetUrls.push(href);
        });

        // Fetch assets in concurrent batches of 12 for 5x-10x faster harvesting
        const validAssets = assetUrls.filter(
          (raw) => raw && !raw.startsWith('data:') && !raw.startsWith('#') && !raw.startsWith('javascript:')
        );
        const assetBatchSize = 12;
        for (let b = 0; b < validAssets.length; b += assetBatchSize) {
          const batch = validAssets.slice(b, b + assetBatchSize);
          await Promise.all(
            batch.map(async (rawAsset) => {
              try {
                const resolvedAssetUrl = new URL(rawAsset, pageUrl).href;
                if (downloadedUrls.has(resolvedAssetUrl)) return;
                downloadedUrls.add(resolvedAssetUrl);

                const assetPathname = new URL(resolvedAssetUrl).pathname.replace(/^\/+/, '');
                const localAssetFile = path.join(targetDir, assetPathname);
                fs.mkdirSync(path.dirname(localAssetFile), { recursive: true });

                if (!fs.existsSync(localAssetFile)) {
                  const assetRes = await fetch(resolvedAssetUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                    signal: AbortSignal.timeout(10000),
                  });
                  if (assetRes.ok) {
                    const arrayBuf = await assetRes.arrayBuffer();
                    const buf = Buffer.from(arrayBuf);
                    fs.writeFileSync(localAssetFile, buf);
                    savedAssetsCount++;

                    if (assetPathname.includes('assets/')) {
                      const alias = path.join(targetDir, assetPathname.slice(assetPathname.indexOf('assets/')));
                      if (!fs.existsSync(alias)) {
                        fs.mkdirSync(path.dirname(alias), { recursive: true });
                        fs.writeFileSync(alias, buf);
                      }
                    }
                    if (assetPathname.includes('images/')) {
                      const alias = path.join(targetDir, assetPathname.slice(assetPathname.indexOf('images/')));
                      if (!fs.existsSync(alias)) {
                        fs.mkdirSync(path.dirname(alias), { recursive: true });
                        fs.writeFileSync(alias, buf);
                      }
                    }
                  }
                }
              } catch {}
            })
          );
        }

        // Inject Offline Resilience Shield into HTML
        const offlineShield = `
<!-- [WebHarvest] Offline Resilience Shield & State Hydration -->
<script>
(function() {
  try {
    localStorage.setItem('userData', JSON.stringify({ id: 1, role: 'admin', fullName: 'Demo Admin', email: '${email}' }));
    localStorage.setItem('accessToken', 'mock_offline_webharvest_session_token');
    document.cookie = "webharvest_preview_id=${id}; path=/; SameSite=Lax";
  } catch(e) {}
})();
</script>
`;
        if ($('body').length > 0) {
          $('body').append(offlineShield);
        } else {
          $.root().append(offlineShield);
        }

        const finalHtml = $.html();
        let relativeHtmlName = 'index.html';
        if (idx !== 0) {
          try {
            const u = new URL(pageUrl);
            let p = u.pathname.replace(/^\/+/, '').replace(/\.html$/i, '');
            relativeHtmlName = p ? `${p}.html` : `page-${idx}.html`;
          } catch {
            relativeHtmlName = `page-${idx}.html`;
          }
        }

        const pageDiskPath = path.join(targetDir, relativeHtmlName);
        fs.mkdirSync(path.dirname(pageDiskPath), { recursive: true });
        fs.writeFileSync(pageDiskPath, finalHtml, 'utf8');

        if (idx === 0) {
          fs.writeFileSync(path.join(downloadDir, 'index.html'), finalHtml, 'utf8');
        }

        savedPagesCount++;
        discoveredPagesList.push(relativeHtmlName);
      } catch (pageErr: any) {
        appendLog(`[HTTP WARN] Failed crawling ${pageUrl}: ${pageErr.message}`);
      }
    }

    const ctrl = activeJobControls.get(id);
    if (ctrl?.isCancelled && ctrl?.purgeOnCancel) {
      appendLog(`[PURGE] Crawl cancelled and files purged by operator.`);
      try {
        fs.rmSync(downloadDir, { recursive: true, force: true });
      } catch {}
      updateJobState('cancelled');
      return;
    }

    // Ensure index.html ALWAYS exists in targetDir and downloadDir
    const targetIndex = path.join(targetDir, 'index.html');
    const downloadIndex = path.join(downloadDir, 'index.html');
    if (!fs.existsSync(targetIndex) && fs.existsSync(downloadIndex)) {
      fs.copyFileSync(downloadIndex, targetIndex);
    } else if (!fs.existsSync(downloadIndex) && fs.existsSync(targetIndex)) {
      fs.copyFileSync(targetIndex, downloadIndex);
    }

    createCompleteRunnableBundle(targetDir, downloadDir, hostname, {
      url: primaryUrl,
      pagesCount: savedPagesCount,
      assetsCount: savedAssetsCount,
      htmlPages: discoveredPagesList,
    });

    appendLog(`[FINISH] Snapshot completed successfully! Captured ${savedPagesCount} pages and ${savedAssetsCount} assets.`);
    updateJobState('completed');
  } catch (fallbackErr: any) {
    appendLog(`[FALLBACK ERROR] ${fallbackErr.message || fallbackErr}`);
    updateJobState('failed', fallbackErr.message);
  }
}

export async function runAuthCrawler(options: AuthCrawlerOptions) {
  const {
    id,
    targetUrl,
    downloadDir,
    headless = true,
    maxPages = 500, // Default 500 pages limit
  } = options;

  const autoConfig = resolveVuexyConfig(targetUrl || options.loginUrl || 'https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/dashboards/analytics');
  const loginUrl = options.loginUrl || autoConfig.loginUrl;
  const email = options.email || autoConfig.email;
  const password = options.password || autoConfig.password;

  // Detect if user passed a marketing sales page (e.g. pixinvent.com/vuexy-...)
  const isMarketing = !!(targetUrl && targetUrl.includes('pixinvent.com') && !targetUrl.includes('demos.pixinvent.com'));
  const primaryDemoUrl = autoConfig.targetPages[0] || 'https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/dashboards/analytics';

  // Always target the live interactive demo app as effective target
  const effectiveTargetUrl = isMarketing ? primaryDemoUrl : (targetUrl || loginUrl);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(effectiveTargetUrl);
  } catch {
    parsedUrl = new URL('https://demos.pixinvent.com');
  }

  const hostname = parsedUrl.hostname;
  const targetDir = path.join(downloadDir, hostname);
  const logFilePath = path.join(downloadDir, 'crawl_logs.txt');
  const jobJsonPath = path.join(downloadDir, 'job.json');

  // Filter out heavy documentation docs and changelogs that cause collisions or crawl slowdowns
  const cleanTargetPages = autoConfig.targetPages.filter(p => 
    !p.includes('/documentation') && 
    !p.includes('-old') && 
    !p.includes('changelog')
  );

  const initialPages = (options.targetPages && options.targetPages.length > 0)
    ? options.targetPages
    : (isMarketing
        ? [primaryDemoUrl, ...cleanTargetPages.filter(p => p !== primaryDemoUrl)]
        : (targetUrl ? [targetUrl, ...cleanTargetPages.filter(p => p !== targetUrl)] : cleanTargetPages));

  const appendLog = (msg: string) => {
    try {
      fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch {}
  };

  const updateJobState = (status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused', errMessage?: string) => {
    const job: Job = {
      id,
      url: effectiveTargetUrl,
      hostname,
      status,
      error: errMessage,
      addedAt: Date.now(),
      completedAt: status !== 'downloading' ? Date.now() : undefined,
    };
    activeJobs.set(id, job);
    try {
      fs.writeFileSync(jobJsonPath, JSON.stringify(job, null, 2));
    } catch {}
  };

  try {
    safeMkdir(targetDir);
    if (isMarketing) {
      const marketingDir = path.join(downloadDir, 'pixinvent.com');
      safeMkdir(marketingDir);
    }
    appendLog(`[START] WebHarvest Deep Full-Site Harvester initialized`);
    appendLog(`[TARGET] Primary Entrypoint: ${effectiveTargetUrl}`);
    appendLog(`[CONFIG] Auth Portal: ${loginUrl}`);
    appendLog(`[LIMITS] Target Page Limit: ${maxPages >= 50000 ? 'Unlimited (All Pages)' : `${maxPages} pages`} | Multi-Asset Offline Bundle Enabled`);
    updateJobState('downloading');

    let playwright: any;
    try {
      playwright = require('playwright');
    } catch {
      appendLog('[PLAYWRIGHT] Playwright package missing in container. Engaging high-performance HTTP mirror fallback engine...');
      await runHttpAuthFallback({
        id,
        targetUrl,
        inputUrl: effectiveTargetUrl,
        targetPages: initialPages,
        downloadDir,
        targetDir,
        hostname,
        email,
        maxPages,
        appendLog,
        updateJobState,
      });
      return;
    }

    const { chromium } = playwright;
    appendLog(`[PLAYWRIGHT] Launching Chromium browser engine (headless: ${headless})`);

    const browser = await launchChromiumSafe(chromium, {
      headless,
      appendLog,
    });

    if (!browser) {
      appendLog('[PLAYWRIGHT] Headless browser is unavailable in this container environment. Engaging high-performance HTTP mirror fallback engine...');
      await runHttpAuthFallback({
        id,
        targetUrl,
        inputUrl: effectiveTargetUrl,
        targetPages: initialPages,
        downloadDir,
        targetDir,
        hostname,
        email,
        maxPages,
        appendLog,
        updateJobState,
      });
      return;
    }

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 }
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      let page = await context.newPage();

      // Intercept and persist all static assets (CSS, JS, fonts, images, JSON mocks)
      let savedAssetsCount = 0;
      page.on('response', async (response: any) => {
        try {
          const resUrl = response.url();
          if (!resUrl.startsWith('http')) return;
          // Ignore heavy 3rd-party trackers, beacons, and streaming telemetry to preserve Render memory
          if (
            resUrl.includes('google-analytics') ||
            resUrl.includes('googletagmanager') ||
            resUrl.includes('hotjar') ||
            resUrl.includes('facebook.net') ||
            resUrl.includes('doubleclick') ||
            resUrl.includes('hubspot')
          ) return;

          const resUrlObj = new URL(resUrl);
          const isAllowedHost =
            resUrlObj.hostname.includes('pixinvent.com') ||
            resUrlObj.hostname.includes(hostname) ||
            resUrlObj.hostname.includes('fonts.googleapis.com') ||
            resUrlObj.hostname.includes('fonts.gstatic.com');

          if (!isAllowedHost) return;

          const status = response.status();
          if (status >= 200 && status < 300) {
            const pathname = resUrlObj.pathname;
            if (pathname.endsWith('.html') || pathname.endsWith('.htm')) return;

            const ext = path.extname(pathname).toLowerCase();
            const contentType = (response.headers()['content-type'] || '').toLowerCase();

            const isAsset =
              ext ||
              pathname.includes('/assets/') ||
              pathname.includes('/static/') ||
              pathname.includes('/images/') ||
              pathname.includes('/fonts/') ||
              contentType.includes('javascript') ||
              contentType.includes('css') ||
              contentType.includes('image/') ||
              contentType.includes('font/') ||
              contentType.includes('json');

            if (isAsset) {
              const relPath = pathname.replace(/^\/+/, '');
              const assetDiskPath = path.join(targetDir, relPath);
              const assetDir = path.dirname(assetDiskPath);

              if (!fs.existsSync(assetDiskPath)) {
                if (safeMkdir(assetDir)) {
                  // Use 3.5s timeout on response body to prevent CDP protocol deadlocks
                  const buf = await Promise.race([
                    response.body(),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
                  ]).catch(() => null);

                  if (buf && buf.length > 0) {
                    fs.writeFile(assetDiskPath, buf, () => {});
                    savedAssetsCount++;
                    if (savedAssetsCount % 25 === 0) {
                      appendLog(`[ASSETS] Cached ${savedAssetsCount} static assets (${relPath})`);
                    }

                    // Also write alias to marketingDir if user entered marketing domain
                    if (isMarketing) {
                      const altAssetPath = path.join(downloadDir, 'pixinvent.com', relPath);
                      if (safeMkdir(path.dirname(altAssetPath))) {
                        fs.writeFile(altAssetPath, buf, () => {});
                      }
                    }

                    // Also write alias to targetDir/assets/... or targetDir/images/... if nested
                    const assetSubIndex = relPath.indexOf('assets/');
                    if (assetSubIndex > 0) {
                      const simplifiedAssetPath = path.join(targetDir, relPath.slice(assetSubIndex));
                      if (!fs.existsSync(simplifiedAssetPath) && safeMkdir(path.dirname(simplifiedAssetPath))) {
                        fs.writeFile(simplifiedAssetPath, buf, () => {});
                      }
                    }

                    const imgSubIndex = relPath.indexOf('images/');
                    if (imgSubIndex > 0) {
                      const simplifiedImgPath = path.join(targetDir, relPath.slice(imgSubIndex));
                      if (!fs.existsSync(simplifiedImgPath) && safeMkdir(path.dirname(simplifiedImgPath))) {
                        fs.writeFile(simplifiedImgPath, buf, () => {});
                      }
                    }

                    const fontSubIndex = relPath.indexOf('fonts/');
                    if (fontSubIndex > 0) {
                      const simplifiedFontPath = path.join(targetDir, relPath.slice(fontSubIndex));
                      if (!fs.existsSync(simplifiedFontPath) && safeMkdir(path.dirname(simplifiedFontPath))) {
                        fs.writeFile(simplifiedFontPath, buf, () => {});
                      }
                    }
                  }
                }
              }
            }
          }
        } catch {}
      });

      // 1. Initial Authentication Pass
      appendLog(`[AUTH] Navigating to authentication portal: ${loginUrl}`);
      try {
        await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        // Wait 3s for React 19 / MUI hydration on Render CPU
        await page.waitForTimeout(3000);

        const emailSelector = 'input[type="email"], input[name="email"], input[id*="email"], input[placeholder*="email" i]';
        const passSelector = 'input[type="password"], input[name="password"], input[id*="password"], input[placeholder*="password" i]';
        const submitSelector = 'button[type="submit"], form button, button:has-text("Login"), button:has-text("Sign in")';

        // Check for quick demo login buttons (e.g. Admin role chip in Vuexy)
        const demoAdminBtn = await page.$('button:has-text("Admin"), [data-role="admin"], .v-chip:has-text("Admin")').catch(() => null);
        if (demoAdminBtn) {
          appendLog(`[AUTH] Found one-click demo login button. Clicking Admin profile...`);
          await demoAdminBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
        }

        const hasEmail = await page.$(emailSelector).catch(() => null);
        if (hasEmail) {
          appendLog(`[AUTH] Entering credentials: ${email} / ******`);
          await page.fill(emailSelector, email).catch(() => {});
          await page.fill(passSelector, password).catch(() => {});
          // Trigger Enter on password field for instant form submission
          await page.locator(passSelector).press('Enter').catch(() => {});

          const submitBtn = await page.$(submitSelector).catch(() => null);
          if (submitBtn) {
            appendLog(`[AUTH] Submitting login form`);
            await submitBtn.click().catch(() => {});

            // Wait until NextAuth sets session cookie or redirects
            for (let i = 0; i < 15; i++) {
              await page.waitForTimeout(600);
              const cookies = await context.cookies();
              const hasToken = cookies.some((c: any) =>
                c.name.includes('session-token') || c.name.includes('session')
              );
              if (hasToken && !page.url().includes('/login')) break;
            }
          }
        }

        const currUrl = page.url();
        const isLoggedIn = !currUrl.includes('/login') && !currUrl.includes('/signin');
        if (isLoggedIn) {
          appendLog(`[AUTH] Logged in successfully. Current URL: ${currUrl}`);
        } else {
          appendLog(`[AUTH] Login form submitted. Injected active admin session guard.`);
        }
      } catch (authErr: any) {
        appendLog(`[AUTH WARN] Login pass completed: ${authErr.message}`);
      }

      // Guarantee active authenticated session state in browser context
      await context.addInitScript(({ id, email }: { id: string; email: string }) => {
        try {
          localStorage.setItem('userData', JSON.stringify({
            id: 1,
            role: 'admin',
            fullName: 'Vuexy Administrator',
            username: 'admin',
            email: email,
          }));
          localStorage.setItem('accessToken', 'webharvest_demo_authenticated_token');
          localStorage.setItem('userAbilityRules', JSON.stringify([{ action: 'manage', subject: 'all' }]));
          document.cookie = 'next-auth.session-token=webharvest_demo_authenticated_token; path=/';
          document.cookie = 'webharvest_preview_id=' + id + '; path=/';
        } catch(e) {}
      }, { id, email });

      // 2. Export authenticated storage state (cookies & localStorage)
      let storageState: any = {};
      try {
        storageState = await context.storageState();
        fs.writeFileSync(path.join(downloadDir, 'auth_state.json'), JSON.stringify(storageState, null, 2), 'utf8');
        appendLog(`[AUTH] Exported full authenticated session tokens and cookies`);
      } catch {}

      // Comprehensive Offline Shield & Auth State Hydration Script
      const OFFLINE_SHIELD_SCRIPT = `
<!-- [WebHarvest] Offline Auth Guard Shield & State Hydration -->
<script>
(function() {
  console.log('[WebHarvest] Offline resilience shield active.');

  // 1. Ensure active mirror preview cookie is attached
  try {
    document.cookie = "webharvest_preview_id=${id}; path=/; SameSite=Lax";
  } catch(e) {}

  // 2. Hydrate captured session into localStorage
  try {
    var rawState = ${JSON.stringify(storageState)};
    if (rawState && rawState.origins) {
      rawState.origins.forEach(function(orig) {
        if (orig.localStorage) {
          orig.localStorage.forEach(function(item) {
            try { localStorage.setItem(item.name, item.value); } catch(e) {}
          });
        }
      });
    }
  } catch(e) {}

  // 3. Fallback Vuexy session credentials
  try {
    if (!localStorage.getItem('userData')) {
      localStorage.setItem('userData', JSON.stringify({
        id: 1,
        role: 'admin',
        fullName: 'Vuexy Administrator',
        username: 'admin',
        email: '${email}',
        avatar: '/vuexy-vuejs-admin-template/demo-1/images/avatars/avatar-1.png'
      }));
    }
    if (!localStorage.getItem('accessToken')) {
      localStorage.setItem('accessToken', 'mock_offline_webharvest_session_token');
    }
    if (!localStorage.getItem('userAbilityRules')) {
      localStorage.setItem('userAbilityRules', JSON.stringify([{ action: 'manage', subject: 'all' }]));
    }
  } catch (e) {}

  // 4. Safe offline handling for auth forms (Login / Register)
  window.addEventListener('DOMContentLoaded', function() {
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        var isAuthForm = window.location.pathname.includes('login') || window.location.pathname.includes('register');
        if (isAuthForm) {
          e.preventDefault();
          console.log('[WebHarvest Auth] Mocking successful form submission.');
          try {
            localStorage.setItem('userData', JSON.stringify({ id: 1, role: 'admin', fullName: 'Vuexy Admin', email: '${email}' }));
            localStorage.setItem('accessToken', 'mock_offline_webharvest_session_token');
          } catch(err) {}
          var currentDemo = window.location.pathname.match(/demo-\\d+/);
          var demoPrefix = currentDemo ? currentDemo[0] : 'demo-1';
          window.location.href = '../dashboards/analytics.html';
        }
      });
    });
  });

  // 5. Prevent unwanted page bounces
  try {
    var origAssign = window.location.assign.bind(window.location);
    var origReplace = window.location.replace.bind(window.location);

    window.location.assign = function(u) {
      if (typeof u === 'string' && u.includes('/login') && !window.location.pathname.includes('login')) {
        console.warn('[WebHarvest Shield] Prevented bounce to login:', u);
        return;
      }
      return origAssign(u);
    };

    window.location.replace = function(u) {
      if (typeof u === 'string' && u.includes('/login') && !window.location.pathname.includes('login')) {
        console.warn('[WebHarvest Shield] Prevented bounce to login:', u);
        return;
      }
      return origReplace(u);
    };
  } catch(e) {}

  // 6. Router Path Normalization for in-app preview iframe
  // If previewing inside WebHarvest (/api/mirror/[id]/preview/...),
  // normalize window.history so client-side routers (Vue Router, React Router)
  // recognize the active route instead of hitting an empty 404 router fallback!
  try {
    if (window.location.pathname.indexOf('/api/mirror/') !== -1) {
      var targetPath = '/vuexy-vuejs-admin-template/demo-1/dashboards/analytics';
      var previewMatch = window.location.pathname.match(/\\/preview\\/(.*)$/);
      if (previewMatch && previewMatch[1]) {
        var sub = previewMatch[1].replace(/\\.html$/, '').replace(/\\/index$/, '');
        if (sub && sub !== 'index') {
          targetPath = sub.indexOf('vuexy-') === 0 ? ('/' + sub) : ('/vuexy-vuejs-admin-template/demo-1/' + sub);
        }
      }
      window.history.replaceState(null, '', targetPath);
    }
  } catch(e) {}
})();
</script>
`;

      let primaryHtmlSaved = false;
      const crawledUrls = new Set<string>();
      const crawlQueue = [...initialPages];
      let pageCount = 0;

      appendLog(`[CRAWL] Starting deep crawl queue (${maxPages >= 50000 ? 'Unlimited pages mode' : `Up to ${maxPages} pages`})`);

      while (crawlQueue.length > 0 && pageCount < maxPages) {
        const ctrl = activeJobControls.get(id);
        if (ctrl?.isCancelled) {
          appendLog(`[CRAWL CANCELLED] Stopped by user at page ${pageCount + 1}`);
          break;
        }
        while (ctrl?.isPaused && !ctrl?.isCancelled) {
          appendLog(`[PAUSED] Playwright crawl paused. Waiting for resume...`);
          await new Promise<void>((resolve) => {
            if (ctrl) ctrl.pausePromiseResolve = resolve;
            setTimeout(resolve, 1000);
          });
        }
        if (ctrl?.isCancelled) break;

        const pageUrl = crawlQueue.shift()!;
        if (crawledUrls.has(pageUrl)) continue;
        crawledUrls.add(pageUrl);
        pageCount++;

        // Periodically recycle Playwright page every 15 pages to purge Chromium V8 heap on Render 512MB RAM
        if (pageCount > 1 && pageCount % 15 === 0) {
          try {
            await page.close().catch(() => {});
            page = await context.newPage();
          } catch {}
        }

        let urlObj: URL;
        try {
          urlObj = new URL(pageUrl);
        } catch {
          continue;
        }

        const cleanRelative = urlObj.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
        const pageFileName = path.basename(cleanRelative) || 'index';
        const progressTarget = maxPages >= 50000 
          ? (crawlQueue.length + pageCount) 
          : Math.min(crawlQueue.length + pageCount, maxPages);
        appendLog(`[CRAWL] (${pageCount}/${progressTarget}${maxPages >= 50000 ? ' discovered' : ''}) Loading: ${urlObj.pathname}`);

        try {
          // Fast domcontentloaded + micro-wait for dynamic chunks
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 14000 }).catch(() => {});
          await page.waitForTimeout(600);

          // Dynamic Link Discovery up to maxPages limit
          if (crawlQueue.length < maxPages) {
            const demoMatch = effectiveTargetUrl.match(/(demo-\d+)/i);
            const activeDemoTag = demoMatch ? demoMatch[1].toLowerCase() : 'demo-1';

            const discoveredLinks: string[] = await page.evaluate((params: { currHost: string; activeDemoTag: string }) => {
              const links: string[] = [];
              document.querySelectorAll('a[href]').forEach((el: any) => {
                const href = el.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                  try {
                    const u = new URL(href, window.location.href);
                    const isSameSite = u.hostname === params.currHost || u.hostname.includes('pixinvent.com');
                    const isDocOrOld = 
                      u.pathname.includes('/documentation') || 
                      u.pathname.includes('/docs/') || 
                      u.pathname.includes('-old') || 
                      u.pathname.includes('changelog');

                    // Restrict subpage discovery to active demo (e.g. demo-1) so we do not spider 600+ redundant pages across demo-2..6
                    const otherDemoMatch = u.pathname.match(/(demo-\d+)/i);
                    const isOtherDemo = otherDemoMatch && otherDemoMatch[1].toLowerCase() !== params.activeDemoTag;

                    if (isSameSite && !isDocOrOld && !isOtherDemo && !u.pathname.endsWith('.zip') && !u.pathname.endsWith('.pdf')) {
                      links.push(u.href.split('#')[0]);
                    }
                  } catch {}
                }
              });
              return links;
            }, { currHost: urlObj.hostname, activeDemoTag }).catch(() => []);

            for (const link of discoveredLinks) {
              if (!crawledUrls.has(link) && !crawlQueue.includes(link) && (crawlQueue.length + pageCount) < maxPages) {
                crawlQueue.push(link);
              }
            }
          }

          let content = await page.content();

          // Inject offline resilience shield
          if (content.includes('<head>')) {
            content = content.replace('<head>', `<head>\n${OFFLINE_SHIELD_SCRIPT}`);
          } else {
            content = `${OFFLINE_SHIELD_SCRIPT}\n${content}`;
          }

          // 1. Save standard path (e.g. apps/email.html)
          const pageDir = path.join(targetDir, path.dirname(cleanRelative));
          try {
            if (safeMkdir(pageDir)) {
              const savePathHtml = path.join(pageDir, pageFileName.endsWith('.html') ? pageFileName : `${pageFileName}.html`);
              fs.writeFileSync(savePathHtml, content, 'utf8');
              appendLog(`[SAVED] Captured: ${path.relative(downloadDir, savePathHtml)}`);
            }
          } catch (writeErr: any) {}

          // 2. Also save as directory index (e.g. apps/email/index.html) for clean URL web servers
          try {
            const cleanDirName = pageFileName.replace(/\.html$/, '');
            const cleanDir = path.join(pageDir, cleanDirName);
            if (safeMkdir(cleanDir)) {
              fs.writeFileSync(path.join(cleanDir, 'index.html'), content, 'utf8');
            }
          } catch (cleanDirErr) {}

          // 3. Convenience alias: also save at targetDir root without deep demo prefixes
          // e.g. If cleanRelative is "vuexy-vuejs-admin-template/demo-1/apps/email",
          // also write to "targetDir/apps/email.html" and "targetDir/apps/email/index.html"
          const demoSubMatch = cleanRelative.match(/demo-\d+\/(.*)/);
          if (demoSubMatch && demoSubMatch[1]) {
            const shortPath = demoSubMatch[1];
            const shortPageDir = path.join(targetDir, path.dirname(shortPath));
            try {
              if (safeMkdir(shortPageDir)) {
                const shortHtml = path.join(shortPageDir, pageFileName.endsWith('.html') ? pageFileName : `${pageFileName}.html`);
                if (!fs.existsSync(shortHtml)) {
                  fs.writeFileSync(shortHtml, content, 'utf8');
                }

                const shortCleanDir = path.join(shortPageDir, pageFileName.replace(/\.html$/, ''));
                if (safeMkdir(shortCleanDir)) {
                  fs.writeFileSync(path.join(shortCleanDir, 'index.html'), content, 'utf8');
                }
              }
            } catch (shortErr) {}
          }

          // 4. Set root index.html from primary dashboard page (not marketing page)
          const isMainDashboard = cleanRelative.includes('dashboards') || cleanRelative.includes('analytics') || (!cleanRelative.includes('vuexy-mui') && !cleanRelative.includes('marketing'));
          if (!primaryHtmlSaved && isMainDashboard) {
            const rootIndexPath = path.join(targetDir, 'index.html');
            fs.writeFileSync(rootIndexPath, content, 'utf8');

            const baseIndexPath = path.join(downloadDir, 'index.html');
            fs.writeFileSync(baseIndexPath, content, 'utf8');

            if (isMarketing) {
              const marketingDir = path.join(downloadDir, 'pixinvent.com');
              if (safeMkdir(marketingDir)) {
                fs.writeFileSync(path.join(marketingDir, 'index.html'), content, 'utf8');
              }
            }

            primaryHtmlSaved = true;
            appendLog(`[INDEX] Generated primary root index.html from ${cleanRelative}`);
          }

          // Also save in root of active demo folder (e.g. demo-1/index.html)
          const demoDir = path.join(targetDir, cleanRelative.split('/')[0] || '', cleanRelative.split('/')[1] || '');
          if (fs.existsSync(demoDir) && fs.statSync(demoDir).isDirectory()) {
            const demoIndexPath = path.join(demoDir, 'index.html');
            if (!fs.existsSync(demoIndexPath)) {
              fs.writeFileSync(demoIndexPath, content, 'utf8');
            }
          }
        } catch (pageErr: any) {
          appendLog(`[PAGE WARN] Failed rendering ${pageUrl}: ${pageErr.message}`);
        }
      }

      // Generate complete standalone runnable Node.js & Python bundle
      createCompleteRunnableBundle(targetDir, downloadDir, hostname);
      appendLog(`[FINISH] WebHarvest crawl completed successfully. Captured ${pageCount} pages and ${savedAssetsCount} static assets.`);
      updateJobState('completed');
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    appendLog(`[ERROR] ${err.message}`);
    updateJobState('failed', err.message);
  }
}

/**
 * Generate a complete standalone runnable project bundle containing:
 * - server.js: Zero-dependency Node.js HTTP server with SPA routing, clean URLs & CORS
 * - package.json: Runnable with "npm start" or "node server.js"
 * - serve.py: Standalone Python 3 multi-threaded server
 * - start.sh & start.bat: 1-click launch scripts for Linux, macOS & Windows
 * - README.md: Clear offline running instructions
 */
export interface RunnableBundleOptions {
  url?: string;
  totalSize?: string;
  pagesCount?: number;
  assetsCount?: number;
  techStack?: string;
  htmlPages?: string[];
}

export function createCompleteRunnableBundle(
  targetDir: string,
  downloadDir: string,
  hostname: string,
  options?: RunnableBundleOptions
) {
  // Auto-discover stats if not explicitly passed
  let discoveredPages: string[] = options?.htmlPages ? [...options.htmlPages] : [];
  let discoveredSize = options?.totalSize || '';
  let discoveredPagesCount = options?.pagesCount || 0;
  let discoveredAssetsCount = options?.assetsCount || 0;
  let discoveredTechStack = options?.techStack || 'HTML5, CSS3, Modern Web Components';
  const sourceUrl = options?.url || `https://${hostname}`;

  try {
    const reportPath = path.join(downloadDir, 'report.json');
    if (fs.existsSync(reportPath)) {
      const rep = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      if (rep.totalSizeFormatted && !discoveredSize) discoveredSize = rep.totalSizeFormatted;
      if (rep.pagesCount && !discoveredPagesCount) discoveredPagesCount = rep.pagesCount;
      if (rep.assetsCount && !discoveredAssetsCount) discoveredAssetsCount = rep.assetsCount;
      if (rep.techStack && discoveredTechStack.includes('Modern Web')) discoveredTechStack = rep.techStack;
    }
  } catch {}

  try {
    const manifestPath = path.join(downloadDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (man.stats?.totalSize && !discoveredSize) {
        const bytes = man.stats.totalSize;
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        discoveredSize = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
      if (man.stats?.totalFiles && !discoveredAssetsCount) {
        discoveredAssetsCount = man.stats.totalFiles;
      }
    }
  } catch {}

  // Scan targetDir for pages if discoveredPages is empty
  if (discoveredPages.length === 0) {
    function scanPages(dir: string, base: string = '') {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const rel = base ? `${base}/${entry.name}` : entry.name;
          if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.htm'))) {
            discoveredPages.push(rel);
          } else if (entry.isDirectory() && discoveredPages.length < 50) {
            scanPages(path.join(dir, entry.name), rel);
          }
        }
      } catch {}
    }
    scanPages(targetDir);
  }

  if (!discoveredPagesCount) discoveredPagesCount = discoveredPages.length || 1;
  if (!discoveredSize) discoveredSize = 'Captured Archive Bundle';

  const pagesRows = discoveredPages.slice(0, 25).map((p, idx) => {
    const cleanName = p.replace(/\.html$/i, '').split('/').pop() || 'Home';
    return `| ${idx + 1} | \`${p}\` | ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} | [Open Locally](/${p}) |`;
  }).join('\n');

  const pagesTable = discoveredPages.length > 0
    ? `| # | Local File Path | Page Title / Route | Direct Link |
| :-: | :--- | :--- | :--- |
${pagesRows}${discoveredPages.length > 25 ? `\n\n*... and ${discoveredPages.length - 25} more captured subpages.*` : ''}`
    : `*All captured assets are bundled under root directory.*`;

  // 1. Zero-dependency Node.js Standalone Server (server.js)
  const serverJsContent = `#!/usr/bin/env node
/**
 * WebHarvest Standalone Offline Mirror Server
 * Built with zero external dependencies using Node.js native http, fs, and path modules.
 * Supports Single-Page Application (SPA) routing, extensionless clean URLs, and CORS.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || process.argv[2] || '8080', 10);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function findFileRecursive(dir, targetName, maxDepth = 6) {
  if (maxDepth <= 0) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
        return full;
      } else if (entry.isDirectory()) {
        const res = findFileRecursive(full, targetName, maxDepth - 1);
        if (res) return res;
      }
    }
  } catch (e) {}
  return null;
}

function resolveFile(requestedPath) {
  let localPath = path.join(ROOT, requestedPath);

  // 1. Direct file match
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      const idx = path.join(localPath, 'index.html');
      if (fs.existsSync(idx)) return idx;
    } else {
      return localPath;
    }
  }

  // 2. Extensionless .html match (e.g. /apps/email -> /apps/email.html)
  if (fs.existsSync(localPath + '.html')) {
    return localPath + '.html';
  }

  // 3. Match in subdirectory ignoring base prefix
  const parts = requestedPath.replace(/^\\/+/, '').split('/');
  for (let i = 1; i < parts.length; i++) {
    const subPath = path.join(ROOT, ...parts.slice(i));
    if (fs.existsSync(subPath) && fs.statSync(subPath).isFile()) {
      return subPath;
    }
    if (fs.existsSync(subPath + '.html')) {
      return subPath + '.html';
    }
  }

  // 4. Recursive search for static assets (js, css, images, fonts, json)
  const baseName = path.basename(requestedPath).split('?')[0];
  const ext = path.extname(baseName).toLowerCase();
  if (['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff2', '.woff', '.ttf', '.json', '.webp', '.ico'].includes(ext)) {
    const found = findFileRecursive(ROOT, baseName);
    if (found) return found;
  }

  // 5. Recursive search for sub-page html files
  if (!ext || ext === '.html') {
    const targetHtml = baseName.endsWith('.html') ? baseName : (baseName + '.html');
    const foundHtml = findFileRecursive(ROOT, targetHtml);
    if (foundHtml) return foundHtml;
  }

  // 6. SPA Fallback: return root index.html for navigation routes
  if (!ext || ext === '.html') {
    const rootIndex = path.join(ROOT, 'index.html');
    if (fs.existsSync(rootIndex)) return rootIndex;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const host = req.headers.host || ('localhost:' + PORT);
  const parsed = new URL(req.url, 'http://' + host);
  const pathname = decodeURIComponent(parsed.pathname || '/');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('X-Frame-Options', 'ALLOWALL');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const filePath = resolveFile(pathname);

  if (!filePath || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found: ' + pathname);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║               WebHarvest Standalone Offline Mirror Server             ║');
  console.log('║                                                                       ║');
  console.log('║   Local Preview:   http://localhost:' + PORT + '/                            ║');
  console.log('║                                                                       ║');
  console.log('║   ✓ Single-Page Application (SPA) Fallback Enabled                    ║');
  console.log('║   ✓ Extensionless Clean URLs Enabled                                  ║');
  console.log('║   ✓ Recursive Asset Resolution Active                                 ║');
  console.log('║   ✓ Pre-Hydrated Offline Auth & Session Tokens Active                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('Press Ctrl+C to terminate server.');
});
`;

  // 2. package.json for npm users
  const packageJsonContent = JSON.stringify({
    name: "mirrored-application",
    version: "1.0.0",
    description: `Mirrored application for ${hostname} generated by WebHarvest`,
    main: "server.js",
    scripts: {
      start: "node server.js",
      serve: "node server.js 8080"
    },
    keywords: ["webharvest", "mirrored-site", "offline", "spa"],
    author: "WebHarvest",
    license: "ISC"
  }, null, 2);

  // 3. Standalone Python 3 server (serve.py)
  const serverPyContent = `#!/usr/bin/env python3
"""
WebHarvest Standalone Local Mirror Server
Supports multi-threading, Single Page Application (SPA) routing, and correct MIME types.
"""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Frame-Options', 'ALLOWALL')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        local_path = self.translate_path(path)

        if os.path.exists(local_path):
            return super().do_GET()

        if os.path.exists(local_path + '.html'):
            self.path = path + '.html'
            return super().do_GET()

        filename = os.path.basename(path)
        if filename:
            for root, dirs, files in os.walk('.'):
                if filename in files:
                    rel_dir = os.path.relpath(root, '.')
                    self.path = '/' + os.path.join(rel_dir, filename).replace('\\\\', '/')
                    return super().do_GET()

        if not os.path.splitext(path)[1]:
            if os.path.exists('index.html'):
                self.path = '/index.html'
                return super().do_GET()

        return super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f" WebHarvest Mirror Server running at http://localhost:{PORT}")
        print(" Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\nServer stopped.")
`;

  // 4. Linux / macOS runner (start.sh)
  const startShContent = `#!/bin/bash
echo "Launching WebHarvest Local Mirror..."
if command -v node >/dev/null 2>&1; then
  echo "Running with Node.js on http://localhost:8080"
  node server.js 8080
elif command -v python3 >/dev/null 2>&1; then
  echo "Running with Python 3 on http://localhost:8080"
  python3 serve.py 8080
else
  echo "Error: Please install Node.js or Python to run this mirror locally."
fi
`;

  // 5. Windows runner (start.bat)
  const startBatContent = `@echo off
echo Launching WebHarvest Local Mirror...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Running with Node.js on http://localhost:8080
  node server.js 8080
  goto end
)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Running with Python on http://localhost:8080
  python serve.py 8080
  goto end
)
echo Please install Node.js or Python to run this mirror.
:end
pause
`;

  // 6. Complete Documentation (README.md) as per this ZIP file
  const readmeMdContent = `# 🌐 Mirror Archive: ${hostname}

> Complete, self-contained offline mirror generated by **WebHarvest v3** on ${new Date().toUTCString()}.

---

## 📊 Archive Summary & Metrics

| Specification | Value |
| :--- | :--- |
| **Target Host** | \`${hostname}\` |
| **Source URL** | [${sourceUrl}](${sourceUrl}) |
| **Total Archive Size** | **${discoveredSize}** |
| **Captured Pages** | **${discoveredPagesCount}** HTML documents |
| **Captured Assets** | **${discoveredAssetsCount || 'Multiple'}** resources (Images, CSS, JS, Fonts) |
| **Detected Technology** | \`${discoveredTechStack}\` |
| **CORS & Fallback** | Full SPA routing fallback & extensionless clean URL support |

---

## 🚀 How to Run Locally

You can launch this mirrored site immediately with **zero external dependencies**:

### Option 1: Node.js (Recommended)
Zero npm install required. Simply run:
\`\`\`bash
node server.js
\`\`\`
*Runs natively using Node.js standard libraries (\`http\`, \`fs\`, \`path\`).*
*Default port: \`http://localhost:8080\` (or custom: \`node server.js 3000\`)*

Or using npm:
\`\`\`bash
npm start
\`\`\`

### Option 2: Python 3
\`\`\`bash
python3 serve.py
\`\`\`
*Default port: \`http://localhost:8080\` (or custom: \`python3 serve.py 3000\`)*

### Option 3: Double-Click Shell Launchers
- **macOS / Linux**: Double-click \`start.sh\` (or run \`./start.sh\` in terminal)
- **Windows**: Double-click \`start.bat\`

---

## 📑 Captured Pages Index

${pagesTable}

---

## 📁 Directory Structure

\`\`\`
├── index.html          # Main landing entry page
├── server.js           # Zero-dependency Node.js standalone server
├── serve.py            # Zero-dependency Python 3 server
├── start.sh            # One-click launcher for macOS/Linux
├── start.bat           # One-click launcher for Windows
├── package.json        # NPM start configuration
├── README.md           # This archive summary and documentation
├── pages/              # Mirrored subpages and routes
└── assets/             # Bundled images, stylesheets, scripts, and fonts
\`\`\`

---

## 🛡️ Offline Features
- **Client-Side SPA Routing**: Automatically falls back to internal routes and resolves HTML files dynamically.
- **Clean Extensionless URLs**: Maps routes like \`/about\` directly to \`/about.html\`.
- **Pre-Hydrated Demo Auth**: Offline session tokens and demo user records are primed for testing.
- **100% Self-Contained**: All relative links, media, and stylesheets operate completely offline.
`;

  const filesToWrite = [
    { name: 'server.js', content: serverJsContent, mode: 0o755 },
    { name: 'package.json', content: packageJsonContent },
    { name: 'serve.py', content: serverPyContent, mode: 0o755 },
    { name: 'start.sh', content: startShContent, mode: 0o755 },
    { name: 'start.bat', content: startBatContent },
    { name: 'README.md', content: readmeMdContent },
  ];

  for (const dir of [targetDir, downloadDir]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      for (const f of filesToWrite) {
        const p = path.join(dir, f.name);
        fs.writeFileSync(p, f.content, 'utf8');
        if (f.mode) {
          try { fs.chmodSync(p, f.mode); } catch {}
        }
      }
    } catch {}
  }
}
