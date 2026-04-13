# singling-lab Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-13

## Active Technologies

- TypeScript 5.x (strict mode)
- React 19, Vite 8, Tailwind CSS 4
- compromise 14 (in-browser NLP)
- Web Audio API (native browser — no external audio libraries)
- Vercel (static deployment)

## Project Structure

```text
src/
├── types.ts             — shared types, defaults, validation
├── instruments.ts       — InstrumentPreset catalog (12 named oscillator presets)
├── parser.ts            — text → ParseUnit[] (5 parse levels + semantic analysis)
├── soundEngine.ts       — buildSoundParams(), SoundEngine (Web Audio)
├── App.tsx              — playback loop, top-level UI
└── components/
    └── Controls.tsx     — parameter panel

specs/
├── 001-core-instrument/ — design artifacts (plan, research, data-model, contracts)
└── 003-midi-instrument-select/ — instrument selector design artifacts

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

## Recent Changes

- 003-midi-instrument-select: Instrument selector — `instruments.ts` (12 presets), `InstrumentPreset` type, `instrument` field in `AppParams`, `<select>` in Controls Global section
- 001-core-instrument: Initial implementation — parser, soundEngine, types, App, Controls

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
