/**
 * WebHarvest Authenticated Crawler
 * Crawls dynamic SPA and admin dashboards requiring credentials or session storage.
 *
 * Usage:
 *   node scripts/crawler_auth.cjs
 *   or:
 *   npm run crawl:auth
 */

const fs = require('fs');
const path = require('path');

// CLI options & defaults
const CONFIG = {
  loginUrl: process.env.LOGIN_URL || 'https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/login',
  email: process.env.AUTH_EMAIL || 'admin@vuexy.com',
  password: process.env.AUTH_PASSWORD || 'admin',
  targetPages: [
    'https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/dashboards/analytics',
    'https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/dashboards/crm',
    'https://demos.pixinvent.com/vuexy-vuejs-admin-template/demo-1/dashboards/ecommerce'
  ],
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '..', 'crawled_pages'),
  headless: process.env.HEADLESS !== 'false'
};

async function runAuthenticatedCrawler(customConfig = {}) {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.error('Playwright is not installed yet.');
    throw new Error('Playwright not found');
  }

  const { chromium } = playwright;
  const config = Object.assign({}, CONFIG, customConfig);

  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  console.log('Starting Authenticated Crawler...');
  console.log('Target:', config.targetPages[0]);
  console.log('Output Directory:', config.outputDir);

  const browser = await chromium.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 }
    });

    // 1. Inject Authentication Cookies (Used by Vuexy & modern SPAs)
    const domain = new URL(config.targetPages[0]).hostname;
    await context.addCookies([
      {
        name: 'userData',
        value: encodeURIComponent(JSON.stringify({
          id: 1,
          fullName: 'John Doe',
          username: 'admin',
          email: config.email,
          role: 'admin',
          avatar: '/vuexy-vuejs-admin-template/demo-1/assets/avatar-1-DMk2FF1-.png',
          abilityRules: [{ action: 'manage', subject: 'all' }]
        })),
        domain: domain,
        path: '/'
      },
      {
        name: 'accessToken',
        value: 'mock-access-token-webharvest',
        domain: domain,
        path: '/'
      },
      {
        name: 'userAbilityRules',
        value: encodeURIComponent(JSON.stringify([{ action: 'manage', subject: 'all' }])),
        domain: domain,
        path: '/'
      }
    ]);

    const page = await context.newPage();

    // 2. Track & Download Live Assets (CSS, Images, Fonts)
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const status = response.status();
        if (status !== 200) return;

        if (url.includes('/assets/') || url.endsWith('.css') || url.endsWith('.png') || url.endsWith('.svg') || url.endsWith('.woff2')) {
          const parsed = new URL(url);
          const localRel = parsed.pathname.replace(/^\/+/, '');
          const localTarget = path.join(config.outputDir, localRel);
          if (!fs.existsSync(localTarget)) {
            fs.mkdirSync(path.dirname(localTarget), { recursive: true });
            const buffer = await response.body();
            fs.writeFileSync(localTarget, buffer);
          }
        }
      } catch (e) {}
    });

    // 3. Crawl Each Target Dashboard Page
    for (const targetUrl of config.targetPages) {
      console.log('Crawling dashboard page:', targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 });
      await page.waitForTimeout(3000);

      const urlObj = new URL(targetUrl);
      const cleanSlug = urlObj.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '_') || 'dashboard';
      const pageFileName = cleanSlug + '.html';
      const filePath = path.join(config.outputDir, pageFileName);

      // Get rendered DOM
      let content = await page.content();

      // Strip module scripts that clear the DOM when viewed offline without backend
      content = content.replace(/<script type="module"[^>]+><\/script>/g, '<!-- WebHarvest: module script disabled for offline DOM preservation -->');

      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Saved page HTML to:', filePath);

      // Save screenshot
      const screenshotPath = path.join(config.outputDir, cleanSlug + '.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log('Saved screenshot to:', screenshotPath);
    }

    console.log('Authenticated crawling completed successfully!');
    console.log('You can view all saved pages inside:', config.outputDir);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  runAuthenticatedCrawler().catch((err) => {
    console.error('Crawling failed:', err.message);
    process.exit(1);
  });
}

module.exports = { runAuthenticatedCrawler };
