import { useEffect, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { FontSelector } from './components/FontSelector';
import { TracingCanvas } from './components/TracingCanvas';
import { TracingSession, CHARACTER_SET, Point } from './types/tracing';
import { 
  createSession, 
  saveSession, 
  loadSession, 
  clearSession,
  downloadSession 
} from './utils/sessionManager';
import { 
  createVariantFromStrokes, 
  calculateMetrics 
} from './utils/strokeProcessor';
import { extractFontMetrics, FontMetrics } from './utils/fontMetrics';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

type Screen = 'home' | 'fontSelector' | 'tracing';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<TracingSession | null>(null);
  const [currentCharMetrics, setCurrentCharMetrics] = useState<FontMetrics | null>(null);

  useEffect(() => {
    const loadedSession = loadSession();
    if (loadedSession) {
      setSession(loadedSession);
    }
  }, []);

  const handleNewSession = () => {
    if (session && session.set && Object.values(session.set).some(char => char.variants.length > 0)) {
      if (confirm('Starting a new session will clear your current progress. Continue?')) {
        clearSession();
        setSession(null);
        setScreen('fontSelector');
      }
    } else {
      setScreen('fontSelector');
    }
  };

  const handleSelectFont = (family: string, source: string) => {
    const newSession = createSession(family, source);
    setSession(newSession);
    saveSession(newSession);
    setScreen('tracing');
    toast.success(`Session started with ${family}`);
  };

  const handleCancelFontSelection = () => {
    setScreen('home');
  };

  const handleResumeSession = () => {
    if (session) {
      setScreen('tracing');
    }
  };

  // Fetch metrics for current character when entering tracing screen or character changes
  useEffect(() => {
    if (screen === 'tracing' && session) {
      const currentChar = CHARACTER_SET[session.currentIndex || 0];
      
      // Check if we have valid cached metrics
      const cachedMetrics = session.set[currentChar]?.metrics;
      const hasValidMetrics = cachedMetrics && 
        cachedMetrics.bounds && 
        cachedMetrics.bounds.length === 4 &&
        // Check if bounds are not all zeros (invalid placeholder)
        (cachedMetrics.bounds[0] !== 0 || cachedMetrics.bounds[1] !== 0 || 
         cachedMetrics.bounds[2] !== 0 || cachedMetrics.bounds[3] !== 0);
      
      if (hasValidMetrics) {
        console.log('Using cached metrics for', currentChar, cachedMetrics);
        setCurrentCharMetrics(cachedMetrics);
      } else {
        // Fetch metrics from font (either no cache or invalid cache)
        console.log('Fetching metrics for', currentChar);
        extractFontMetrics(currentChar, session.font.source).then((metrics) => {
          if (metrics) {
            console.log('Extracted metrics for', currentChar, {
              bounds: metrics.bounds,
              pathCommandsCount: metrics.pathCommands?.length || 0
            });
            setCurrentCharMetrics(metrics);
          } else {
            console.warn('Failed to extract metrics for', currentChar);
            setCurrentCharMetrics(null);
          }
        });
      }
    }
  }, [screen, session?.currentIndex, session]);

  const handleAcceptTrace = async (strokes: Point[][]) => {
    if (!session) return;

    const currentChar = CHARACTER_SET[session.currentIndex || 0];
    const variant = createVariantFromStrokes(strokes);
    
    // Try to extract real font metrics, fallback to calculated metrics
    let metrics = await extractFontMetrics(currentChar, session.font.source);
    
    if (!metrics) {
      // Fallback to calculated metrics if font metrics extraction fails
      metrics = calculateMetrics(variant.strokes);
    }

    const updatedSession: TracingSession = {
      ...session,
      set: {
        ...session.set,
        [currentChar]: {
          metrics,
          variants: [...session.set[currentChar].variants, variant],
        },
      },
    };

    // Move to next character
    const nextIndex = (session.currentIndex || 0) + 1;
    
    if (nextIndex >= CHARACTER_SET.length) {
      // Completed all characters
      updatedSession.currentIndex = 0;
      setSession(updatedSession);
      saveSession(updatedSession);
      setScreen('home');
      toast.success('🎉 Session complete! All characters traced.');
    } else {
      updatedSession.currentIndex = nextIndex;
      setSession(updatedSession);
      saveSession(updatedSession);
      toast.success(`Character "${currentChar}" saved!`);
    }
  };

  const handleExitTracing = () => {
    if (session) {
      saveSession(session);
      toast.info('Session saved');
    }
    setScreen('home');
  };

  const handleDownload = () => {
    if (session) {
      downloadSession(session);
      toast.success('Dataset downloaded');
    }
  };

  const handleClearSession = () => {
    if (confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      clearSession();
      setSession(null);
      toast.success('Session cleared');
    }
  };

  const getCurrentCharacter = () => {
    if (!session) return 'A';
    return CHARACTER_SET[session.currentIndex || 0];
  };

  const getProgress = () => {
    if (!session) return '0 / 72';
    const current = (session.currentIndex || 0) + 1;
    return `${current} / ${CHARACTER_SET.length}`;
  };

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          session={session}
          onNewSession={handleNewSession}
          onResumeSession={handleResumeSession}
          onDownload={handleDownload}
          onClearSession={handleClearSession}
        />
      )}

      {screen === 'fontSelector' && (
        <FontSelector
          onSelectFont={handleSelectFont}
          onCancel={handleCancelFontSelection}
        />
      )}

      {screen === 'tracing' && session && (
        <TracingCanvas
          character={getCurrentCharacter()}
          fontFamily={session.font.family}
          fontSource={session.font.source}
          onAccept={handleAcceptTrace}
          onExit={handleExitTracing}
          progress={getProgress()}
          metrics={currentCharMetrics}
          emSize={session.font.emSize}
        />
      )}

      <Toaster />
    </>
  );
}
