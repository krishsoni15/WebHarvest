/**
 * WebHarvest URL Normalization Engine
 *
 * Normalizes URLs to canonical form for deduplication.
 * Handles: protocol, hostname, ports, trailing slashes, fragments,
 * query parameter sorting, tracking param removal, path normalization.
 */

/** Tracking / marketing query parameters to strip during normalization */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'twclid', 'ttclid', 'li_fat_id',
  'mc_cid', 'mc_eid',
  '_ga', '_gl', '_hsenc', '_hsmi', '__hstc', '__hsfp',
  'ref', 'source', 'ref_src', 'ref_url',
  'yclid', 'ymclid',
  'igshid',
  'si', 'feature',        // YouTube
  'spm', 'from_spmid',    // Alibaba
  'trk', 'trkInfo',       // LinkedIn
]);

/**
 * Normalize a URL to its canonical form.
 *
 * @param raw   - The raw URL string (absolute or relative)
 * @param base  - Optional base URL for resolving relative references
 * @returns     - Normalized absolute URL string, or null if invalid
 */
export function normalizeURL(raw: string, base?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }

  // Only allow http/https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  // Lowercase scheme + hostname
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  // Remove default ports
  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  // Remove fragment (hash)
  url.hash = '';

  // Normalize path: collapse /./ and /../, decode unnecessary percent-encoding
  let pathname = url.pathname;
  pathname = pathname.replace(/\/\.(?=\/|$)/g, '/');          // remove /./
  pathname = pathname.replace(/\/[^/]+\/\.\.(?=\/|$)/g, '/'); // resolve /../
  pathname = pathname.replace(/\/+/g, '/');                   // collapse //
  if (!pathname.startsWith('/')) pathname = '/' + pathname;
  url.pathname = decodeURIPercentEncoding(pathname);

  // Remove trailing slash (except root path)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  // Sort query parameters and remove tracking params
  if (url.search) {
    const params = new URLSearchParams(url.search);
    const cleaned: [string, string][] = [];
    for (const [key, value] of params) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        cleaned.push([key, value]);
      }
    }
    cleaned.sort(([a], [b]) => a.localeCompare(b));
    if (cleaned.length > 0) {
      url.search = '?' + cleaned.map(([k, v]) => v ? `${k}=${v}` : k).join('&');
    } else {
      url.search = '';
    }
  }

  return url.toString();
}

/**
 * Generate a canonical key for URL deduplication.
 * Two URLs with the same canonical key represent the same resource.
 */
export function canonicalKey(url: string): string {
  const normalized = normalizeURL(url);
  if (!normalized) return url;
  return normalized;
}

/**
 * Check if two URLs refer to the same resource.
 */
export function isSameResource(a: string, b: string): boolean {
  return canonicalKey(a) === canonicalKey(b);
}

/**
 * Extract the hostname from a URL, normalized to lowercase without www prefix.
 */
export function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a subpath of a base URL (same origin + path starts with base path).
 */
export function isSubpath(url: string, baseUrl: string): boolean {
  try {
    const u = new URL(url);
    const base = new URL(baseUrl);
    return (
      u.origin === base.origin &&
      u.pathname.startsWith(base.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Decode unnecessary percent-encoding in a path.
 * Keeps encoding for characters that need it in URLs.
 */
function decodeURIPercentEncoding(pathname: string): string {
  try {
    // Decode, then re-encode only what's necessary
    const decoded = decodeURIComponent(pathname);
    // Re-encode spaces and special chars but keep safe path chars
    return decoded.replace(/ /g, '%20');
  } catch {
    return pathname;
  }
}
