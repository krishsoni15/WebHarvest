import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Ensure PLAYWRIGHT_BROWSERS_PATH has a persistent default if not provided
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const localBrowsers = path.join(process.cwd(), 'node_modules', 'playwright-core', '.local-browsers');
  if (fs.existsSync(localBrowsers)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
  }
}

/**
 * Launch Chromium with automatic runtime installation if binary is missing.
 * Returns the Browser instance, or null if browser engine is entirely unsupported on host.
 */
export async function launchChromiumSafe(
  chromium: any,
  options: {
    headless?: boolean;
    appendLog?: (msg: string) => void;
    extraArgs?: string[];
  } = {}
) {
  const log = options.appendLog || console.log;
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-web-security',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    ...(options.extraArgs || []),
  ];

  const launchConfig = {
    headless: options.headless ?? true,
    args: launchArgs,
  };

  try {
    return await chromium.launch(launchConfig);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isMissingExecutable =
      msg.includes("Executable doesn't exist") ||
      msg.includes('playwright install') ||
      msg.includes('chromium_headless_shell') ||
      msg.includes('chrome-headless-shell');

    if (isMissingExecutable) {
      log('[PLAYWRIGHT] Chromium binary missing in runtime cache. Attempting on-the-fly installation...');
      try {
        execSync('npx playwright install chromium', {
          stdio: 'pipe',
          timeout: 180000,
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0',
          },
        });
        log('[PLAYWRIGHT] Chromium installed successfully! Retrying browser launch...');
        return await chromium.launch(launchConfig);
      } catch (installErr: any) {
        log(`[PLAYWRIGHT] Auto-install failed: ${installErr?.message || installErr}`);
      }
    }

    log(`[PLAYWRIGHT] Browser launch failed (${msg.slice(0, 140)}). Falling back to resilient HTTP mode.`);
    return null;
  }
}
