# Implementation Plan: Configuration Persistence & Portability

**Branch**: `004-config-persist` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-config-persist/spec.md`

## Summary

Implement configuration export (download as `.json`), import (upload and restore from `.json`),
automatic browser-local persistence (localStorage on every parameter change), and explicit
reset to defaults. A new `configStore.ts` module encapsulates all persistence logic. The
`App.tsx` initialisation reads from localStorage; parameter changes trigger an auto-save.
The Controls panel gains Export, Import, and Reset controls in the Global section. No new
dependencies are required — the Web File API and localStorage are native browser primitives.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: React 19, Vite 8, Tailwind CSS 4 (all existing)  
**Storage**: `localStorage` (auto-persistence); Browser File API (export/import)  
**Testing**: Manual functional tests per spec.md acceptance scenarios  
**Target Platform**: Modern desktop browsers — Chrome, Firefox, Safari, Edge (current)  
**Project Type**: Single-page web application (static)  
**Performance Goals**: localStorage read on init adds <10ms; export/import round-trip <1s  
**Constraints**: No new npm dependencies; no server-side storage; file API is native browser  
**Scale/Scope**: Single user, single browser session; files shared as ordinary file transfers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Non-Phonetic** — No audio synthesis involved. ✅
- [x] **III. Client-Side First** — `localStorage` and the File API are native browser primitives; zero server round-trips. ✅
- [x] **IV. Parameters Over Presets** — All existing parameters remain exposed and individually adjustable; export/import adds persistence without hiding any control. ✅
- [x] **V. Structural Levels Are Orthogonal** — No parse level logic is touched. ✅
- [x] **VII. The Text Is Not Consumed** — No text modification. ✅
- [x] **VIII. No External Audio Dependencies** — No audio involvement whatsoever. ✅
- [x] **IX. Reduce Ambiguity** — Configuration export is deterministic: same `AppParams` always produces the same JSON. Import applies validation before state change; invalid files are rejected. ✅
- [x] **X. Persist & Portability** — This feature IS the implementation of Principle X. ✅
- [x] **XI. Accessibility First** — Export/Import/Reset controls must be keyboard-navigable and labelled for screen readers. Documented in contracts. ✅

**Post-Phase 1 re-check**: All gates still pass. The design is purely additive — one new module,
three new controls, one App.tsx initialisation change.

## Project Structure

### Documentation (this feature)

```text
specs/004-config-persist/
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
├── types.ts             — add ConfigFile type, CONFIG_VERSION constant
├── configStore.ts       — NEW: exportConfig(), importConfig(), saveToStorage(),
│                          loadFromStorage(), resetToDefaults(), validateConfig()
├── instruments.ts       — unchanged
├── parser.ts            — unchanged
├── soundEngine.ts       — unchanged
├── App.tsx              — init: loadFromStorage(); onChange: saveToStorage()
└── components/
    └── Controls.tsx     — add Export / Import / Reset controls in Global section
```

**Structure Decision**: Single web application, single project. One new source file
(`configStore.ts`). All other changes are additive edits to existing files.

## Complexity Tracking

> No violations — section left intentionally empty.
