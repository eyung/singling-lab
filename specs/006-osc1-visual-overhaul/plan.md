# Implementation Plan: OSC-1 Visual Overhaul

**Branch**: `006-osc1-visual-overhaul` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-osc1-visual-overhaul/spec.md`

## Summary

Replace singling lab's clean zinc/Tailwind UI with a retro oscilloscope instrument aesthetic ("OSC-1"). The visual layer is entirely additive: no changes to data types, sound engine, parser, or configuration schema. New components (`CrtScope`, `LedBar`, `Rocker`, `Toggle`, `VuMeter`, `Transport`) replace or wrap existing UI primitives. A `requestAnimationFrame` tick in `App.tsx` drives the CRT waveform and VU meter animations.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: React 19, Vite 8, Tailwind CSS 4, compromise 14, Web Audio API  
**Storage**: localStorage via `configStore.ts`  
**Testing**: none (no automated test suite in project)  
**Target Platform**: modern browser (Chromium 120+, Firefox 120+, Safari 17+), desktop viewport  
**Project Type**: web-app (single-page, client-side-only)  
**Performance Goals**: ≥30fps CRT waveform animation via `requestAnimationFrame`  
**Constraints**: client-side only; no external audio libraries; no new data types; must not break existing Web Audio, config persistence, or playback  
**Scale/Scope**: single-page app; visual-only change; ~4 new component files + updates to App.tsx and Controls.tsx

## Constitution Check

*GATE: All gates pass — no violations.*

- [x] **I. Non-Phonetic** — Purely visual change; no phoneme or pronunciation mapping introduced.
- [x] **III. Client-Side First** — No server round-trips. All new code (fonts, CSS, components) runs in the browser.
- [x] **IV. Parameters Over Presets** — No new parameters. All existing parameters remain exposed and editable.
- [x] **V. Structural Levels Are Orthogonal** — The tabbed right panel reorganizes existing controls; no change to level isolation or playback logic.
- [x] **VII. The Text Is Not Consumed** — No change to text handling; the word-highlight overlay is read-only.
- [x] **VIII. No External Audio Dependencies** — No new audio libraries. Visual-only change.
- [x] **IX. Reduce Ambiguity** — No effect on sound output. Identical input + identical params = identical sound.
- [x] **X. Persist & Portability** — No new parameters. Export/import schema (`ConfigFile`, `CONFIG_VERSION`) unchanged.
- [x] **XI. Accessibility First** — **Requires care in implementation**: LED bar uses a visually hidden `<input type="range">` (DOM-present, keyboard-accessible). Toggle uses a visually hidden `<input type="checkbox">` (DOM-present). Tab buttons need `aria-selected` and `role="tab"`. Existing `aria-label` attributes on play/stop/reset must be preserved. CRT scope is purely decorative (`aria-hidden`). See `contracts/ui-components.md` for accessibility contracts per component.

## Project Structure

### Documentation (this feature)

```text
specs/006-osc1-visual-overhaul/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-components.md # Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code (affected files)

```text
index.html                         ← add Google Fonts link (IBM Plex Mono)
src/
├── index.css                      ← add CSS custom property chassis tokens
├── App.tsx                        ← add rAF tick; replace header/layout with chassis shell
└── components/
    ├── Controls.tsx               ← tabbed right panel; replace Slider/checkbox with LedBar/Toggle
    ├── CrtScope.tsx               ← NEW: oscilloscope display (waveform + active-unit)
    ├── LedBar.tsx                 ← NEW: segmented LED bar slider (replaces Slider)
    ├── Rocker.tsx                 ← NEW: shared-bezel button group (replaces pill buttons)
    ├── Toggle.tsx                 ← NEW: hardware toggle switch (replaces checkbox)
    ├── VuMeter.tsx                ← NEW: VU meter (20-segment output level display)
    └── Transport.tsx              ← NEW: tape-transport button row (play/stop/reset/export)
```

**Structure Decision**: Single-project web app. All new visual components are co-located in `src/components/` alongside the existing `Controls.tsx`. The chassis CSS tokens live in `src/index.css` to keep them within Vite's CSS pipeline and available globally.

## Complexity Tracking

*No Constitution Check violations — section not required.*
