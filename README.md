# Handwriting Capture

A React-based web application for capturing and analyzing handwritten character traces. This tool allows users to trace characters using different fonts as guides, recording detailed stroke data including position, timing, and pressure information.

## Features

- **Font Selection**: Choose from web fonts (Google Fonts) or upload custom font files
- **Interactive Tracing Canvas**: Draw characters with your mouse or stylus
- **Stroke Recording**: Captures detailed stroke data including:
  - Position coordinates (x, y)
  - Timestamps (t)
  - Pressure values (p)
  - Resampled points for analysis
- **Multiple Variants**: Create and save multiple variations of each character
- **Session Management**: Automatically saves progress to localStorage
- **Export Functionality**: Download complete tracing sessions as JSON
- **Character Metrics**: Automatically extracts font metrics (advance, bounds, baseline)

## Character Set

The application supports tracing of the following character set:
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
a b c d e f g h i j k l m n o p q r s t u v w x y z
0 1 2 3 4 5 6 7 8 9
! ? . , ' " - ( )
```

## Tech Stack

- **Framework**: React 18.3 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS
- **Font Processing**: 
  - `opentype.js` - Font parsing and metrics extraction
  - `fontkit` - Advanced font manipulation
  - `wawoff2` - WOFF2 font format support
- **State Management**: React Hooks
- **Notifications**: Sonner (toast notifications)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/whoisbe/handwriting-capture.git
cd handwriting-capture
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Start a New Session**
   - Click "New Session" on the home screen
   - Select a font (web font URL or upload a local font file)

2. **Tracing Characters**
   - The canvas displays the selected font character as a guide
   - Draw over the character with your mouse or stylus
   - Multiple strokes are supported per character
   - Use the toolbar to:
     - Clear current drawing
     - Save variant
     - Star favorite variants
     - Navigate between characters

3. **Managing Sessions**
   - Sessions are automatically saved to localStorage
   - Continue previous sessions from the home screen
   - Download complete session data as JSON
   - Clear session to start fresh

## Data Format

Tracing sessions are exported in JSON format following this schema:

```json
{
  "schemaVersion": 1,
  "font": {
    "family": "Font Name",
    "source": "URL or local path",
    "emSize": 1000
  },
  "meta": {
    "sessionId": "uuid",
    "createdAt": "ISO timestamp",
    "appBuild": "version"
  },
  "set": {
    "A": {
      "metrics": {
        "advance": 612,
        "bounds": [80, -50, 560, 540],
        "baseline": 0
      },
      "variants": [
        {
          "id": "uuid",
          "starred": true,
          "weight": 1.0,
          "strokes": [...],
          "stats": {
            "durationMs": 840,
            "arcLen": 532
          }
        }
      ]
    }
  }
}
```

See `schema.json` for the complete data schema and `example-trace-output.json` for a full example.

## Project Structure

```
src/
├── components/
│   ├── HomeScreen.tsx       # Landing page
│   ├── FontSelector.tsx     # Font selection interface
│   ├── TracingCanvas.tsx    # Main tracing canvas
│   └── ui/                  # Radix UI components
├── types/
│   └── tracing.ts          # TypeScript interfaces
├── utils/
│   ├── fontMetrics.ts      # Font metric extraction
│   ├── sessionManager.ts   # Session persistence
│   └── strokeProcessor.ts  # Stroke data processing
└── App.tsx                 # Main application component
```

## Development

### Key Components

- **TracingCanvas**: Handles pointer events and stroke recording
- **FontSelector**: Manages font loading from URLs or files
- **SessionManager**: localStorage integration for session persistence
- **StrokeProcessor**: Processes raw stroke data and calculates metrics

### Utilities

- `extractFontMetrics()`: Extracts character metrics from font files
- `createVariantFromStrokes()`: Processes strokes into variant objects
- `calculateMetrics()`: Computes stroke statistics (duration, arc length)

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

See [Attributions.md](src/Attributions.md) for third-party library attributions and credits.
