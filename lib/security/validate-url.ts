/**
 * WebHarvest URL Validator
 *
 * Validates URLs before any network request.
 * Blocks dangerous protocols, data URIs, and malformed URLs.
 */

export interface ValidationResult {
  valid: boolean;
  url?: string;      // Cleaned URL if valid
  error?: string;    // Error message if invalid
  reason?: string;   // Alias for error
}

/** Maximum allowed URL length */
const MAX_URL_LENGTH = 2048;

/** Allowed protocols */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Validate a URL for crawling.
 * Returns the cleaned URL if valid, or an error if not.
 */
export function validateURL(raw: string): ValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'URL is required', reason: 'URL is required' };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'URL is empty', reason: 'URL is empty' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    const msg = `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`;
    return { valid: false, error: msg, reason: msg };
  }

  // Block dangerous URI schemes
  const lowerTrimmed = trimmed.toLowerCase();
  if (
    lowerTrimmed.startsWith('javascript:') ||
    lowerTrimmed.startsWith('data:') ||
    lowerTrimmed.startsWith('vbscript:') ||
    lowerTrimmed.startsWith('file:') ||
    lowerTrimmed.startsWith('ftp:')
  ) {
    const msg = `Blocked protocol: ${trimmed.split(':')[0]}`;
    return { valid: false, error: msg, reason: msg };
  }

  // Add protocol if missing
  let urlStr = trimmed;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = 'https://' + urlStr;
  }

  // Parse and validate
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, error: 'Invalid URL format', reason: 'Invalid URL format' };
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    const msg = `Protocol not allowed: ${parsed.protocol}`;
    return { valid: false, error: msg, reason: msg };
  }

  // Check hostname exists
  if (!parsed.hostname || parsed.hostname.length === 0) {
    return { valid: false, error: 'URL has no hostname', reason: 'URL has no hostname' };
  }

  // Check for suspicious port numbers
  if (parsed.port) {
    const port = parseInt(parsed.port, 10);
    if (port <= 0 || port > 65535) {
      const msg = `Invalid port number: ${parsed.port}`;
      return { valid: false, error: msg, reason: msg };
    }
  }

  return { valid: true, url: parsed.href };
}
