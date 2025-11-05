# Trace Constraints Feature

## Overview
The tracing canvas now includes an intelligent constraint system that helps users trace characters more accurately by:
1. **Constraining strokes within character bounds** - Prevents drawing outside the character area
2. **Magnetic pull toward center** - Subtly guides strokes toward the center of the character
3. **Visual feedback** - Shows a light blue dashed rectangle indicating the character bounds

## How It Works

### Font Metrics Extraction
- When a character is displayed, the app extracts its metrics from the font file
- Metrics include: advance width, bounding box (minX, minY, maxX, maxY), and baseline
- These metrics are calculated in font units and converted to canvas pixels

### Constraint Algorithm
The `constrainPointToCharacter()` function applies two types of constraints:

1. **Hard Constraint (Bounds)**: 
   - Clamps points within the character's bounding box with padding (10px)
   - Ensures no strokes extend outside the character area

2. **Soft Constraint (Magnetic Pull)**:
   - Applies a quadratic pull toward the character center
   - Strength: 30% by default (configurable)
   - Pull increases with distance from center
   - Creates more natural-feeling guidance

### Visual Feedback
- A light blue dashed rectangle shows the constrained area
- Rectangle updates automatically for each character
- Helps users understand where they should draw

## Configuration

You can adjust the constraint behavior in `/src/utils/traceConstraints.ts`:

```typescript
export function constrainPointToCharacter(
  x: number,
  y: number,
  bounds: ReturnType<typeof getCharacterBoundsOnCanvas>,
  magnetStrength: number = 0.3,  // Adjust magnetic pull (0-1)
  padding: number = 10            // Adjust bounds padding (pixels)
)
```

### Parameters:
- **magnetStrength** (0-1): How strongly points are pulled toward center
  - 0 = no pull, just hard bounds
  - 0.3 = default, subtle guidance
  - 1.0 = strong pull, may feel restrictive
  
- **padding**: Inner padding from bounds (pixels)
  - Prevents drawing right at the edge
  - Default: 10px

## Implementation Details

### Files Modified:
1. **`/src/utils/traceConstraints.ts`** (new)
   - Core constraint logic
   - Font unit to pixel conversion
   - Bounds calculation
   - Magnetic pull algorithm

2. **`/src/App.tsx`**
   - Added metrics fetching for current character
   - Passes metrics and emSize to TracingCanvas

3. **`/src/components/TracingCanvas.tsx`**
   - Accepts metrics as props
   - Calculates and stores bounds
   - Applies constraints to all pointer events
   - Draws bounds rectangle for visual feedback

### Key Functions:
- `getCharacterBoundsOnCanvas()`: Converts font metrics to canvas coordinates
- `constrainPointToCharacter()`: Applies constraints to a single point
- `smoothConstrainedPoints()`: Optional smoothing function (not currently used)

## User Experience

Users will experience:
- ✅ Easier tracing within character boundaries
- ✅ More consistent character proportions
- ✅ Visual guidance via bounds rectangle
- ✅ Natural-feeling magnetic guidance
- ✅ Prevention of accidental strokes outside character

The system is transparent to users - it enhances their input without being obtrusive.

## Future Enhancements

Potential improvements:
- [ ] Make magnet strength configurable via UI
- [ ] Add haptic feedback when hitting bounds (for devices that support it)
- [ ] Implement stroke smoothing to reduce jitter
- [ ] Add option to toggle constraints on/off
- [ ] Show center point guide
- [ ] Different constraint modes (loose, medium, strict)
