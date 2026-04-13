# Implementation Plan: MIDI Instrument Selector

**Branch**: `003-midi-instrument-select` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-midi-instrument-select/spec.md`

## Summary

Add a named instrument selector to the Controls panel. Each instrument is an oscillator-based
timbre preset (waveform + envelope + filter character) that the user can apply globally with
one interaction. Instruments are defined as static presets in a new `instruments.ts` module
and applied by writing into `AppParams.levels` for all parse levels simultaneously. A new
`instrument` string field in `AppParams` tracks the active preset label. The selector is
rendered as a `<select>` element in the Global section of the Controls panel. No changes to
the Web Audio synthesis chain are required.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 19, Vite 8, Tailwind CSS 4, compromise 14 (NLP), Web Audio API (native browser)
**Storage**: None (session-scoped; presets reset on page reload)
**Testing**: Manual listening tests per spec.md acceptance scenarios; no automated test suite
**Target Platform**: Modern desktop browsers — Chrome, Firefox, Safari, Edge (current versions)
**Project Type**: Single-page web application (static)
**Performance Goals**: Instrument switch takes effect in under 1s (next playback start)
**Constraints**: No external audio libraries; no sample banks; all synthesis via Web Audio oscillators only
**Scale/Scope**: ~12 named instrument presets; single user, single browser session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Non-Phonetic** — Instrument selection is about oscillator timbre (waveform + envelope + filter). No phoneme or pronunciation mapping introduced. ✅
- [x] **III. Client-Side First** — All preset data is statically defined in `instruments.ts`. No network requests. ✅
- [x] **IV. Parameters Over Presets** — The instrument selector IS a user-adjustable parameter exposed in the UI. Individual level sliders remain fully functional after instrument selection. ✅
- [x] **V. Structural Levels Are Orthogonal** — Instrument presets write to per-level LevelParams but do not change the active ParseLevel or layering behaviour. ✅
- [x] **VII. The Text Is Not Consumed** — No text modification. ✅
- [x] **VIII. No External Audio Dependencies** — All synthesis uses the existing `OscillatorNode → BiquadFilterNode → GainNode` chain. No sample banks or external audio libraries. ✅

**Post-Phase 1 re-check**: All gates still pass. The design is purely additive — new module, one new field in AppParams, one new UI control.

## Project Structure

### Documentation (this feature)

```text
specs/003-midi-instrument-select/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── module-interfaces.md   ← Phase 1 output
├── checklists/
│   └── requirements.md  ← spec quality checklist
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types.ts             — add InstrumentPreset type; add instrument field to AppParams;
│                          update DEFAULT_PARAMS; update validateAppParams
├── instruments.ts       — NEW: INSTRUMENT_PRESETS catalog (12 named presets)
├── parser.ts            — unchanged
├── soundEngine.ts       — unchanged
├── App.tsx              — pass instrument handlers to Controls
└── components/
    └── Controls.tsx     — add instrument <select> to Global section

specs/
└── 003-midi-instrument-select/  — this feature's design artifacts
```

**Structure Decision**: Single web application, single project. The new `instruments.ts`
module is the only new source file. All other changes are additive edits to existing files.

## Complexity Tracking

> No violations — section left intentionally empty.
