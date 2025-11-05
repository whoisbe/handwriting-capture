import { Plus, Download, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { TracingSession, CHARACTER_SET } from '../types/tracing';

interface HomeScreenProps {
  session: TracingSession | null;
  onNewSession: () => void;
  onResumeSession: () => void;
  onDownload: () => void;
  onClearSession: () => void;
}

export function HomeScreen({ 
  session, 
  onNewSession, 
  onResumeSession,
  onDownload,
  onClearSession 
}: HomeScreenProps) {
  const getProgress = () => {
    if (!session) return { completed: 0, total: CHARACTER_SET.length };
    
    const completed = CHARACTER_SET.filter(
      (char) => session.set[char]?.variants.length > 0
    ).length;
    
    return { completed, total: CHARACTER_SET.length };
  };

  const progress = getProgress();
  const hasProgress = session && progress.completed > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="mb-2">Character Tracer</h1>
          <p className="text-gray-600">
            Create handwriting datasets by tracing characters
          </p>
        </div>

        {hasProgress && (
          <Card className="mb-6 p-6">
            <div className="flex items-center justify-between mb-3">
              <p>Current Session</p>
              <p className="text-sm text-gray-500">{session.font.family}</p>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{progress.completed} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={onResumeSession}
                className="flex-1"
              >
                Resume Session
              </Button>
              
              <Button
                onClick={onDownload}
                variant="outline"
                size="icon"
                disabled={progress.completed === 0}
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={onClearSession}
                variant="outline"
                size="icon"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        <Button 
          onClick={onNewSession}
          size="lg"
          className="w-full gap-2"
        >
          <Plus className="w-5 h-5" />
          {hasProgress ? 'Start New Session' : 'Start Tracing Session'}
        </Button>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Character set: A–Z, a–z, 0–9, and punctuation</p>
          <p className="mt-1">Total: {CHARACTER_SET.length} characters</p>
        </div>
      </div>
    </div>
  );
}
