# Tasks: MIDI Instrument Selector

**Input**: Design documents from `specs/003-midi-instrument-select/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not requested — manual listening tests only (per spec.md and existing project convention).

**Organization**: Tasks grouped by user story. US2 and US3 require no new code —
they are verification phases that confirm the US1 implementation satisfies their
acceptance criteria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Type System)

**Purpose**: Extend the type system before any new source files are written.
All downstream tasks depend on these type additions being complete.

- [x] T001 Add `InstrumentPreset` interface to `src/types.ts` (fields: `id`, `name`, `waveform`, `filterCutoff`, `filterQ`, `attack`, `release`, `gain` — per data-model.md)
- [x] T002 Add `instrument: string` field to `AppParams` interface in `src/types.ts`
- [x] T003 Add `instrument: 'default'` to `DEFAULT_PARAMS` in `src/types.ts`

**Checkpoint**: `npm run build` passes with no TypeScript errors before proceeding.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Create the `instruments.ts` module. Required before Controls.tsx can
import presets. No UI is visible yet.

**⚠️ CRITICAL**: Phase 3 cannot begin until this phase is complete.

- [x] T004 Create `src/instruments.ts`: define `INSTRUMENT_PRESETS` as a `readonly` array of 12 `InstrumentPreset` entries (default, piano, organ, strings, brass, flute, bass, pluck, pad, bell, choir, lead) — use exact values from `research.md` Decision 3 table
- [x] T005 Implement `getPreset(id: string): InstrumentPreset | undefined` in `src/instruments.ts` — returns first entry matching `id`, or `undefined`
- [x] T006 Implement `applyPreset(id: string, levels: Record<ParseLevel, LevelParams>): Record<ParseLevel, LevelParams>` in `src/instruments.ts` — merges preset's `waveform`, `filterCutoff`, `filterQ`, `attack`, `release`, `gain` into all five levels; calls `validateLevelParams()` on each; returns `levels` unchanged if `id` not found; does not mutate input — per contracts/module-interfaces.md

**Checkpoint**: `npm run build` passes. Preset catalog is importable.

---

## Phase 3: User Story 1 — Select Instrument Before Playback (Priority: P1) 🎯 MVP

**Goal**: The instrument selector is visible in the Controls panel. The user can
choose any of the 12 presets before starting playback. The selected instrument's
waveform and envelope character is audible in the next playback session.

**Independent Test**: Select "Strings" (slow attack, sawtooth) → press play → hear
a slow, dark, bowed character. Stop. Select "Pluck" (fast attack, triangle) → press
play → hear a bright, sharp, percussive character. Audible difference confirms US1.

### Implementation for User Story 1

- [x] T007 [US1] In `src/components/Controls.tsx`: add import `{ INSTRUMENT_PRESETS, applyPreset }` from `'../instruments'`
- [x] T008 [US1] In `src/components/Controls.tsx`: add instrument `<select>` element in the Global `<section>`, above the tempo slider — `value` bound to `params.instrument`; styled with existing CSS classes (`bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300`); options populated from `INSTRUMENT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)`
- [x] T009 [US1] Wire `onChange` on the `<select>`: call `applyPreset(id, params.levels)`, then call `onChange(validateAppParams({ ...params, instrument: id, levels: updatedLevels }))` — import `validateAppParams` if not already imported

**Checkpoint**: User Story 1 is independently functional.
- Load app → instrument selector shows "Default" pre-selected ✅
- Select any instrument → play → audibly different character ✅
- All 12 options appear and are selectable ✅
- `npm run build` passes with no TypeScript errors ✅

---

## Phase 4: User Story 2 — Switch Instrument Between Sessions (Priority: P2)

**Goal**: After playing once, the user can switch instruments and replay. The second
session uses the new instrument's character without a page reload.

**Independent Test**: Play once (any instrument). Stop. Select "Bell". Play again.
Confirm the second session has a long ringing decay on each unit. No page reload needed.

**⚠️ No new code required.** The Phase 3 implementation satisfies all US2 requirements.
The `onChange` call immediately updates `AppParams.levels`, so the next playback session
reads the updated waveform/envelope. These tasks are verification only.

### Verification for User Story 2

- [ ] T010 [US2] Manual verification: play with "Organ" (square wave, sharp attack) → stop → select "Pad" (sine, slow 0.3s attack) → play → confirm markedly slower onset and softer character; confirm no page reload is required between sessions
- [ ] T011 [US2] Manual verification: confirm mid-playback instrument change does not crash or interrupt currently sounding voices (existing voices continue; new ticks pick up the new preset from the next unit onward)

**Checkpoint**: User Story 2 verified — instrument switching between sessions works without page reload.

---

## Phase 5: User Story 3 — Selection Persists Through Parameter Changes (Priority: P3)

**Goal**: After selecting an instrument, adjusting other controls (tempo, polyphony,
per-level sliders) does not reset the instrument selector back to "Default".

**Independent Test**: Select "Brass". Adjust the tempo slider. Adjust the polyphony
slider. Open the "word" level and move the pitch-min slider. Confirm the instrument
selector still displays "Brass" throughout.

**⚠️ No new code required.** `AppParams.instrument` is a label field. No other onChange
handler touches it; only the instrument `<select>` onChange sets it. Per-level slider
changes update `AppParams.levels[level]` but leave `AppParams.instrument` unchanged
(confirmed by data-model.md state transition documentation). These tasks are verification only.

### Verification for User Story 3

- [ ] T012 [US3] Manual verification: select "Choir" → adjust tempo slider → confirm selector still shows "Choir"
- [ ] T013 [US3] Manual verification: select "Bell" → expand "sentence" level → change pitch-max slider → confirm selector still shows "Bell" → play → confirm Bell character audible at new pitch range

**Checkpoint**: User Story 3 verified — instrument selection survives all other parameter changes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T014 [P] Final `npm run build` confirming zero TypeScript errors and clean Vite production bundle
- [ ] T015 Run quickstart.md Step 4 verification checklist in full: all 6 verification items must pass
- [x] T016 [P] Confirm instrument selector label (`instrument`) in Controls matches the design: lowercase label "instrument", monospace font, consistent with "waveform" label style in LevelEditor

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (type definitions must exist before `instruments.ts` can import them)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (Controls imports from `instruments.ts`)
- **User Stories 2 & 3 (Phases 4 & 5)**: Depend on Phase 3 completion — verification only
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 — no dependencies on US2 or US3
- **US2 (P2)**: Depends on US1 implementation — verification only, no code
- **US3 (P3)**: Depends on US1 implementation — verification only, no code

### Within Each Phase

- Phase 1: T001 → T002 → T003 (sequential; each line adds to the same file)
- Phase 2: T004 → T005, T006 (T005 and T006 can be written in parallel once T004 skeleton exists)
- Phase 3: T007 → T008 → T009 (sequential; each step builds on the import added in the previous)
- Phases 4 & 5: All verification tasks are independent [P]

### Parallel Opportunities

- T005 and T006 can be written simultaneously (both are functions in `instruments.ts`)
- T010 and T011 can be verified simultaneously (different usage scenarios)
- T012 and T013 can be verified simultaneously (different parameter types)
- T014 and T016 can be checked simultaneously (build check and visual check are independent)

---

## Parallel Example: Phase 2

```text
# Once T004 (INSTRUMENT_PRESETS array) is written:
Task: "Implement getPreset() in src/instruments.ts"       ← T005
Task: "Implement applyPreset() in src/instruments.ts"    ← T006
# Both operate on the already-written INSTRUMENT_PRESETS constant
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Add types (T001–T003) — ~10 min
2. Complete Phase 2: Create `instruments.ts` (T004–T006) — ~15 min
3. Complete Phase 3: Wire Controls.tsx (T007–T009) — ~10 min
4. **STOP and VALIDATE**: Run the Phase 3 checkpoint manually — listen to at least 3 different instruments
5. **MVP is done** — the selector is live and all 12 presets are audible

### Incremental Delivery

1. Phase 1 + 2 → type system + preset module ready (no visible UI change)
2. Phase 3 → instrument selector visible and functional (US1 complete)
3. Phases 4 + 5 → verify US2 and US3 at no implementation cost
4. Phase 6 → build sign-off

### Notes

- Total implementation tasks: 9 (T001–T009)
- Total verification tasks: 4 (T010–T013)
- Total polish tasks: 3 (T014–T016)
- **All synthesis changes flow through `AppParams.levels`** — `buildSoundParams()` and `SoundEngine` require zero modifications
- Commit naturally after Phase 2 (module created) and after Phase 3 (UI wired)
- US2 and US3 verification can be done in one sitting after Phase 3
