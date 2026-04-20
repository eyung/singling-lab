# Quickstart: OSC-1 Visual Overhaul

**Branch**: `006-osc1-visual-overhaul`  
**Date**: 2026-04-20

## Dev environment

```bash
git checkout 006-osc1-visual-overhaul
npm install
npm run dev    # http://localhost:5173
```

## Recommended implementation order

Work in this order to always have a runnable app between commits.

### Step 1 — Foundation: tokens + font
Files: `index.html`, `src/index.css`

1. Add IBM Plex Mono Google Fonts `<link>` tags to `index.html` (before `</head>`)
2. Append CSS custom property chassis token block to `src/index.css` (after the `@variant dark` line)

After this step: the font loads and tokens are available; visual appearance unchanged.

### Step 2 — Atomic components: LedBar, Rocker, Toggle
Files: `src/components/LedBar.tsx`, `src/components/Rocker.tsx`, `src/components/Toggle.tsx`

Create each component file. These have no internal state and depend only on props + CSS tokens. Verify by importing them temporarily into `Controls.tsx` and replacing one instance each.

### Step 3 — Controls.tsx: tabbed right panel
File: `src/components/Controls.tsx`

- Add `useState<'global'|'levels'|'layered'|'semantic'>('global')` tab state
- Render tab bar at top of panel
- Replace `Slider` with `LedBar` throughout
- Replace `<input type="checkbox">` with `Toggle` throughout
- Replace mode/parse-level pill buttons with `Rocker` (in global tab)
- Reorganize sections into 4 tab panels (global / levels / layered / semantic)
- Move export/import/reset buttons into global tab

After this step: right panel works correctly with new visual style; left pane unchanged.

### Step 4 — VuMeter component
File: `src/components/VuMeter.tsx`

Create `VuMeter`. Add it to the global tab in `Controls.tsx` (it needs `playing` + `tick` props — wire those after Step 5).

### Step 5 — rAF tick in App.tsx
File: `src/App.tsx`

Add `tick` state + rAF loop. Pass `tick` and `isPlaying` down to `Controls` (and later `CrtScope`).
At this point VuMeter animates.

### Step 6 — Transport component
File: `src/components/Transport.tsx`

Create `Transport`. Replace the current play/stop button area in `App.tsx` with `<Transport .../>`. Wire existing handlers (`handlePlay`, `stop`, reset, export).

### Step 7 — CrtScope component
File: `src/components/CrtScope.tsx`

Create `CrtScope`. Wire into `App.tsx` left pane above the text input. Pass `playing`, `activeUnit`, `params`, `tick`.

### Step 8 — App.tsx: chassis shell + text overlay
File: `src/App.tsx`

- Replace outer `div.min-h-screen` with `.osc-chassis` structure
- Replace `<header>` with chassis `.osc-titlebar` (corner screws, LEDs, model label, theme toggle)
- Rewire theme toggle into title bar
- Add word-highlight overlay to textarea (phosphor underline on `activeUnit`)
- Verify light mode still works

### Step 9 — Polish + accessibility audit
All files

- Add `aria-*` attributes per `contracts/ui-components.md`
- Test keyboard navigation through all controls
- Verify VU / CRT animate correctly on play/stop
- Verify all existing functional behaviors unchanged (playback, export, import, reset, layered mode)

## Key CSS class namespacing

All chassis-specific CSS classes use the `osc-` prefix (e.g., `.osc-chassis`, `.osc-crt`, `.osc-bar`). Tailwind utility classes continue to be used for spacing, flex layout, and typography within components. Do not mix chassis palette tokens (`--chassis-panel`, `--phosphor`) with Tailwind color utilities on the same element.

## Token reference (quick lookup)

| Token | Value | Usage |
|---|---|---|
| `--chassis-panel` | `#1a1614` | Main chassis background |
| `--chassis-bezel` | `#3a2f28` | Borders, separators |
| `--chassis-plate` | `#2b2521` | Right panel, transport background |
| `--phosphor` | `#7fff9a` | Waveform, power LED, active unit glow |
| `--amber` | `#ffb347` | LED bar lit segments, tab active, rocker active |
| `--rose` | `oklch(0.78 0.09 20)` | Stop button glyph |
| `--ink` | `#d9cbb8` | Primary text |
| `--ink-dim` | `#8a7a65` | Labels, muted text |
| `--ink-lo` | `#574a3d` | Very muted text (past tokens in overlay) |
