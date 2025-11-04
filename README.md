# Handwriting Capture (MVP Scaffold)

This folder contains a minimal, working **custom-canvas capture + immediate preview** app, matching the requirements we discussed.

## Features

- Default font **Caveat** (switchable; loads from Google Fonts)
- Character set sequence (A–Z → a–z → 0–9 → punctuation)
- Capture per glyph (multi-stroke, pressure if available)
- **Immediate preview**: reveal driven by captured motion, with speed & width controls
- **Approve/Redo** flow; **Next** advances to the next glyph
- **Autosave** to IndexedDB after each stroke; **Resume Last** session
- **Export JSON** dataset (`.handset.json`-style)

## Run

Open `index.html` in your browser, or serve locally (recommended):

```bash
npx serve .
```

## Files

- `index.html` — UI layout + Google Fonts loader + canvases for capture & preview
- `styles.css` — minimal, clean styling
- `app.js` — capture logic, persistence, and reveal preview

## Notes

- This is a scaffold: the normalization uses a glyph **canvas box** to map to **em-space**; later you can refine with `opentype.js` glyph metrics.
- The preview uses a simple **destination-in** masking approach for clarity; you can plug in a richer mask/ink shader later.
- Data format aligns with the **MVP schema** (variants per glyph, resampled points with `dt`, `p`, `s`).

## License

MIT
