# Implementation Plan: Core Instrument

**Branch**: `001-core-instrument` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-core-instrument/spec.md`

## Summary

singling-lab is a browser-based text-to-sound transduction instrument. It parses
written text at user-selected granularity levels (letter, word, phrase, sentence,
paragraph) and renders each parsed unit as a non-phonetic audio event via the Web
Audio API. Sound character is shaped by user-controlled parameters per level and by
semantic signals (sentiment, energy, POS tags) derived via the `compromise` NLP
library. The instrument is a single-page Vite + React + TypeScript application
deployed statically to Vercel.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 19, Vite 8, Tailwind CSS 4, compromise 14 (NLP), Web Audio API (native browser)
**Storage**: None (v1 — parameters reset on page reload; localStorage preset system deferred)
**Testing**: Manual listening tests per spec.md acceptance scenarios; no automated test suite in v1
**Target Platform**: Modern desktop browsers — Chrome, Firefox, Safari, Edge (current versions)
**Project Type**: Single-page web application (static)
**Performance Goals**: Zero audio glitches on 500-word text at word level; UI events <16ms; page load <3s on standard connection
**Constraints**: Fully offline-capable after page load; zero server requests for core functionality; no external audio libraries
**Scale/Scope**: Single user, single browser session, no backend, no authentication

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Non-Phonetic** — Text hashing only; no phoneme or pronunciation mapping anywhere in the codebase. ✅
- [x] **III. Client-Side First** — Vite SPA, static Vercel deploy, zero API calls. `compromise` runs in-browser. ✅
- [x] **IV. Parameters Over Presets** — All sonic properties (pitch, duration, waveform, filter, gain, attack, release) are exposed as user sliders. Nothing hardcoded that could reasonably vary. ✅
- [x] **V. Structural Levels Are Orthogonal** — One `parseLevel` active at a time; no multi-level layering. ✅
- [x] **VII. The Text Is Not Consumed** — Text state is read-only; playback snapshots units at play-time and never modifies the input. ✅
- [x] **VIII. No External Audio Dependencies** — Only Web Audio API. Synthesis chain: `OscillatorNode → BiquadFilterNode → GainNode → destination`. ✅

**Post-Phase 1 re-check**: All gates still pass. No violations introduced during design.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-instrument/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── module-interfaces.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── types.ts             — shared types, defaults, validateLevelParams(), validateAppParams()
├── parser.ts            — parseText() for all 5 levels; semantic analysis via compromise
├── soundEngine.ts       — buildSoundParams(), SoundEngine class (Web Audio)
├── App.tsx              — playback tick loop, top-level layout
└── components/
    └── Controls.tsx     — parameter panel: global controls + per-level LevelEditor

specs/
└── 001-core-instrument/ — this feature's design artifacts

.specify/                — spec-kit toolchain (constitution, templates, scripts)
dist/                    — Vite production build output (Vercel serves this)
```

**Structure Decision**: Single web application. No backend, no monorepo. All source
under `src/`. All spec artifacts under `specs/001-core-instrument/`.

## Complexity Tracking

> No violations — section left intentionally empty.
