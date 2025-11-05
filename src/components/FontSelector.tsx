import { FONTS } from '../types/tracing';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface FontSelectorProps {
  onSelectFont: (family: string, source: string) => void;
  onCancel: () => void;
}

export function FontSelector({ onSelectFont, onCancel }: FontSelectorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-2">Select a Font</h1>
        <p className="text-gray-600 mb-8">Choose the font you'd like to trace</p>
        
        <div className="space-y-4">
          {FONTS.map((font) => (
            <button
              key={font.family}
              onClick={() => onSelectFont(font.family, font.source)}
              className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
            >
              <link href={font.source} rel="stylesheet" />
              <p 
                className="text-center"
                style={{ fontFamily: font.family }}
              >
                {font.family}
              </p>
              <p 
                className="text-gray-500 mt-2"
                style={{ fontFamily: font.family }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
            </button>
          ))}
        </div>

        <Button 
          variant="outline" 
          onClick={onCancel}
          className="w-full mt-6"
        >
          Cancel
        </Button>
      </Card>
    </div>
  );
}
