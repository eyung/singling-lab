# singling-lab Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-06-12

## Active Technologies

- TypeScript 5.x (strict mode)
- React 19, Vite 8, Tailwind CSS 4
- compromise 14 (in-browser NLP — POS tags only; segmentation is hand-rolled with exact offsets)
- Web Audio API (native browser — no external audio libraries; encoders are hand-rolled file writers)
- vitest (pure-module unit tests; audio/UI verified via quickstarts)
- Vercel (static deployment)
- IBM Plex Mono (Google Fonts CDN — primary typeface, loaded in `index.html`)

## Project Structure

```text
src/
├── types.ts             — shared types, validation, defaults; ConfigFile, CONFIG_VERSION,
│                          Timeline/TimelineEvent/GridCell, ScaleConfig, KeywordRule (008)
├── lexicon.ts           — sentiment/energy/negator/modal/function/common word sets,
│                          category lexicons, syllable + frequency-tier heuristics (008)
├── parser.ts            — parseAll(): offset-exact units at all 5 levels + semantic signals;
│                          invariant: text.slice(range.start, range.end) === unit.text (008)
├── scale.ts             — musical scales, buildScaleFreqs(), quantiseFreq() (008)
├── mapping.ts           — mapUnit(): unit + params → SoundParams; 8 semantic overrides,
│                          keyword/category character resolution, punctuation voices (008)
├── timeline.ts          — buildTimeline(): deterministic event schedule consumed by playback,
│                          WAV, MIDI and UI; deterministic voice budget; cellIndexAt() (008)
├── soundEngine.ts       — scheduleSound() shared live/offline graph; LiveEngine (lookahead
│                          scheduler, suspend-pause, seek, analyser master bus); seeded noise (008)
├── export.ts            — encodeWav, buildMidi, buildParsedTxt — pure, DOM-free, unit-tested (008)
├── render.ts            — renderWavBlob (OfflineAudioContext), downloadBlob, filenameSlug (008)
├── configStore.ts       — export/import/localStorage persistence (004; extended 008)
├── instruments.ts       — InstrumentPreset catalog (12 named oscillator presets, single mode)
├── soundCharacters.ts   — SoundCharacter catalog incl. percussion (punctuation/keywords) (008)
├── themeStore.ts        — light/dark persistence
├── index.css            — Tailwind import + chassis tokens; light-theme corrections; responsive (008)
├── App.tsx              — timeline orchestration, seek, shortcuts, live typing, demos, exports (008)
└── components/
    ├── Controls.tsx     — tabs: global/levels/layers/language; scale, keywords, category map (008)
    ├── CrtScope.tsx     — canvas CRT: real analyser waveform, inspector, layer LEDs (008)
    ├── StructureMap.tsx — canvas structure rows + playhead; click/keyboard seek (008)
    ├── LedBar.tsx       — segmented LED bar slider (006)
    ├── Rocker.tsx       — shared-bezel exclusive-select button group (006)
    ├── Toggle.tsx       — hardware toggle switch (006)
    ├── VuMeter.tsx      — real RMS metering from the master analyser (008)
    └── Transport.tsx    — play/pause/resume, stop, reset, rec-wav (008)

src/__tests__/           — vitest suites for parser, scale, mapping, timeline, export

specs/                   — spec-kit design artifacts per feature (001…008)
.specify/                — spec-kit constitution, templates, scripts
```

## Commands

```bash
npm run dev      # start dev server at localhost:5173
npm test         # vitest — pure-module suites (parser/scale/mapping/timeline/export)
npm run build    # TypeScript check + Vite production build → dist/
npm run preview  # preview production build locally
```

## Code Style

- TypeScript strict mode; no `any`
- Functional React components with hooks only
- The pipeline stays pure until the engine: parser → mapping → timeline are deterministic
  functions of (text, params); audio and DOM only in soundEngine/render/components
- Validation functions (`validateLevelParams`, `validateAppParams`, …) applied on every
  parameter change — never persist invalid state
- Web Audio: schedule on the AudioContext clock (lookahead), never chain `setTimeout` for
  audible timing; all voices route through the master limiter; noise is seeded (mulberry32)
- Parser invariant: every ParseUnit's `range` slices exactly back to its `text`
- Live playback and WAV render must share `scheduleSound()` — what you hear is what exports
- `configStore` functions never throw — localStorage failures are silent; import errors reject
  the Promise with a user-displayable message; unknown/missing config fields fall back per-field
- Instrument presets write into `AppParams.levels`; sound characters own envelope/filter when
  they drive an event (layered layers, keywords, categories)

## Recent Changes

- 008-sonic-overhaul: Deterministic Timeline architecture (playback = WAV = MIDI source);
  offset-exact parser with punctuation units, negation, modals, frequency tiers, categories,
  sentence types; 8 semantic overrides + keyword triggers + editable category map; musical
  scale system; LiveEngine with lookahead scheduling, real pause/seek; WAV/MIDI/TXT exports;
  StructureMap, real-signal CrtScope/VuMeter, demo texts, live typing; vitest suite
- 007-layering-timeline-sync: shared word-beat timeline in layered mode; sustainMode; character-range highlighting
- 006-osc1-visual-overhaul: OSC-1 retro chassis, CrtScope, LedBar, Rocker, Toggle, VuMeter, Transport
- 005-audio-layering: simultaneous multi-level audio layering, sound characters, layered config
- 004-config-persist: config export/import/localStorage, ConfigFile envelope
