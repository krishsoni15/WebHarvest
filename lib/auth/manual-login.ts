/**
 * WebHarvest Manual Browser Login Engine
 *
 * Launches an isolated Playwright browser window allowing the user
 * to authenticate directly on the target website (supporting 2FA, OAuth, SSO).
 * Extracts the storageState (cookies & localStorage) once login is confirmed.
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import { createAuthProfile } from '../db/client';
import { PlaywrightStorageState } from './session';

export interface ActiveLoginSession {
  id: string;
  url: string;
  domain: string;
  status: 'launching' | 'awaiting_login' | 'completed' | 'failed' | 'cancelled';
  browser: Browser | null;
  context: BrowserContext | null;
  startedAt: number;
  storageState?: PlaywrightStorageState;
  error?: string;
}

const activeSessions = new Map<string, ActiveLoginSession>();

/**
 * Start an interactive manual login session.
 */
export async function startManualLogin(targetUrl: string): Promise<string> {
  const sessionId = `login_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let domain = 'example.com';
  try {
    domain = new URL(targetUrl).hostname;
  } catch {}

  const session: ActiveLoginSession = {
    id: sessionId,
    url: targetUrl,
    domain,
    status: 'launching',
    browser: null,
    context: null,
    startedAt: Date.now(),
  };

  activeSessions.set(sessionId, session);

  // Launch browser asynchronously
  (async () => {
    try {
      // Check if DISPLAY or WAYLAND_DISPLAY exists for headed mode
      const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);

      const browser = await chromium.launch({
        headless: !hasDisplay, // Headed if desktop display available, fallback to headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--start-maximized',
        ],
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 WebHarvest/3.0',
      });

      session.browser = browser;
      session.context = context;
      session.status = 'awaiting_login';

      const page = await context.newPage();
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});

      // Auto-timeout after 10 minutes if user walks away
      setTimeout(() => {
        if (activeSessions.get(sessionId)?.status === 'awaiting_login') {
          cancelManualLogin(sessionId);
        }
      }, 10 * 60 * 1000);
    } catch (err: any) {
      session.status = 'failed';
      session.error = err.message || 'Failed to launch browser login session';
    }
  })();

  return sessionId;
}

/**
 * Check the status of an ongoing manual login session.
 */
export function getManualLoginStatus(sessionId: string): {
  id: string;
  status: ActiveLoginSession['status'];
  domain: string;
  url: string;
  error?: string;
  hasState: boolean;
} | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  return {
    id: session.id,
    status: session.status,
    domain: session.domain,
    url: session.url,
    error: session.error,
    hasState: Boolean(session.storageState),
  };
}

/**
 * Capture authentication state and close the login browser.
 * Optionally saves the session as a persistent Auth Profile.
 */
export async function completeManualLogin(
  sessionId: string,
  profileName?: string
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.context) {
    return { success: false, error: 'Login session not active' };
  }

  try {
    // Extract Playwright storage state (cookies + origins localStorage)
    const state = (await session.context.storageState()) as PlaywrightStorageState;
    session.storageState = state;
    session.status = 'completed';

    // Close browser window cleanly
    await session.browser?.close().catch(() => {});
    session.browser = null;
    session.context = null;

    let profileId: string | undefined;

    // If profileName given, save persistently to SQLite
    if (profileName) {
      profileId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      createAuthProfile({
        id: profileId,
        name: profileName,
        domain: session.domain,
        auth_type: 'manual_session',
        storage_state: JSON.stringify(state),
      });
    }

    return { success: true, profileId };
  } catch (err: any) {
    session.status = 'failed';
    session.error = err.message || 'Failed to capture authentication state';
    return { success: false, error: session.error };
  }
}

/**
 * Cancel an active manual login session.
 */
export async function cancelManualLogin(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.status = 'cancelled';
  try {
    await session.browser?.close().catch(() => {});
  } catch {}
  activeSessions.delete(sessionId);
  return true;
}

/**
 * Retrieve captured storage state from an active or recently completed session.
 */
export function getSessionStorageState(sessionId: string): PlaywrightStorageState | null {
  const session = activeSessions.get(sessionId);
  return session?.storageState || null;
}
