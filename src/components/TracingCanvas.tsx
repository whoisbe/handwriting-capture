import { useEffect, useRef, useState } from 'react';
import { Check, Undo, X } from 'lucide-react';
import { Button } from './ui/button';
import { Point } from '../types/tracing';
import { 
  createCharacterPath,
  constrainPointToCharacter 
} from '../utils/traceConstraints';

interface TracingCanvasProps {
  character: string;
  fontFamily: string;
  fontSource: string;
  onAccept: (strokes: Point[][]) => void | Promise<void>;
  onExit: () => void;
  progress: string;
  metrics: {
    advance: number;
    bounds: [number, number, number, number];
    baseline: number;
    pathCommands?: Array<{
      type: 'M' | 'L' | 'C' | 'Q' | 'Z';
      x?: number;
      y?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    }>;
  } | null;
  emSize: number;
}

export function TracingCanvas({ 
  character, 
  fontFamily, 
  fontSource, 
  onAccept, 
  onExit,
  progress,
  metrics,
  emSize
}: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [modifierKeysPressed, setModifierKeysPressed] = useState(false);
  const characterPathRef = useRef<Path2D | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Reset strokes when character changes
  useEffect(() => {
    setStrokes([]);
    setCurrentStroke([]);
    setIsDrawing(false);
  }, [character]);

  // Handle keyboard events for modifier keys
  useEffect(() => {
    const updateModifierState = (e: KeyboardEvent) => {
      // Check for Command+Shift (Mac) or Ctrl+Shift (other OS)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierPressed = isMac 
        ? (e.metaKey && e.shiftKey) 
        : (e.ctrlKey && e.shiftKey);
      
      console.log('Key event:', {
        type: e.type,
        key: e.key,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        isMac,
        modifierPressed
      });
      
      setModifierKeysPressed(modifierPressed);
    };

    window.addEventListener('keydown', updateModifierState);
    window.addEventListener('keyup', updateModifierState);

    return () => {
      window.removeEventListener('keydown', updateModifierState);
      window.removeEventListener('keyup', updateModifierState);
    };
  }, []);

  // Load font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = fontSource;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Wait for font to load
    document.fonts.ready.then(() => {
      setFontLoaded(true);
    });

    return () => {
      document.head.removeChild(link);
    };
  }, [fontSource]);

  // Draw canvas
  useEffect(() => {
    if (!fontLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Store context reference
    ctxRef.current = ctx;

    // Calculate font size and create character path if metrics are available
    const fontSize = Math.min(canvas.width, canvas.height) * 0.3;
    console.log('TracingCanvas render:', {
      hasMetrics: !!metrics,
      hasPathCommands: !!(metrics?.pathCommands),
      pathCommandsCount: metrics?.pathCommands?.length || 0
    });
    
    if (metrics && metrics.pathCommands) {
      characterPathRef.current = createCharacterPath(
        metrics,
        canvas.width,
        canvas.height,
        fontSize,
        emSize
      );

      console.log('Created character path:', !!characterPathRef.current);

      // Draw the character outline as a guide
      if (characterPathRef.current) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; // Light blue outline
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke(characterPathRef.current);
        console.log('Drew character outline');
        ctx.restore();
      }
    } else {
      // Fallback: draw character as text if path commands not available
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.fillText(character, canvas.width / 2, canvas.height / 2);
    }

    // Draw all completed strokes
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      drawStroke(ctx, currentStroke);
    }
  }, [character, fontFamily, fontLoaded, strokes, currentStroke, metrics, emSize]);

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Point[]) => {
    if (stroke.length === 0) return;

    ctx.save(); // Save context state before drawing
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]); // Ensure no dash pattern
    ctx.beginPath();

    stroke.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();
    ctx.restore(); // Restore context state after drawing
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if drawing should start: either primary button is pressed OR modifier keys are held
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifiersHeld = isMac 
      ? (e.metaKey && e.shiftKey) 
      : (e.ctrlKey && e.shiftKey);
    
    console.log('Pointer down:', {
      button: e.button,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      modifiersHeld,
      modifierKeysPressed,
      isMac
    });
    
    const shouldDraw = e.button === 0 || modifiersHeld || modifierKeysPressed;
    if (!shouldDraw) return;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Apply constraint if character path is available
    if (characterPathRef.current && ctxRef.current && metrics) {
      const constrained = constrainPointToCharacter(
        x, y,
        characterPathRef.current,
        ctxRef.current,
        metrics,
        canvas.width,
        canvas.height,
        Math.min(canvas.width, canvas.height) * 0.3,
        emSize
      );
      x = constrained.x;
      y = constrained.y;
    }
    
    const pressure = e.pressure || 0.5;
    const time = Date.now();

    setIsDrawing(true);
    setStartTime(time);
    setCurrentStroke([{ x, y, t: 0, p: pressure }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if modifiers are held for trackpad mode
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifiersHeld = isMac 
      ? (e.metaKey && e.shiftKey) 
      : (e.ctrlKey && e.shiftKey);

    // If not currently drawing but modifiers are held, start drawing
    if (!isDrawing && modifiersHeld) {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // Apply constraint if character path is available
      if (characterPathRef.current && ctxRef.current && metrics) {
        const constrained = constrainPointToCharacter(
          x, y,
          characterPathRef.current,
          ctxRef.current,
          metrics,
          canvas.width,
          canvas.height,
          Math.min(canvas.width, canvas.height) * 0.3,
          emSize
        );
        x = constrained.x;
        y = constrained.y;
      }
      
      const pressure = e.pressure || 0.5;
      const time = Date.now();

      console.log('Starting draw from pointer move with modifiers');
      
      setIsDrawing(true);
      setStartTime(time);
      setCurrentStroke([{ x, y, t: 0, p: pressure }]);
      return;
    }

    // If currently drawing but modifiers are released, stop drawing
    if (isDrawing && !modifiersHeld && e.buttons === 0) {
      console.log('Stopping draw - modifiers released');
      setIsDrawing(false);
      if (currentStroke.length > 0) {
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke([]);
      }
      return;
    }

    // Continue drawing if already drawing
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Apply constraint if character path is available
    if (characterPathRef.current && ctxRef.current && metrics) {
      const constrained = constrainPointToCharacter(
        x, y,
        characterPathRef.current,
        ctxRef.current,
        metrics,
        canvas.width,
        canvas.height,
        Math.min(canvas.width, canvas.height) * 0.3,
        emSize
      );
      x = constrained.x;
      y = constrained.y;
    }
    
    const pressure = e.pressure || 0.5;
    const time = Date.now() - startTime;

    setCurrentStroke((prev) => [...prev, { x, y, t: time, p: pressure }]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      // Remove the last stroke
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

  const handleAccept = () => {
    if (strokes.length > 0) {
      onAccept(strokes);
    }
  };

  return (
    <div className="fixed inset-0 bg-white">
      {/* Progress indicator */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <p className="text-sm text-gray-600">{progress}</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <p className="text-sm text-gray-600">{fontFamily}</p>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full touch-none"
        style={{ touchAction: 'none' }}
      />

      {/* Action buttons */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
        <Button
          onClick={onExit}
          size="lg"
          variant="outline"
          className="w-14 h-14 rounded-full bg-white shadow-lg"
        >
          <X className="w-6 h-6" />
        </Button>
        
        <Button
          onClick={handleUndo}
          size="lg"
          variant="outline"
          className="w-14 h-14 rounded-full bg-white shadow-lg"
          disabled={strokes.length === 0}
        >
          <Undo className="w-6 h-6" />
        </Button>
        
        <Button
          onClick={handleAccept}
          size="lg"
          className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
          disabled={strokes.length === 0}
        >
          <Check className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
