import * as fontkit from 'fontkit';
import opentype from 'opentype.js';
import { decompress } from 'wawoff2';

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface FontMetrics {
  advance: number;
  bounds: [number, number, number, number];
  baseline: number;
  pathCommands?: PathCommand[]; // SVG path commands for the character shape
}

// Cache for loaded fonts
const fontCache = new Map<string, any>();

/**
 * Fetches the font URL from Google Fonts CSS
 */
async function fetchFontUrl(cssUrl: string): Promise<string | null> {
  try {
    const response = await fetch(cssUrl);
    const cssText = await response.text();
    
    // Extract the font URL from the CSS
    // Looking for url(...) in @font-face - Google Fonts uses https URLs
    const urlMatch = cssText.match(/url\((https:\/\/[^)]+\.(?:woff2|woff|ttf|otf))\)/);
    
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    
    console.warn('Could not find font URL in CSS');
    return null;
  } catch (error) {
    console.error('Error fetching font CSS:', error);
    return null;
  }
}

/**
 * Loads a font using fontkit (supports WOFF2 natively)
 */
async function loadFont(fontUrl: string): Promise<any | null> {
  try {
    // Check cache first
    if (fontCache.has(fontUrl)) {
      return fontCache.get(fontUrl)!;
    }

    // Fetch the font file
    const response = await fetch(fontUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Parse with fontkit (handles WOFF2 automatically)
    // @ts-ignore - fontkit can accept Uint8Array in browser
    const font = fontkit.create(buffer);
    
    if (!font) {
      console.error('Failed to parse font');
      return null;
    }
    fontCache.set(fontUrl, font);
    return font;
  } catch (error) {
    console.error('Error loading font with fontkit:', error);
    return null;
  }
}

/**
 * Extracts font metrics for a specific character
 */
export async function extractFontMetrics(
  character: string,
  fontSource: string
): Promise<FontMetrics | null> {
  try {
    // Fetch the actual font file URL from Google Fonts CSS
    const fontUrl = await fetchFontUrl(fontSource);
    
    if (!fontUrl) {
      console.warn('Could not extract font URL from CSS');
      return null;
    }

    // Load the font
    const font = await loadFont(fontUrl);
    
    if (!font) {
      console.warn('Could not load font');
      return null;
    }



    // Get the glyph for the character
    const glyphId = font.glyphForCodePoint(character.charCodeAt(0));
    console.log('Glyph ID for', character, ':', glyphId);
    const glyph = font.getGlyph(glyphId);
    
    if (!glyph) {
      console.warn(`No glyph found for character: ${character}`);
      return null;
    }
    
    console.log('Glyph id:', glyph.id);
    console.log('Glyph type:', glyph.type);
    console.log('Glyph advanceWidth:', glyph.advanceWidth);
    console.log('Glyph has cbox:', !!glyph.cbox);
    console.log('Glyph has path:', !!glyph.path);
    console.log('Glyph._font:', glyph._font);

    // Get glyph metrics
    const advanceWidth = glyph.advanceWidth || 0;
    
    // Get the bounding box
    let minX = 0, minY = 0, maxX = advanceWidth, maxY = font.ascent;
    
    try {
      // First try the cbox (control box) which is more reliable
      if (glyph.cbox && isFinite(glyph.cbox.minX)) {
        const cbox = glyph.cbox;
        minX = cbox.minX;
        minY = cbox.minY;
        maxX = cbox.maxX;
        maxY = cbox.maxY;
      } else {
        // Try to render the path to compute bbox
        const path = glyph.path;
        path.toFunction(); // Force path computation
        
        const bbox = path.bbox;
        
        if (bbox && isFinite(bbox.minX)) {
          minX = bbox.minX;
          minY = bbox.minY;
          maxX = bbox.maxX;
          maxY = bbox.maxY;
        }
      }
    } catch (e) {
      // Using default bounds based on font metrics
    }
    
    // Get font baseline (descent is negative in font units)
    const descent = font.descent || 0;
    
    // Extract path commands - for now, return empty array and use visual outline only
    // Path extraction from WOFF2 fonts is complex and requires decompression
    // We'll implement this as a future enhancement
    const pathCommands: PathCommand[] = [];
    console.log('Path commands extraction skipped for now');
    
    // Fontkit returns coordinates in font units
    return {
      advance: Math.round(advanceWidth),
      bounds: [
        Math.round(minX),
        Math.round(minY),
        Math.round(maxX),
        Math.round(maxY),
      ] as [number, number, number, number],
      baseline: Math.round(descent),
      pathCommands: pathCommands.length > 0 ? pathCommands : undefined,
    };
  } catch (error) {
    console.error('Error extracting font metrics:', error);
    return null;
  }
}

/**
 * Clears the font cache
 */
export function clearFontCache(): void {
  fontCache.clear();
}
