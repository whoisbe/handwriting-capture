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
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

type Screen = 'home' | 'fontSelector' | 'tracing';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<TracingSession | null>(null);

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

  const handleAcceptTrace = (strokes: Point[][]) => {
    if (!session) return;

    const currentChar = CHARACTER_SET[session.currentIndex || 0];
    const variant = createVariantFromStrokes(strokes);
    const metrics = calculateMetrics(variant.strokes);

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
        />
      )}

      <Toaster />
    </>
  );
}
