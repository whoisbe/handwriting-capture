/**
 * Utilities for constraining tracing to character bounds with magnetic pull toward center
 */

interface CharacterMetrics {
  advance: number;
  bounds: [number, number, number, number]; // [minX, minY, maxX, maxY] in font units
  baseline: number;
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
 * Gets the character bounds in canvas coordinates
 */
export function getCharacterBoundsOnCanvas(
  metrics: CharacterMetrics,
  canvas: CanvasDimensions,
  emSize: number = 1000
): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
} {
  const [minX, minY, maxX, maxY] = metrics.bounds;
  
  // Convert font units to pixels
  const pixelMinX = fontUnitsToPixels(minX, canvas.fontSize, emSize);
  const pixelMinY = fontUnitsToPixels(minY, canvas.fontSize, emSize);
  const pixelMaxX = fontUnitsToPixels(maxX, canvas.fontSize, emSize);
  const pixelMaxY = fontUnitsToPixels(maxY, canvas.fontSize, emSize);
  
  // Calculate bounds width and height
  const boundsWidth = pixelMaxX - pixelMinX;
  const boundsHeight = pixelMaxY - pixelMinY;
  
  // Center the character on canvas
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // In font coordinates, Y increases upward, but canvas Y increases downward
  // So we need to flip the Y coordinates
  const left = centerX + pixelMinX;
  const right = centerX + pixelMaxX;
  const top = centerY - pixelMaxY; // Flip Y
  const bottom = centerY - pixelMinY; // Flip Y
  
  const result = {
    left,
    top,
    right,
    bottom,
    centerX,
    centerY,
    width: boundsWidth,
    height: boundsHeight,
  };
  
  return result;
}

/**
 * Constrains a point to stay within character bounds with magnetic pull toward center
 * @param x - Input x coordinate (canvas pixels)
 * @param y - Input y coordinate (canvas pixels)
 * @param bounds - Character bounds on canvas
 * @param magnetStrength - Strength of pull toward center (0-1), default 0.3
 * @param padding - Padding inside bounds in pixels, default 10
 */
export function constrainPointToCharacter(
  x: number,
  y: number,
  bounds: ReturnType<typeof getCharacterBoundsOnCanvas>,
  magnetStrength: number = 0.3,
  padding: number = 10
): { x: number; y: number } {
  // Validate bounds - if invalid, return original point
  if (!isFinite(bounds.left) || !isFinite(bounds.right) || 
      !isFinite(bounds.top) || !isFinite(bounds.bottom) ||
      bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
    console.warn('Invalid bounds detected, skipping constraint:', bounds);
    return { x, y };
  }
  
  // Apply padding to bounds
  const paddedLeft = bounds.left + padding;
  const paddedRight = bounds.right - padding;
  const paddedTop = bounds.top + padding;
  const paddedBottom = bounds.bottom - padding;
  
  // Check if padded bounds are still valid
  if (paddedRight <= paddedLeft || paddedBottom <= paddedTop) {
    console.warn('Padded bounds are invalid, using original bounds');
    return { x, y };
  }
  
  // First, constrain to bounds (hard constraint)
  let constrainedX = Math.max(paddedLeft, Math.min(paddedRight, x));
  let constrainedY = Math.max(paddedTop, Math.min(paddedBottom, y));
  
  // Apply magnetic pull toward center if enabled (soft constraint)
  if (magnetStrength > 0) {
    // Calculate distance from center
    const dx = constrainedX - bounds.centerX;
    const dy = constrainedY - bounds.centerY;
    
    // The further from center, the stronger the pull
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(
      Math.pow(bounds.width / 2, 2) + Math.pow(bounds.height / 2, 2)
    );
    
    // Normalize distance (0 at center, 1 at edges)
    const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
    
    // Apply quadratic falloff for more natural feel
    // Stronger pull as you move away from center
    const pullFactor = magnetStrength * normalizedDistance * normalizedDistance;
    
    // Pull toward center
    constrainedX -= dx * pullFactor;
    constrainedY -= dy * pullFactor;
  }
  
  return { x: constrainedX, y: constrainedY };
}

/**
 * Applies smoothing to a series of constrained points to reduce jitter
 */
export function smoothConstrainedPoints(
  points: Array<{ x: number; y: number }>,
  windowSize: number = 3
): Array<{ x: number; y: number }> {
  if (points.length < windowSize) return points;
  
  const smoothed: Array<{ x: number; y: number }> = [];
  
  for (let i = 0; i < points.length; i++) {
    if (i < windowSize - 1) {
      // Not enough previous points for full window
      smoothed.push(points[i]);
      continue;
    }
    
    // Average over the window
    let sumX = 0;
    let sumY = 0;
    for (let j = 0; j < windowSize; j++) {
      sumX += points[i - j].x;
      sumY += points[i - j].y;
    }
    
    smoothed.push({
      x: sumX / windowSize,
      y: sumY / windowSize,
    });
  }
  
  return smoothed;
}
