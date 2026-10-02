import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Scan candidate directories to find any installed Chromium or Headless Shell executable.
 */
function findBinaryRecursive(dir: string, binaryNames: string[], depth = 0, maxDepth = 4): string | null {
  if (depth > maxDepth || !fs.existsSync(dir)) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // First pass: check files in this directory
    for (const entry of entries) {
      if (entry.isFile() && binaryNames.includes(entry.name)) {
        const fullPath = path.join(dir, entry.name);
        try {
          fs.accessSync(fullPath, fs.constants.X_OK);
          return fullPath;
        } catch {}
      }
    }
    // Second pass: traverse subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const found = findBinaryRecursive(path.join(dir, entry.name), binaryNames, depth + 1, maxDepth);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

export function findExistingChromiumBinary(): string | null {
  const binaryNames = ['chrome-headless-shell', 'chrome', 'chromium', 'google-chrome'];

  // Check system PATH binaries first
  for (const bin of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    try {
      if (fs.existsSync(bin)) {
        fs.accessSync(bin, fs.constants.X_OK);
        return bin;
      }
    } catch {}
  }

  const candidateRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
      ? process.env.PLAYWRIGHT_BROWSERS_PATH
      : null,
    path.join(process.cwd(), 'node_modules', 'playwright-core', '.local-browsers'),
    path.join(process.cwd(), 'node_modules', '.local-browsers'),
    path.join(process.cwd(), 'node_modules', '@playwright', 'browsers'),
    path.join(process.cwd(), 'node_modules', '.cache', 'ms-playwright'),
    '/opt/render/.cache/ms-playwright',
    path.join(process.env.HOME || '/root', '.cache', 'ms-playwright'),
    '/root/.cache/ms-playwright',
    '/home/render/.cache/ms-playwright',
  ].filter(Boolean) as string[];

  for (const root of candidateRoots) {
    if (!fs.existsSync(root)) continue;
    const found = findBinaryRecursive(root, binaryNames, 0, 4);
    if (found) return found;
  }
  return null;
}

/**
 * Launch Chromium with automatic runtime installation if binary is missing.
 * Installs both chromium and chromium-headless-shell to guarantee compatibility on Render/Linux.
 * Explicitly discovers executablePath so Playwright never fails on missing cache directories.
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

  // Ensure process.env.PLAYWRIGHT_BROWSERS_PATH is standardized
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    // If node_modules/@playwright/browsers exists, point to it; otherwise default to cache
    const nodeBrowsers = path.join(process.cwd(), 'node_modules', '@playwright', 'browsers');
    if (fs.existsSync(nodeBrowsers)) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
    }
  }

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--no-first-run',
    '--no-zygote',
    '--disable-web-security',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-default-browser-check',
    '--mute-audio',
    '--js-flags=--max-old-space-size=128',
    ...(options.extraArgs || []),
  ];

  let existingBinary = findExistingChromiumBinary();

  const getLaunchConfig = (binPath?: string | null) => ({
    headless: options.headless ?? true,
    args: launchArgs,
    ...(binPath ? { executablePath: binPath } : {}),
  });

  try {
    return await chromium.launch(getLaunchConfig(existingBinary));
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isMissingExecutable =
      msg.includes("Executable doesn't exist") ||
      msg.includes('playwright install') ||
      msg.includes('chromium_headless_shell') ||
      msg.includes('chrome-headless-shell') ||
      !existingBinary;

    if (isMissingExecutable) {
      log('[PLAYWRIGHT] Chromium & Headless Shell binaries missing in runtime cache. Installing required browser packages...');
      try {
        const installTarget = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';
        process.env.PLAYWRIGHT_BROWSERS_PATH = installTarget;

        execSync('npx playwright install chromium chromium-headless-shell', {
          stdio: 'pipe',
          timeout: 240000,
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: installTarget,
          },
        });

        // Re-scan for the newly installed binary
        existingBinary = findExistingChromiumBinary();
        log(`[PLAYWRIGHT] Chromium and Headless Shell installed successfully! (binary: ${existingBinary || 'auto-resolved'}) Retrying browser launch...`);

        return await chromium.launch(getLaunchConfig(existingBinary));
      } catch (installErr: any) {
        log(`[PLAYWRIGHT] Auto-install failed: ${installErr?.message || installErr}`);
      }
    }

    log(`[PLAYWRIGHT] Browser launch failed (${msg.slice(0, 140)}). Falling back to resilient HTTP mode.`);
    return null;
  }
}
