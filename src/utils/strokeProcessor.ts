import { Point, ResampledPoint, Stroke, Variant } from '../types/tracing';
import { generateUUID } from './sessionManager';

export function calculateArcLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.round(length * 100) / 100;
}

export function calculateBounds(strokes: Stroke[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  strokes.forEach((stroke) => {
    stroke.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  return [
    Math.round(minX),
    Math.round(minY),
    Math.round(maxX),
    Math.round(maxY),
  ];
}

export function resamplePoints(points: Point[]): ResampledPoint[] {
  if (points.length === 0) return [];
  
  const resampled: ResampledPoint[] = [];
  let cumulativeLength = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const prevPoint = i > 0 ? points[i - 1] : point;
    
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    cumulativeLength += segmentLength;

    resampled.push({
      x: Math.round(point.x * 10) / 10,
      y: Math.round(point.y * 10) / 10,
      dt: point.t - (i > 0 ? points[i - 1].t : 0),
      p: Math.round(point.p * 100) / 100,
      s: Math.round(cumulativeLength * 10) / 10,
    });
  }

  return resampled;
}

export function createVariantFromStrokes(rawStrokes: Point[][]): Variant {
  const strokes: Stroke[] = rawStrokes.map((points) => ({
    points,
    resampled: resamplePoints(points),
  }));

  const allPoints = rawStrokes.flat();
  const duration = allPoints.length > 0 
    ? allPoints[allPoints.length - 1].t - allPoints[0].t 
    : 0;
  const arcLen = strokes.reduce((sum, stroke) => sum + calculateArcLength(stroke.points), 0);

  return {
    id: generateUUID(),
    starred: false,
    weight: 1.0,
    strokes,
    stats: {
      durationMs: duration,
      arcLen: Math.round(arcLen * 100) / 100,
    },
  };
}

export function calculateMetrics(strokes: Stroke[]) {
  const bounds = calculateBounds(strokes);
  const width = bounds[2] - bounds[0];
  
  return {
    advance: Math.round(width * 1.2), // Add some spacing
    bounds,
    baseline: 0,
  };
}
