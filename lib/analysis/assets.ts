/**
 * WebHarvest Asset Intelligence & Design Token Extraction
 *
 * Extracts color palettes, typography font families, and media statistics
 * from crawled stylesheets and documents.
 */

export interface ColorPaletteItem {
  color: string;
  count: number;
}

export interface FontUsageItem {
  family: string;
  count: number;
}

export interface AssetIntelligence {
  colors: ColorPaletteItem[];
  fonts: FontUsageItem[];
  cssVariables: Record<string, string>;
  mediaSummary: {
    imagesCount: number;
    svgCount: number;
    fontsCount: number;
    stylesheetsCount: number;
    scriptsCount: number;
  };
}

export function extractDesignTokens(cssContents: string[]): AssetIntelligence {
  const colorCounts = new Map<string, number>();
  const fontCounts = new Map<string, number>();
  const cssVariables: Record<string, string> = {};

  // Regexes
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/gi;
  const fontRegex = /font-family\s*:\s*([^;]+)/gi;
  const varRegex = /(--[\w-]+)\s*:\s*([^;]+)/g;

  for (const css of cssContents) {
    // 1. Hex colors
    const hexMatches = css.match(hexRegex) || [];
    for (const c of hexMatches) {
      const lower = c.toLowerCase();
      colorCounts.set(lower, (colorCounts.get(lower) || 0) + 1);
    }

    // 2. RGB/RGBA colors
    const rgbMatches = css.match(rgbRegex) || [];
    for (const c of rgbMatches) {
      const lower = c.toLowerCase().replace(/\s+/g, '');
      colorCounts.set(lower, (colorCounts.get(lower) || 0) + 1);
    }

    // 3. Fonts
    let fontMatch: RegExpExecArray | null;
    while ((fontMatch = fontRegex.exec(css)) !== null) {
      const familyRaw = fontMatch[1].split(',')[0].replace(/['"]/g, '').trim();
      if (familyRaw && !['inherit', 'initial', 'unset'].includes(familyRaw.toLowerCase())) {
        fontCounts.set(familyRaw, (fontCounts.get(familyRaw) || 0) + 1);
      }
    }

    // 4. CSS Variables
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRegex.exec(css)) !== null) {
      const name = varMatch[1].trim();
      const val = varMatch[2].trim();
      if (name && val && !cssVariables[name]) {
        cssVariables[name] = val;
      }
    }
  }

  // Sort colors by frequency and pick top 25
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([color, count]) => ({ color, count }));

  // Sort fonts by frequency
  const sortedFonts = Array.from(fontCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([family, count]) => ({ family, count }));

  return {
    colors: sortedColors,
    fonts: sortedFonts,
    cssVariables,
    mediaSummary: {
      imagesCount: 0,
      svgCount: 0,
      fontsCount: sortedFonts.length,
      stylesheetsCount: cssContents.length,
      scriptsCount: 0,
    },
  };
}
