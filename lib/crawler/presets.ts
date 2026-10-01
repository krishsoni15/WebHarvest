/**
 * WebHarvest V3 Capture Presets & Rules Engine
 *
 * Provides ready-to-use profiles balancing capture completeness, speed, and safety.
 */

import { CrawlScopeMode } from './scope';
import { EngineMode } from './engine';

export interface CaptureRules {
  html: boolean;
  css: boolean;
  js: boolean;
  images: boolean;
  fonts: boolean;
  video: boolean;
  audio: boolean;
  documents: boolean;
  threed: boolean;
  apiMetadata: boolean;
  screenshots: boolean;
  sourceMaps: boolean;
}

export interface CapturePreset {
  id: 'quick' | 'website' | 'full' | 'max_capture' | 'authenticated' | 'custom';
  name: string;
  tagline: string;
  scopeMode: CrawlScopeMode;
  maxDepth: number;
  maxPages: number;
  engine: EngineMode;
  captureRules: CaptureRules;
  description: string;
}

export const CAPTURE_PRESETS: Record<string, CapturePreset> = {
  quick: {
    id: 'quick',
    name: '⚡ Quick',
    tagline: 'Single page snapshot',
    scopeMode: 'single-page',
    maxDepth: 0,
    maxPages: 1,
    engine: 'fast',
    captureRules: {
      html: true,
      css: true,
      js: true,
      images: true,
      fonts: true,
      video: false,
      audio: false,
      documents: false,
      threed: false,
      apiMetadata: false,
      screenshots: false,
      sourceMaps: false,
    },
    description: 'Instant single-page HTML, CSS, JavaScript, and image mirror via fast HTTP.',
  },

  website: {
    id: 'website',
    name: '🌐 Website',
    tagline: 'Standard tree crawl',
    scopeMode: 'tree',
    maxDepth: 3,
    maxPages: 250,
    engine: 'balanced',
    captureRules: {
      html: true,
      css: true,
      js: true,
      images: true,
      fonts: true,
      video: true,
      audio: false,
      documents: true,
      threed: false,
      apiMetadata: false,
      screenshots: false,
      sourceMaps: false,
    },
    description: 'Follows links up to depth 3 with smart HTTP first and browser fallback.',
  },

  full: {
    id: 'full',
    name: '🏆 Full',
    tagline: 'Deep browser capture',
    scopeMode: 'full',
    maxDepth: 10,
    maxPages: 50000,
    engine: 'browser',
    captureRules: {
      html: true,
      css: true,
      js: true,
      images: true,
      fonts: true,
      video: true,
      audio: true,
      documents: true,
      threed: true,
      apiMetadata: true,
      screenshots: true,
      sourceMaps: true,
    },
    description: 'Comprehensive headless Chromium crawl with media, 3D, network discovery, and screenshots.',
  },

  max_capture: {
    id: 'max_capture',
    name: '🔥 MAX CAPTURE',
    tagline: 'Maximum capture engine',
    scopeMode: 'full',
    maxDepth: 10,
    maxPages: 50000,
    engine: 'auto',
    captureRules: {
      html: true,
      css: true,
      js: true,
      images: true,
      fonts: true,
      video: true,
      audio: true,
      documents: true,
      threed: true,
      apiMetadata: true,
      screenshots: true,
      sourceMaps: true,
    },
    description: 'Maximum capture within explicit boundaries: HTML, styles, scripts, media, 3D, API catalog, and responsive snapshots.',
  },

  authenticated: {
    id: 'authenticated',
    name: '🔒 Authenticated',
    tagline: 'Private & protected pages',
    scopeMode: 'tree',
    maxDepth: 3,
    maxPages: 500,
    engine: 'browser',
    captureRules: {
      html: true,
      css: true,
      js: true,
      images: true,
      fonts: true,
      video: true,
      audio: false,
      documents: true,
      threed: false,
      apiMetadata: true,
      screenshots: true,
      sourceMaps: false,
    },
    description: 'Playwright crawl utilizing saved or interactive login session with strict action safety protection.',
  },
};

export const DEFAULT_CAPTURE_RULES: CaptureRules = {
  html: true,
  css: true,
  js: true,
  images: true,
  fonts: true,
  video: true,
  audio: false,
  documents: true,
  threed: true,
  apiMetadata: true,
  screenshots: true,
  sourceMaps: false,
};

export function shouldCaptureResourceType(type: string, rules?: Partial<CaptureRules>): boolean {
  if (!rules) return true;

  switch (type) {
    case 'page':
      return rules.html ?? true;
    case 'stylesheet':
      return rules.css ?? true;
    case 'script':
      return rules.js ?? true;
    case 'image':
      return rules.images ?? true;
    case 'font':
      return rules.fonts ?? true;
    case 'video':
      return rules.video ?? true;
    case 'audio':
      return rules.audio ?? true;
    case 'document':
      return rules.documents ?? true;
    case 'threed':
      return rules.threed ?? true;
    case 'sourcemap':
      return rules.sourceMaps ?? false;
    case 'api':
      return rules.apiMetadata ?? true;
    case 'manifest':
      return true;
    default:
      return true;
  }
}

