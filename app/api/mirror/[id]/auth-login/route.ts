import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getBaseDownloadDir } from '@/lib/resolveDir';
import { activeJobs } from '@/lib/jobStore';
import { runAuthCrawler, resolveVuexyConfig } from '@/lib/authCrawler';
import { launchChromiumSafe } from '@/lib/crawler/playwrightHelper';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    let { email, password, autoDetect = true } = body;

    const baseDir = getBaseDownloadDir(id);
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Retrieve target URL from job metadata
    let targetUrl = '';
    const jobJsonPath = path.join(baseDir, 'job.json');
    const reportJsonPath = path.join(baseDir, 'report.json');

    if (fs.existsSync(jobJsonPath)) {
      try {
        const job = JSON.parse(fs.readFileSync(jobJsonPath, 'utf-8'));
        targetUrl = job.url || '';
      } catch {}
    } else if (fs.existsSync(reportJsonPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'));
        targetUrl = report.seedUrl || '';
      } catch {}
    }

    if (!targetUrl) {
      const activeJob = activeJobs.get(id);
      if (activeJob) {
        targetUrl = activeJob.url;
      }
    }

    if (!targetUrl) {
      targetUrl = 'https://demos.pixinvent.com/vuexy-nextjs-admin-template/demo-1/dashboards/analytics';
    }

    let playwright: any;
    try {
      playwright = require('playwright');
    } catch {
      return NextResponse.json(
        { error: 'Playwright is not installed or available on this host' },
        { status: 500 }
      );
    }

    const { chromium } = playwright;
    const browser = await launchChromiumSafe(chromium, { headless: true });
    if (!browser) {
      return NextResponse.json(
        { error: 'Chromium browser failed to launch on this container' },
        { status: 500 }
      );
    }

    const browserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });

    await browserContext.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await browserContext.newPage();

    // Determine login portal URL
    let loginUrl = targetUrl;
    if (!loginUrl.toLowerCase().includes('/login') && !loginUrl.toLowerCase().includes('/signin')) {
      const autoConfig = resolveVuexyConfig(targetUrl);
      loginUrl = autoConfig.loginUrl;
    }

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body').catch(() => '');

    // Auto-detect credentials if not provided
    if (autoDetect || !email || !password) {
      // 1. Text pattern: "Email: admin@vuexy.com / Pass: admin"
      const emailMatch = bodyText.match(
        /(?:email|user(?:name)?)\s*[:=]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_-]+)/i
      );
      const passMatch = bodyText.match(/(?:pass(?:word)?)\s*[:=]\s*([a-zA-Z0-9._%+-@!#]+)/i);

      if (!email && emailMatch) {
        email = emailMatch[1].trim();
      }
      if (!password && passMatch) {
        password = passMatch[1].trim();
      }

      // 2. Prefilled form inputs
      if (!email) {
        const prefilledEmail = await page
          .$eval('input[type="email"], input[name*="user"], input[name*="email"], input[id*="email"]', (el: any) => el.value)
          .catch(() => '');
        if (prefilledEmail && prefilledEmail.includes('@')) {
          email = prefilledEmail;
        }
      }
      if (!password) {
        const prefilledPass = await page
          .$eval('input[type="password"]', (el: any) => el.value)
          .catch(() => '');
        if (prefilledPass) {
          password = prefilledPass;
        }
      }

      // 3. Known template defaults
      if (!email || !password) {
        if (targetUrl.includes('pixinvent.com') || targetUrl.includes('vuexy')) {
          email = targetUrl.includes('nextjs') ? 'admin@vuexy.com' : 'admin@demo.com';
          password = 'admin';
        } else {
          email = email || 'admin@demo.com';
          password = password || 'admin';
        }
      }
    }

    const emailSelector =
      'input[type="email"], input[name="email"], input[id*="email"], input[placeholder*="email" i], input[type="text"]';
    const passSelector =
      'input[type="password"], input[name="password"], input[id*="password"], input[placeholder*="password" i]';
    const submitSelector =
      'button[type="submit"], form button, button:has-text("Login"), button:has-text("Sign in"), button:has-text("Sign In")';

    await page.fill(emailSelector, email).catch(() => {});
    await page.fill(passSelector, password).catch(() => {});

    const submitBtn = await page.$(submitSelector);
    if (submitBtn) {
      await submitBtn.click().catch(() => {});

      // Wait until NextAuth sets session cookie and redirects to dashboard
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(500);
        const cookies = await browserContext.cookies();
        const hasToken = cookies.some((c: any) =>
          c.name.includes('session-token') || c.name.includes('session')
        );
        if (hasToken && !page.url().includes('/login')) break;
      }
      await page.waitForTimeout(1500);
    }

    const postLoginUrl = page.url();

    // Check for explicit error messages on the login page
    const pageErrorText = await page.evaluate(() => {
      const errorEls = document.querySelectorAll('.alert, .error, [role="alert"], [class*="error"], [class*="invalid"], [class*="danger"]');
      for (const el of errorEls) {
        const txt = el.textContent || '';
        if (/invalid|incorrect|failed|wrong|error|not match|unauthorized/i.test(txt)) {
          return txt.trim();
        }
      }
      return '';
    }).catch(() => '');

    const isStillOnLogin = postLoginUrl.toLowerCase().includes('/login') || postLoginUrl.toLowerCase().includes('/signin');

    if (pageErrorText || (isStillOnLogin && (!email || !password))) {
      await browser.close().catch(() => {});
      return NextResponse.json({
        success: false,
        error: pageErrorText || 'Invalid credentials. User ID or password is incorrect. Please verify and try again.',
        postLoginUrl,
      }, { status: 401 });
    }

    // Capture authenticated storageState
    const storageState = await browserContext.storageState();
    fs.writeFileSync(
      path.join(baseDir, 'auth_state.json'),
      JSON.stringify(storageState, null, 2),
      'utf-8'
    );

    await browser.close().catch(() => {});

    // Dispatch background harvest of full dashboard with authenticated state
    runAuthCrawler({
      id,
      loginUrl,
      targetUrl,
      email,
      password,
      downloadDir: baseDir,
      headless: true,
      maxPages: 50000,
    }).catch((err) => {
      console.error('AuthCrawler background run error:', err);
    });

    return NextResponse.json({
      success: true,
      message: `Successfully authenticated as ${email}. Launched authenticated deep harvest.`,
      email,
      loginUrl,
      postLoginUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Auto-login authentication failed' },
      { status: 500 }
    );
  }
}
