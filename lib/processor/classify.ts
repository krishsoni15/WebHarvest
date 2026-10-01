/**
 * WebHarvest Resource Classification Engine
 *
 * Categorizes crawled resources based on Content-Type headers, URL paths,
 * file extensions, and known third-party tracking/telemetry signatures.
 */

export type ResourceType =
  | 'page'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'video'
  | 'audio'
  | 'document'
  | 'manifest'
  | 'threed'
  | 'sourcemap'
  | 'data'
  | 'api'
  | 'analytics'
  | 'third-party'
  | 'unknown';

export type ResourceAction = 'download' | 'skip' | 'record-only';

export interface ClassificationResult {
  type: ResourceType;
  action: ResourceAction;
  extension: string;
  reason: string;
}

/** Known tracking & analytics domains */
const ANALYTICS_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'connect.facebook.net',
  'clarity.ms',
  'hotjar.com',
  'sentry.io',
  'browser.sentry-cdn.com',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'datadoghq-browser-agent.com',
  'fullstory.com',
  'amplitude.com',
  'doubleclick.net',
  'facebook.com/tr',
];

/**
 * Derives an extension from a URL path, ignoring query strings.
 */
function getExtensionFromUrl(urlStr: string): string {
  try {
    const pathname = new URL(urlStr).pathname;
    const lastSlash = pathname.lastIndexOf('/');
    const filename = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
    const dot = filename.lastIndexOf('.');
    if (dot > 0 && dot < filename.length - 1) {
      return filename.slice(dot).toLowerCase();
    }
  } catch {
    // Ignore parse errors
  }
  return '';
}

/**
 * Classifies a network resource and decides the crawler's action.
 */
export function classifyResource(
  urlStr: string,
  contentType: string = '',
  headers: Record<string, string> = {}
): ClassificationResult {
  const urlLower = urlStr.toLowerCase();
  const ctypeLower = contentType.toLowerCase().split(';')[0].trim();
  const ext = getExtensionFromUrl(urlStr);

  // 1. Check for Analytics / Telemetry
  for (const domain of ANALYTICS_DOMAINS) {
    if (urlLower.includes(domain)) {
      return {
        type: 'analytics',
        action: 'skip',
        extension: ext || '.js',
        reason: `Matched analytics signature: ${domain}`,
      };
    }
  }

  // 2. HTML Pages
  if (
    ctypeLower.includes('text/html') ||
    ctypeLower.includes('application/xhtml') ||
    ext === '.html' ||
    ext === '.htm'
  ) {
    return {
      type: 'page',
      action: 'download',
      extension: '.html',
      reason: 'HTML Document',
    };
  }

  // 3. Stylesheets
  if (ctypeLower.includes('text/css') || ext === '.css') {
    return {
      type: 'stylesheet',
      action: 'download',
      extension: '.css',
      reason: 'CSS Stylesheet',
    };
  }

  // 4. JavaScript
  if (
    ctypeLower.includes('javascript') ||
    ctypeLower.includes('ecmascript') ||
    ext === '.js' ||
    ext === '.mjs' ||
    ext === '.cjs'
  ) {
    return {
      type: 'script',
      action: 'download',
      extension: ext || '.js',
      reason: 'JavaScript code',
    };
  }

  // 5. Fonts
  if (
    ctypeLower.includes('font') ||
    ['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)
  ) {
    return {
      type: 'font',
      action: 'download',
      extension: ext || '.woff2',
      reason: 'Web Font',
    };
  }

  // 6. Images
  if (
    ctypeLower.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.avif', '.bmp'].includes(ext)
  ) {
    return {
      type: 'image',
      action: 'download',
      extension: ext || (ctypeLower.includes('svg') ? '.svg' : '.png'),
      reason: 'Image resource',
    };
  }

  // 7. 3D Assets (.glb, .gltf, .obj, .fbx, .usdz, .stl, etc.)
  if (
    ctypeLower.includes('model/') ||
    ['.glb', '.gltf', '.obj', '.fbx', '.usdz', '.stl', '.ply'].includes(ext)
  ) {
    return {
      type: 'threed',
      action: 'download',
      extension: ext || '.glb',
      reason: '3D Geometry / Model',
    };
  }

  // 8. Media (Video / Audio with HLS and DASH streams)
  if (
    ctypeLower.startsWith('video/') ||
    ctypeLower.includes('x-mpegurl') ||
    ctypeLower.includes('dash+xml') ||
    ['.mp4', '.webm', '.ogg', '.mov', '.m3u8', '.mpd', '.ts', '.m4s'].includes(ext)
  ) {
    return {
      type: 'video',
      action: 'download',
      extension: ext || '.mp4',
      reason: 'Video resource',
    };
  }

  if (ctypeLower.startsWith('audio/') || ['.mp3', '.wav', '.aac', '.m4a'].includes(ext)) {
    return {
      type: 'audio',
      action: 'download',
      extension: ext || '.mp3',
      reason: 'Audio resource',
    };
  }

  // 9. Source Maps (.map)
  if (ext === '.map' || urlLower.endsWith('.js.map') || urlLower.endsWith('.css.map')) {
    return {
      type: 'sourcemap',
      action: 'download',
      extension: '.map',
      reason: 'Source Map',
    };
  }

  // 8. Documents
  if (['.pdf', '.doc', '.docx', '.csv', '.xlsx', '.zip', '.tar', '.gz'].includes(ext)) {
    return {
      type: 'document',
      action: 'download',
      extension: ext,
      reason: 'Downloadable document/archive',
    };
  }

  // 9. Web App Manifest
  if (
    ctypeLower.includes('manifest') ||
    ext === '.webmanifest' ||
    urlLower.includes('manifest.json')
  ) {
    return {
      type: 'manifest',
      action: 'download',
      extension: ext || '.webmanifest',
      reason: 'App Manifest',
    };
  }

  // 10. API or Dynamic Data
  if (
    ctypeLower.includes('application/json') ||
    ctypeLower.includes('application/xml') ||
    urlLower.includes('/api/') ||
    urlLower.includes('/graphql')
  ) {
    return {
      type: 'api',
      action: 'record-only',
      extension: '.json',
      reason: 'API Endpoint / Dynamic Data',
    };
  }

  // Fallback
  return {
    type: 'unknown',
    action: 'download',
    extension: ext || '.bin',
    reason: 'Unclassified resource',
  };
}
