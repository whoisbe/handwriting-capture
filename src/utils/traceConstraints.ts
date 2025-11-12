/**
 * Utilities for constraining tracing to actual character shape
 */

interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

interface CharacterMetrics {
  advance: number;
  bounds: [number, number, number, number]; // [minX, minY, maxX, maxY] in font units
  baseline: number;
  pathCommands?: PathCommand[];
}

interface CanvasDimensions {
  width: number;
  height: number;
  fontSize: number;
}

/**
 * Converts font units to canvas pixels
 */
function fontUnitsToPixels(
  fontValue: number,
  fontSize: number,
  emSize: number = 1000
): number {
  return (fontValue * fontSize) / emSize;
}

/**
 * Creates a Canvas Path2D from font path commands, positioned at canvas center
 */
export function createCharacterPath(
  metrics: CharacterMetrics,
  canvasWidth: number,
  canvasHeight: number,
  fontSize: number,
  unitsPerEm: number = 1000
): Path2D | null {
  if (!metrics.pathCommands || metrics.pathCommands.length === 0) {
    return null;
  }

  const path = new Path2D();
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Calculate character dimensions in pixels
  const [minX, minY, maxX, maxY] = metrics.bounds;
  const boundsWidth = fontUnitsToPixels(maxX - minX, fontSize, unitsPerEm);
  const boundsHeight = fontUnitsToPixels(maxY - minY, fontSize, unitsPerEm);

  // Convert font coordinates to canvas coordinates (centered)
  const toCanvasX = (fontX: number) => {
    const pixelX = fontUnitsToPixels(fontX, fontSize, unitsPerEm);
    const relativeX = pixelX - fontUnitsToPixels(minX, fontSize, unitsPerEm);
    return centerX - boundsWidth / 2 + relativeX;
  };

  const toCanvasY = (fontY: number) => {
    const pixelY = fontUnitsToPixels(fontY, fontSize, unitsPerEm);
    const relativeY = pixelY - fontUnitsToPixels(minY, fontSize, unitsPerEm);
    // Flip Y axis (font coordinates have Y increasing upward)
    return centerY + boundsHeight / 2 - relativeY;
  };

  // Build the path from commands
  for (const cmd of metrics.pathCommands) {
    switch (cmd.type) {
      case 'M':
        if (cmd.x !== undefined && cmd.y !== undefined) {
          path.moveTo(toCanvasX(cmd.x), toCanvasY(cmd.y));
        }
        break;
      case 'L':
        if (cmd.x !== undefined && cmd.y !== undefined) {
          path.lineTo(toCanvasX(cmd.x), toCanvasY(cmd.y));
        }
        break;
      case 'Q':
        if (cmd.x1 !== undefined && cmd.y1 !== undefined && 
            cmd.x !== undefined && cmd.y !== undefined) {
          path.quadraticCurveTo(
            toCanvasX(cmd.x1), toCanvasY(cmd.y1),
            toCanvasX(cmd.x), toCanvasY(cmd.y)
          );
        }
        break;
      case 'C':
        if (cmd.x1 !== undefined && cmd.y1 !== undefined && 
            cmd.x2 !== undefined && cmd.y2 !== undefined &&
            cmd.x !== undefined && cmd.y !== undefined) {
          path.bezierCurveTo(
            toCanvasX(cmd.x1), toCanvasY(cmd.y1),
            toCanvasX(cmd.x2), toCanvasY(cmd.y2),
            toCanvasX(cmd.x), toCanvasY(cmd.y)
          );
        }
        break;
      case 'Z':
        path.closePath();
        break;
    }
  }

  return path;
}

/**
 * Tests if a point is inside the character path
 * Returns true if inside, false otherwise
 */
export function isPointInCharacter(
  x: number,
  y: number,
  characterPath: Path2D,
  ctx: CanvasRenderingContext2D
): boolean {
  return ctx.isPointInPath(characterPath, x, y);
}

/**
 * Finds the nearest point on the character path boundary
 * This is a simplified approach - for better accuracy, you'd need more sophisticated algorithms
 */
export function constrainPointToCharacter(
  x: number,
  y: number,
  characterPath: Path2D,
  ctx: CanvasRenderingContext2D,
  metrics: CharacterMetrics,
  canvasWidth: number,
  canvasHeight: number,
  fontSize: number,
  unitsPerEm: number = 1000
): { x: number; y: number } {
  // If point is inside the character, allow it
  if (ctx.isPointInPath(characterPath, x, y)) {
    return { x, y };
  }

  // Point is outside - find nearest point on the boundary
  // This is a simplified approach: project toward character center
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Calculate bounds for fallback
  const [minX, minY, maxX, maxY] = metrics.bounds;
  const boundsWidth = fontUnitsToPixels(maxX - minX, fontSize, unitsPerEm);
  const boundsHeight = fontUnitsToPixels(maxY - minY, fontSize, unitsPerEm);
  
  const left = centerX - boundsWidth / 2;
  const right = centerX + boundsWidth / 2;
  const top = centerY - boundsHeight / 2;
  const bottom = centerY + boundsHeight / 2;

  // Simple approach: binary search along the line from point to center
  let testX = x;
  let testY = y;
  let steps = 20; // Number of interpolation steps
  
  for (let i = 0; i < steps; i++) {
    testX = x + (centerX - x) * (i / steps);
    testY = y + (centerY - y) * (i / steps);
    
    if (ctx.isPointInPath(characterPath, testX, testY)) {
      return { x: testX, y: testY };
    }
  }

  // Fallback: constrain to bounding box
  return {
    x: Math.max(left, Math.min(right, x)),
    y: Math.max(top, Math.min(bottom, y))
  };
}

/**
 * Gets the character bounds rectangle (for debugging/visualization)
 */
export function getCharacterBoundsOnCanvas(
  metrics: CharacterMetrics,
  canvasWidth: number,
  canvasHeight: number,
  fontSize: number,
  unitsPerEm: number = 1000
): { left: number; top: number; right: number; bottom: number } {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const [minX, minY, maxX, maxY] = metrics.bounds;
  const boundsWidth = fontUnitsToPixels(maxX - minX, fontSize, unitsPerEm);
  const boundsHeight = fontUnitsToPixels(maxY - minY, fontSize, unitsPerEm);

  return {
    left: centerX - boundsWidth / 2,
    top: centerY - boundsHeight / 2,
    right: centerX + boundsWidth / 2,
    bottom: centerY + boundsHeight / 2,
  };
}
