# Handwriting Capture & Reveal – Requirements (MVP)

A browser-based tool to **capture natural handwriting motion** for each glyph of a chosen font (default: **Caveat**), and to **preview the reveal** immediately after each capture. Captured motion is stored in a small dataset for later use in a reveal-based handwriting renderer.

---

## 1) Goals

- Let a user **record their stroke motion** (x, y, t, pressure) for each character in a set (A–Z, a–z, 0–9, and a few punctuation marks).
- **Normalize and save** those strokes per glyph in font em-space (e.g., 1000 units).
- **Instant QA**: after each glyph is captured, **preview the reveal** driven by the just-recorded motion over the actual font glyph and let the user **Approve / Redo**.
- Support **resumable sessions**, local persistence, and JSON export/import of datasets.

---

## 2) Scope (MVP)

### Included
- Font picker with a small curated list; **default = Caveat** (Google Fonts).
- Character sequence:
  1) **Uppercase A–Z**, 2) **Lowercase a–z**, 3) **Digits 0–9**, 4) punctuation: `.,?!:-$'"`
- Capture per glyph:
  - Multi-stroke input (pen lifts create new strokes).
  - Collect **(x, y, timestamp, pressure)** on `pointermove`.
  - **Undo last stroke**, **Clear**, **Skip**, **Add Variant**, **Next**.
- **Normalization**:
  - Map canvas points → **em-space** bounds of template glyph.
  - **Resample** to nearly constant arc-length (e.g., 2–3 em units).
  - Keep **original timing** deltas and pressure values.
- **Preview-after-capture**:
  - Render the font glyph; animate a **reveal mask** following the captured strokes.
  - Width model: `width = w0 + α·pressure − β·speed` (clamped).
  - Ink lag: mask passes first; glyph alpha eases in (≈60–120ms).
  - Controls: **Approve**, **Redo**, **Play/Pause**, **Speed ×0.5/1/2**.
- **Persistence**:
  - **Autosave** to IndexedDB after each stroke.
  - **Resume** sessions.
  - **Export/Import** JSON (`.handset.json`).
- **Typesetting** via canvas or `opentype.js`.

### Excluded
- Server/backend
- MP4 export
- Ligatures beyond basic set
- Multiplayer

---

## 3) UX Flow

1. **Home / Sessions**
2. **Capture Screen per glyph** (template + canvas + controls)
3. **Immediate Preview** (approve/redo)
4. **Review & Export**

---

## 4) Data Model (JSON v1)

See exported markdown description in chat (truncated here for brevity).

---

## 5) Technical Requirements

- Pointer events, pressure capture
- Normalize canvas coordinates to em-space
- Resample and smooth
- Reveal with mask + ink lag
- IndexedDB autosave & resume
- Export/import JSON

---

## 6) Acceptance Criteria

- Capture & preview
- Approve/redo flow
- Autosave + resume
- Export/import works
- Raw + resampled + timing + pressure saved

---

## 7) Future Enhancements

- Paper textures, shaders
- WebM export
- Cloud sync
- Ligatures
