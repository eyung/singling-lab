# Implementation Plan: Simultaneous Audio Layering

**Feature**: 005-audio-layering
**Branch**: 005-audio-layering
**Date**: 2026-04-20
**Status**: Ready for task generation

---

## Technical Context

### Tech Stack
- TypeScript 5.x (strict mode)
- React 19, Vite 8, Tailwind CSS 4
- Web Audio API (native browser)
- compromise 14 (existing NLP — no changes needed)
- **Zero new npm packages**

### Architecture Overview

This feature introduces a new `layered` playback mode alongside the existing `single` mode. The architecture change is contained to:

1. **New module** `src/soundCharacters.ts` — 24-entry `SoundCharacter` catalog (12 synthesis + 12 environmental)
2. **Extended** `src/types.ts` — new types: `SoundCharacter`, `LayeredLevel`, `LayeredLevelConfig`; extended `AppParams`
3. **Extended** `src/soundEngine.ts` — noise synthesis, master compressor, pitch quantisation, `playLayeredUnit()`
4. **Extended** `src/App.tsx` — mode state, `playLayered()` with 4 parallel `setTimeout` loops, mode toggle button
5. **Extended** `src/components/Controls.tsx` — mode toggle UI, Layered Levels section with per-layer selectors
6. **Extended** `src/configStore.ts` — backward-compatible validation of new AppParams fields

### Key Architectural Decisions (from research.md)

| Decision | Approach |
|----------|----------|
| Simultaneous playback | 4 independent `setTimeout` loops started together |
| Non-traditional sounds | `AudioBufferSourceNode` + noise buffer (Web Audio only) |
| Harmoniousness | Pitch quantisation to C major (C2–C6) in layered mode |
| Anti-clipping | `DynamicsCompressorNode` master limiter |
| Backdrop constraint | `percussive: boolean` flag + UI filter |
| Sound catalog | 24 `SoundCharacter` entries in new `soundCharacters.ts` |
| AppParams extension | `mode` + `layered` fields with backward-compatible defaults |

### Default Layer Assignment

| Level | Instrument | Gain |
|-------|-----------|------|
| word | pluck | 0.70 |
| phrase | pad | 0.42 |
| sentence | strings | 0.22 |
| paragraph | ocean | 0.10 |

---

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| V: Structural Levels Orthogonal | This IS the explicitly scoped introduction of layered mode. Constitution amendment required post-implementation. | PASS (amendment pending) |
| VIII: No External Audio | All sounds use Web Audio API; noise via JS `Math.random()`; zero new packages | PASS |
| IX: Reduce Ambiguity | C major quantisation eliminates harmonic ambiguity between layers | PASS |
| X: Persist & Portability | `mode` and `layered` in AppParams, persisted via existing configStore | PASS |
| XI: Accessibility First | Mode toggle and all layer selectors require `aria-label`; keyboard-navigable | PASS |

**Post-implementation required**: Amend constitution Principle V to acknowledge `layered` mode as a supported first-class mode. Cross off "Simultaneous multi-level playback" from Future Scope.

---

## Phased Implementation

### Phase 1: Type System

Establish the new types in `types.ts`. All downstream code depends on these.

**Files**: `src/types.ts`
**New exports**: `SoundCharacter`, `LayeredLevel`, `LayeredLevelConfig`, `DEFAULT_LAYERED_PARAMS`, `LAYERED_LEVELS`, `validateLayeredLevelConfig`
**Modified exports**: `AppParams` (add `mode`, `layered` fields), `DEFAULT_PARAMS` (add `mode: 'single'`, `layered: DEFAULT_LAYERED_PARAMS`), `validateAppParams` (call `validateLayeredLevelConfig` per layer)

### Phase 2: Sound Character Catalog

Create `src/soundCharacters.ts` with all 24 `SoundCharacter` definitions.

**Files**: `src/soundCharacters.ts` (new)
**Exports**: `SOUND_CHARACTERS`, `getSoundCharacter`, `getBackdropCharacters`, `getAllCharacters`

### Phase 3: Sound Engine Extensions

Extend `SoundEngine` in `src/soundEngine.ts` with noise synthesis, compressor, quantisation.

**Files**: `src/soundEngine.ts`
**New functions**: `generateNoiseBuffer`, `quantiseToCMajor`
**New methods**: `SoundEngine.playLayeredUnit`, internal compressor wiring
**New exports**: `quantiseToCMajor` (for testing/use in App.tsx)

### Phase 4: Layered Playback in App.tsx

Wire the mode state, `playLayered()` function, and mode toggle button.

**Files**: `src/App.tsx`
**New state**: `mode` (synced to `params.mode`), multiple `playbackRef` entries (one per level)
**New function**: `playLayered()` — 4 parallel loops
**UI change**: mode toggle buttons in left panel (below parse level row)

### Phase 5: Controls Panel

Add mode toggle and Layered Levels section to `src/components/Controls.tsx`.

**Files**: `src/components/Controls.tsx`
**New section**: "Layered Levels" (visible in layered mode only)
**New UI**: per-layer enabled checkbox, SoundCharacter selector, gain slider

### Phase 6: Config Store Extension

Extend `validateConfig` in `src/configStore.ts` to handle new AppParams fields.

**Files**: `src/configStore.ts`
**Change**: Read/validate `mode` and `layered` fields with backward-compatible defaults

### Phase 7: Validation

Build check, manual verification against quickstart.md scenarios.

---

## File Change Summary

| File | Type | Phase |
|------|------|-------|
| `src/types.ts` | Modify | 1 |
| `src/soundCharacters.ts` | New | 2 |
| `src/soundEngine.ts` | Modify | 3 |
| `src/App.tsx` | Modify | 4 |
| `src/components/Controls.tsx` | Modify | 5 |
| `src/configStore.ts` | Modify | 6 |

**No new npm packages.** All changes are additive (backward compatible).
