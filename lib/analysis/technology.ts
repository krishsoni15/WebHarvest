/**
 * WebHarvest Technology Fingerprinting Engine
 *
 * Multi-signal stack detection analyzing HTML headers, meta tags, DOM structures,
 * script bundle fingerprints, and stylesheet classes.
 */

export interface DetectedTech {
  name: string;
  category: 'framework' | 'css-framework' | 'cms' | 'hosting' | 'analytics' | 'library';
  confidence: number; // 0.0 - 1.0
  version?: string;
  evidence: string[];
}

export interface TechFingerprint {
  frameworks: DetectedTech[];
  cssFrameworks: DetectedTech[];
  cms: DetectedTech[];
  hosting: DetectedTech[];
  analytics: DetectedTech[];
  libraries: DetectedTech[];
}

export function detectTechnology(
  html: string,
  headers: Record<string, string> = {},
  scriptUrls: string[] = []
): TechFingerprint {
  const detected: DetectedTech[] = [];
  const htmlLower = html.toLowerCase();
  const scriptsJoined = scriptUrls.join(' ').toLowerCase();

  function addDetection(
    name: string,
    category: DetectedTech['category'],
    confidence: number,
    evidence: string
  ) {
    const existing = detected.find((d) => d.name === name);
    if (existing) {
      existing.confidence = Math.min(1.0, existing.confidence + confidence * 0.5);
      if (!existing.evidence.includes(evidence)) {
        existing.evidence.push(evidence);
      }
    } else {
      detected.push({
        name,
        category,
        confidence,
        evidence: [evidence],
      });
    }
  }

  // 1. Frameworks
  if (htmlLower.includes('__next') || scriptsJoined.includes('/_next/')) {
    addDetection('Next.js', 'framework', 0.95, 'Next.js router/bundle markers');
  }
  if (htmlLower.includes('react-dom') || htmlLower.includes('data-reactroot')) {
    addDetection('React', 'framework', 0.9, 'React DOM markers');
  }
  if (htmlLower.includes('data-v-') || htmlLower.includes('vue.esm') || scriptsJoined.includes('vue')) {
    addDetection('Vue.js', 'framework', 0.9, 'Vue template/bundle markers');
  }
  if (htmlLower.includes('__nuxt') || scriptsJoined.includes('/_nuxt/')) {
    addDetection('Nuxt.js', 'framework', 0.95, 'Nuxt.js bootstrap markers');
  }
  if (htmlLower.includes('ng-version') || htmlLower.includes('ng-app')) {
    addDetection('Angular', 'framework', 0.9, 'Angular directives');
  }
  if (htmlLower.includes('svelte') || scriptsJoined.includes('svelte')) {
    addDetection('Svelte', 'framework', 0.85, 'Svelte component bundle');
  }
  if (scriptsJoined.includes('jquery') || htmlLower.includes('jquery.')) {
    addDetection('jQuery', 'framework', 0.8, 'jQuery library script');
  }

  // 2. CSS Frameworks
  if (
    html.includes('class="flex ') ||
    html.includes('class="grid ') ||
    html.includes('class="text-') ||
    html.includes('class="bg-') ||
    html.includes('class="p-') ||
    html.includes('class="m-')
  ) {
    addDetection('Tailwind CSS', 'css-framework', 0.85, 'Tailwind utility class clusters');
  }
  if (html.includes('class="container') && (html.includes('class="row') || html.includes('class="col-'))) {
    addDetection('Bootstrap', 'css-framework', 0.85, 'Bootstrap grid class patterns');
  }

  // 3. CMS & E-Commerce
  if (htmlLower.includes('wp-content') || htmlLower.includes('wp-includes')) {
    addDetection('WordPress', 'cms', 0.95, 'WordPress content directory paths');
  }
  if (htmlLower.includes('cdn.shopify.com') || htmlLower.includes('shopify-buy')) {
    addDetection('Shopify', 'cms', 0.95, 'Shopify CDN asset references');
  }
  if (htmlLower.includes('webflow.com') || htmlLower.includes('data-wf-page')) {
    addDetection('Webflow', 'cms', 0.95, 'Webflow page identifiers');
  }

  // 4. Hosting & CDN Headers
  const server = (headers['server'] || '').toLowerCase();
  const poweredBy = (headers['x-powered-by'] || '').toLowerCase();
  const cfRay = headers['cf-ray'];

  if (cfRay || server.includes('cloudflare')) {
    addDetection('Cloudflare', 'hosting', 0.95, 'Cloudflare proxy headers');
  }
  if (server.includes('vercel') || headers['x-vercel-id']) {
    addDetection('Vercel', 'hosting', 0.95, 'Vercel edge deployment header');
  }
  if (server.includes('netlify') || headers['x-nf-request-id']) {
    addDetection('Netlify', 'hosting', 0.95, 'Netlify server headers');
  }
  if (poweredBy.includes('express')) {
    addDetection('Express.js', 'library', 0.9, 'Express powered-by header');
  }

  return {
    frameworks: detected.filter((d) => d.category === 'framework'),
    cssFrameworks: detected.filter((d) => d.category === 'css-framework'),
    cms: detected.filter((d) => d.category === 'cms'),
    hosting: detected.filter((d) => d.category === 'hosting'),
    analytics: detected.filter((d) => d.category === 'analytics'),
    libraries: detected.filter((d) => d.category === 'library'),
  };
}
