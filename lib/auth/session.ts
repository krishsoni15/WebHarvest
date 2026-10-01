/**
 * WebHarvest Authentication Session & Security Manager
 *
 * Handles Playwright storageState extraction, validation, and lifecycle.
 * Enforces the critical security rule:
 * - Passwords, raw credentials, and session tokens are NEVER included in the crawl manifest or public export.
 * - Ephemeral sessions are automatically erased from disk once a job finishes.
 */

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export interface OriginStorageItem {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

export interface PlaywrightStorageState {
  cookies: CookieItem[];
  origins: OriginStorageItem[];
}

/**
 * Validates whether an object matches the Playwright storageState structure.
 */
export function isValidStorageState(obj: any): obj is PlaywrightStorageState {
  if (!obj || typeof obj !== 'object') return false;
  return Array.isArray(obj.cookies) && Array.isArray(obj.origins);
}

/**
 * Parses raw JSON string into a validated PlaywrightStorageState.
 */
export function parseStorageStateJson(jsonStr: string): PlaywrightStorageState | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (isValidStorageState(parsed)) {
      return parsed;
    }
    // If it's a plain array of cookies (e.g. from an extension export)
    if (Array.isArray(parsed) && parsed.every((c) => c && typeof c.name === 'string')) {
      return {
        cookies: parsed as CookieItem[],
        origins: [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Strips sensitive authentication state from public manifests.
 */
export function sanitizeManifestAuth(authInfo?: { profileName?: string; authType?: string }): {
  authenticated: boolean;
  profileName?: string;
  authType?: string;
} {
  if (!authInfo) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    profileName: authInfo.profileName || 'Custom Session',
    authType: authInfo.authType || 'manual_session',
  };
}
