export interface Point {
  x: number;
  y: number;
  t: number;
  p: number;
}

export interface ResampledPoint {
  x: number;
  y: number;
  dt: number;
  p: number;
  s: number;
}

export interface Stroke {
  points: Point[];
  resampled: ResampledPoint[];
}

export interface Variant {
  id: string;
  starred: boolean;
  weight: number;
  strokes: Stroke[];
  stats: {
    durationMs: number;
    arcLen: number;
  };
}

export interface CharacterData {
  metrics: {
    advance: number;
    bounds: [number, number, number, number];
    baseline: number;
  };
  variants: Variant[];
}

export interface TracingSession {
  schemaVersion: number;
  font: {
    family: string;
    source: string;
    emSize: number;
  };
  meta: {
    sessionId: string;
    createdAt: string;
    appBuild: string;
  };
  set: Record<string, CharacterData>;
  currentIndex?: number;
}

export const CHARACTER_SET = [
  // Uppercase A-Z
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  // Lowercase a-z
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  // Digits 0-9
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Punctuation
  '.', ',', '?', '!', ':', '-', '$', "'", '"'
];

export const FONTS = [
  {
    family: 'Caveat',
    source: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400',
  },
  {
    family: 'Gloria Hallelujah',
    source: 'https://fonts.googleapis.com/css2?family=Gloria+Hallelujah',
  },
];
