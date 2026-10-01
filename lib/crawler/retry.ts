/**
 * WebHarvest Retry Engine with Exponential Backoff
 *
 * Intelligent retry decisions based on HTTP status codes.
 * Implements exponential backoff with jitter to prevent thundering herd.
 */

/** Result of a fetch attempt */
export interface FetchResult {
  url: string;
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Buffer | null;
  contentType: string;
  size: number;
  redirected: boolean;
  finalURL: string;
  duration: number;
  attempts: number;
  error?: string;
}

/** Retry policy configuration */
export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
  retryableStatuses: Set<number>;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

/** Default retry policy */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterMs: 500,
  retryableStatuses: new Set([429, 500, 502, 503, 504]),
  timeoutMs: 12000,
};

/** Retry decision for a given response/error */
export interface RetryDecision {
  shouldRetry: boolean;
  reason: string;
  delayMs: number;
}

/**
 * Determine whether a failed request should be retried.
 */
export function shouldRetry(
  status: number | null,
  error: string | null,
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): RetryDecision {
  if (attempt >= policy.maxRetries) {
    return { shouldRetry: false, reason: 'Max retries exceeded', delayMs: 0 };
  }

  // Network/timeout errors — generally retryable
  if (status === null && error) {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('abort') || lowerError.includes('timeout')) {
      return {
        shouldRetry: attempt < 2, // Max 2 retries for timeouts
        reason: 'Request timeout',
        delayMs: calculateBackoff(attempt, policy),
      };
    }
    if (lowerError.includes('dns') || lowerError.includes('enotfound')) {
      return {
        shouldRetry: attempt < 1, // Only 1 retry for DNS
        reason: 'DNS resolution failed',
        delayMs: calculateBackoff(attempt, policy),
      };
    }
    if (lowerError.includes('econnreset') || lowerError.includes('econnrefused') || lowerError.includes('socket hang up')) {
      return {
        shouldRetry: true,
        reason: 'Connection error',
        delayMs: calculateBackoff(attempt, policy),
      };
    }

    return {
      shouldRetry: true,
      reason: `Network error: ${error}`,
      delayMs: calculateBackoff(attempt, policy),
    };
  }

  if (status === null) {
    return { shouldRetry: false, reason: 'No status', delayMs: 0 };
  }

  // Success — don't retry
  if (status >= 200 && status < 300) {
    return { shouldRetry: false, reason: 'Success', delayMs: 0 };
  }

  // Client errors — generally not retryable
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 405 || status === 410) {
    return { shouldRetry: false, reason: `HTTP ${status} — not retryable`, delayMs: 0 };
  }

  // Rate limited — backoff aggressively
  if (status === 429) {
    return {
      shouldRetry: true,
      reason: 'Rate limited (429)',
      delayMs: calculateBackoff(attempt, policy) * 2, // Double delay for rate limits
    };
  }

  // Server errors — retry with backoff
  if (policy.retryableStatuses.has(status)) {
    return {
      shouldRetry: true,
      reason: `Server error (${status})`,
      delayMs: calculateBackoff(attempt, policy),
    };
  }

  // Unknown status — don't retry
  return { shouldRetry: false, reason: `HTTP ${status} — unknown`, delayMs: 0 };
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateBackoff(attempt: number, policy: RetryPolicy): number {
  const exponentialDelay = policy.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * policy.jitterMs;
  return Math.min(exponentialDelay + jitter, policy.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a fetch with retry logic.
 * Returns the result of the first successful attempt or the last failed attempt.
 */
export async function fetchWithRetry(
  url: string,
  options: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    redirect?: RequestRedirect;
  } = {},
  policyInput?: Partial<RetryPolicy>,
): Promise<FetchResult> {
  const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...(policyInput || {}) };
  let lastError: string | null = null;
  let attempts = 0;

  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  while (attempts <= policy.maxRetries) {
    attempts++;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), policy.timeoutMs);

      // Compose abort: external signal OR our timeout
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
        signal: controller.signal,
        redirect: options.redirect ?? 'follow',
      });
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // Read response body
      let body: Buffer | null = null;
      try {
        body = Buffer.from(await response.arrayBuffer());
      } catch {
        body = null;
      }

      const result: FetchResult = {
        url,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        contentType: response.headers.get('content-type') ?? '',
        size: body?.length ?? 0,
        redirected: response.redirected,
        finalURL: response.url,
        duration,
        attempts,
      };

      // Successful response or manual redirect — return immediately
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return result;
      }

      // Check if we should retry this status
      const decision = shouldRetry(response.status, null, attempts - 1, policy);
      if (!decision.shouldRetry) {
        result.error = decision.reason;
        return result;
      }

      lastError = `HTTP ${response.status}`;
      if (decision.delayMs > 0) {
        await sleep(decision.delayMs);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      lastError = err.message || 'Unknown fetch error';

      const decision = shouldRetry(null, lastError, attempts - 1, policy);
      if (!decision.shouldRetry) {
        return {
          url,
          ok: false,
          status: 0,
          statusText: '',
          headers: {},
          body: null,
          contentType: '',
          size: 0,
          redirected: false,
          finalURL: url,
          duration,
          attempts,
          error: lastError || undefined,
        };
      }

      if (decision.delayMs > 0) {
        await sleep(decision.delayMs);
      }
    }
  }

  // All retries exhausted
  return {
    url,
    ok: false,
    status: 0,
    statusText: '',
    headers: {},
    body: null,
    contentType: '',
    size: 0,
    redirected: false,
    finalURL: url,
    duration: 0,
    attempts,
    error: lastError || 'Max retries exhausted',
  };
}
