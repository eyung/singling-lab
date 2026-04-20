# singling-lab Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-20

## Active Technologies

- TypeScript 5.x (strict mode)
- React 19, Vite 8, Tailwind CSS 4
- compromise 14 (in-browser NLP)
- Web Audio API (native browser — no external audio libraries)
- Vercel (static deployment)
- IBM Plex Mono (Google Fonts CDN — primary typeface, loaded in `index.html`)

## Project Structure

```text
src/
├── types.ts             — shared types, defaults, validation; ConfigFile, CONFIG_VERSION
├── configStore.ts       — export/import/localStorage persistence (004)
├── instruments.ts       — InstrumentPreset catalog (12 named oscillator presets)
├── parser.ts            — text → ParseUnit[] (5 parse levels + semantic analysis)
├── soundEngine.ts       — buildSoundParams(), SoundEngine (Web Audio)
├── index.css            — Tailwind import + chassis CSS custom property tokens (006)
├── App.tsx              — playback loop, top-level UI; rAF tick; chassis shell (006)
└── components/
    ├── Controls.tsx     — tabbed right panel (global/levels/layered/semantic); export/import/reset
    ├── CrtScope.tsx     — oscilloscope CRT display; animated waveform + active-unit (006)
    ├── LedBar.tsx       — segmented LED bar slider (006)
    ├── Rocker.tsx       — shared-bezel exclusive-select button group (006)
    ├── Toggle.tsx       — hardware toggle switch (006)
    ├── VuMeter.tsx      — 20-segment output level indicator (006)
    └── Transport.tsx    — tape-transport play/stop/reset/export buttons (006)

specs/
├── 001-core-instrument/ — design artifacts (plan, research, data-model, contracts)
├── 003-midi-instrument-select/ — instrument selector design artifacts
├── 004-config-persist/  — configuration persistence design artifacts
├── 005-audio-layering/  — simultaneous multi-level audio layering design artifacts
└── 006-osc1-visual-overhaul/ — OSC-1 retro oscilloscope visual overhaul design artifacts

.specify/                — spec-kit constitution, templates, scripts
```

## Commands

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # TypeScript check + Vite production build → dist/
npm run preview  # preview production build locally
```

## Code Style

- TypeScript strict mode; no `any`
- Functional React components with hooks only
- Validation functions (`validateLevelParams`, `validateAppParams`) applied on every
  parameter change — never persist invalid state
- Web Audio: always close `AudioContext` on stop; never leak oscillator nodes
- Instrument presets write into `AppParams.levels` — `buildSoundParams()` requires no changes when adding new presets
- `configStore` functions never throw — localStorage failures are silent; import errors reject the Promise with a user-displayable message
- All persistence (localStorage + file) goes through `validateConfig()` + existing validators before touching state

## Recent Changes

- 006-osc1-visual-overhaul: OSC-1 retro visual overhaul — chassis shell, CrtScope, LedBar, Rocker, Toggle, VuMeter, Transport; tabbed Controls; CSS chassis tokens; IBM Plex Mono font; rAF tick in App; no data-model changes
- 005-audio-layering: Simultaneous multi-level audio layering — `soundCharacters.ts`, `LayeredLevelConfig`, `layered` field in `AppParams`, `playLayered()` in App, `LayeredLevelEditor` in Controls
- 004-config-persist: Config persistence — `configStore.ts` (export/import/localStorage), `ConfigFile` type, lazy App init, export/import/reset controls in Controls
- 003-midi-instrument-select: Instrument selector — `instruments.ts` (12 presets), `InstrumentPreset` type, `instrument` field in `AppParams`, `<select>` in Controls Global section
- 001-core-instrument: Initial implementation — parser, soundEngine, types, App, Controls

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
