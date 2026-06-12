# Tasks: Layering Timeline Sync & Highlighting Fix

**Input**: Design documents from `/specs/007-layering-timeline-sync/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Confirm the working environment is ready.

- [x] T001 Verify dev server starts cleanly with `npm run dev` on branch `007-layering-timeline-sync`; no TypeScript errors or console errors before changes begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model, persistence, and utility functions needed by every user story.

**⚠️ CRITICAL**: All three user story phases depend on this phase being complete.

- [x] T002 In `src/types.ts` — add `export type CharRange = { start: number; end: number }`, add `sustainMode: 'retrigger' | 'hold'` field to `LayeredLevelConfig`, update `validateLayeredLevelConfig` to normalise `sustainMode` (`=== 'hold' ? 'hold' : 'retrigger'`), update `DEFAULT_LAYERED_PARAMS` with `sustainMode` per layer (word/phrase/sentence → `'retrigger'`, paragraph → `'hold'`)
- [x] T003 [P] In `src/configStore.ts` — inside the `LAYERED_LEVELS.map` block of `validateConfig`, add `sustainMode: (l['sustainMode'] === 'hold') ? 'hold' : def.sustainMode` after the `enabled` field read (backward-compatible: old configs without the field fall back to `DEFAULT_LAYERED_PARAMS[level].sustainMode`)
- [x] T004 [P] Create `src/playbackUtils.ts` — export three pure functions: (1) `findTextOffsets(text: string, units: ParseUnit[]): CharRange[]` — walk forward with `text.indexOf(unit.text, searchFrom)` per unit, return document-order `CharRange[]`; (2) `buildWordToSpanMap(wordOffsets: CharRange[], spanOffsets: CharRange[]): number[]` — for each word offset, find the last span whose `start ≤ wordOffset.start`, return `number[]`; (3) `computeBeatMs(wordUnit: ParseUnit, params: AppParams): number` — `return params.tempo * (params.semantic.energyToTempo ? Math.max(0.4, 1 - wordUnit.semantic.energy * 0.5) : 1)`

T003 and T004 can be written in parallel once T002 is complete.

**Checkpoint**: `npm run build` passes with zero TypeScript errors. Foundation ready.

---

## Phase 3: User Story 1 — Unified Playback Timeline (Priority: P1) 🎯 MVP

**Goal**: All active layers start together, advance in lockstep, and finish at the same time. Higher-level layer notes fire at the word beat corresponding to the first word of their span.

**Independent Test**: Load "The cat sat. The dog ran." — enable word + sentence layers. Press play. Confirm (1) the sentence-layer note fires at the same instant as "The" (word 1), (2) the second sentence note fires at "The" (word 4), (3) both layers end simultaneously.

- [x] T005 [US1] In `src/App.tsx` — rewrite `playLayered()` to use a single word-beat step function: (1) `const wordUnits = parseText(text, 'word')`; (2) for each active non-word layer, call `parseText(text, level)` and build `wordToSpanMaps[level]` via `findTextOffsets` + `buildWordToSpanMap`; (3) track `activeSpanIdx: Partial<Record<LayeredLevel, number>>` initialised to `{}`; (4) step function: fire word-layer audio if enabled, then for each active non-word layer look up `newSpanIdx = wordToSpanMaps[level][wordIdx]` and if `newSpanIdx !== activeSpanIdx[level]` fire a note with `duration = beatMs / 1000` and update `activeSpanIdx[level]`; (5) schedule next step with a single `setTimeout(step, beatMs)`; (6) on `wordIdx >= wordUnits.length`: clear all state, `setIsPlaying(false)` — replace all previous parallel `setTimeout` loops; note: sustain/retrigger logic is NOT yet added in this task

**Checkpoint**: All layers finish together; sentence/phrase/paragraph notes fire at the correct word beat. US1 acceptance scenarios pass.

---

## Phase 4: User Story 2 — Higher-Level Layer Chord Sustain (Priority: P1)

**Goal**: Each higher-level layer chord remains audible for the full duration of its span. Users can choose between `retrigger` (chord pulses at word tempo) and `hold` (single sustained note) per backdrop layer. A sustain-mode control is exposed in the layered tab.

**Independent Test**: Enable sentence layer only, sentence sustain mode = retrigger. Press play — chord fires on every word beat within the sentence. Switch to hold — a single note plays continuously until the next sentence. Paragraph layer defaults to hold.

- [x] T006 [US2] In `src/App.tsx` — extend `playLayered()` step function (built in T005) with sustain logic: (1) pre-compute `spanWordCounts[level]: number[]` — for each span index, count how many word beats fall in it using the `wordToSpanMaps`; (2) on span-start beat: if `sustainMode === 'hold'` set `sp.duration = spanWordCounts[level][newSpanIdx] × beatMs / 1000` before calling `playLayeredUnit`; (3) on same-span beat: if `sustainMode === 'retrigger'` call `playLayeredUnit` with `sp.duration = beatMs / 1000`; if `sustainMode === 'hold'` no-op (the long note is already running)
- [x] T007 [P] [US2] In `src/components/Controls.tsx` — in `LayeredLevelEditor`, inside the `{isBackdrop && ...}` block after the gain `LedBar`, add: `<div><span className="osc-sel-label">sustain mode</span><Rocker value={config.sustainMode} options={['retrigger', 'hold'] as const} onChange={v => set({ sustainMode: v as 'retrigger' | 'hold' })} /></div>`

T007 (Controls.tsx) can be written in parallel with T006 (App.tsx) since they are in different files.

**Checkpoint**: Retrigger produces audible pulsing at word tempo; hold produces a smooth continuous tone. Sustain-mode Rocker appears and persists in layered tab. US2 acceptance scenarios pass.

---

## Phase 5: User Story 3 — Per-Level Highlighting in Layered Mode (Priority: P2)

**Goal**: During layered playback, the text overlay shows the current word in phosphor-green, the current phrase span with a solid amber underline, the current sentence span with a dashed amber underline, and the current paragraph span with a dotted amber underline. Disabled layers show no highlight.

**Independent Test**: Enable all four layers and press play on a multi-sentence text. Observe three distinct underline styles on the text simultaneously alongside the phosphor-green word highlight.

- [x] T008 [P] [US3] In `src/index.css` — add three CSS classes to the chassis token block: `.hl-phrase { text-decoration-line: underline; text-decoration-style: solid; text-decoration-color: var(--amber); text-decoration-thickness: 1px; }`, `.hl-sentence { ... dashed ... }`, `.hl-paragraph { ... dotted ... }`
- [x] T009 [US3] In `src/App.tsx` — (1) replace `activeDisplayIdx: number` state with `activeHighlight: CharRange | null`; (2) add `layeredHighlights: Partial<Record<LayeredLevel, CharRange | null>>` state, initialised to `{}`; (3) add `tokenOffsets: CharRange[]` memo derived from `displayTokens`: `useMemo(() => { let pos = 0; return displayTokens.map(t => { const s = pos; pos += t.length; return { start: s, end: pos } }) }, [displayTokens])`; (4) rewrite text overlay render: for each `displayTokens[i]`, compare `tokenOffsets[i]` against `activeHighlight` for `'cur'`/`'past'` classes, and against each `layeredHighlights[level]` for `'hl-phrase'`/`'hl-sentence'`/`'hl-paragraph'` classes (skip underline if token is already `'cur'`)

T008 (CSS) and T009 (App.tsx) can be written in parallel.

- [x] T010 [US3] In `src/App.tsx` — extend `playLayered()` step function (built in T005/T006): on each word beat, pre-compute `spanOffsets[level]` from the layer's parsed units at play-start using `findTextOffsets`; on each beat, retrieve `CharRange = spanOffsets[level][activeSpanIdx[level]]` and call `setLayeredHighlights(prev => ({ ...prev, [level]: range }))`; on stop/completion call `setLayeredHighlights({})`

T010 depends on T009 (needs `layeredHighlights` state to be declared).

**Checkpoint**: Three underline styles visible simultaneously during layered playback. Disabled layers show no underline. US3 acceptance scenarios pass.

---

## Phase 6: User Story 4 — Single-Level Highlighting Fix (Priority: P2)

**Goal**: In single mode, the text overlay correctly tracks the active token for all five parse levels. Sentence, phrase, and paragraph tokens highlight as full spans, not stale single-word positions.

**Independent Test**: Single mode, parse level = sentence, three-sentence text. Press play — each sentence's tokens highlight in turn, past sentences dim. Repeat with phrase and paragraph.

- [x] T011 [US4] In `src/App.tsx` — fix `play()` step function: (1) before the step loop, call `const unitOffsets = findTextOffsets(text, units)`; (2) inside `step()`, after `i++`, call `setActiveHighlight(unitOffsets[i - 1] ?? null)` to replace the old `setActiveDisplayIdx(unit.index * 2)` call; (3) on stop/completion set `setActiveHighlight(null)`; (4) verify `activeUnit` (used by `CrtScope`) is still being set — keep `setActiveUnit(unit.text)` if CrtScope depends on it, otherwise remove

T011 depends on T009 (the overlay render was already updated to use `activeHighlight` CharRange).

**Checkpoint**: Sentence/phrase/paragraph highlights advance correctly. Word-level behaviour unchanged (regression test). US4 acceptance scenarios pass.

---

## Phase 7: Polish & Verification

**Purpose**: Build correctness and full manual test pass.

- [x] T012 Run `npm run build` — confirm zero TypeScript errors and no type `any` violations; fix any type errors before proceeding
- [x] T013 Manual testing per `specs/007-layering-timeline-sync/quickstart.md` — work through all 14 checklist items (timeline sync, retrigger/hold sustain, single-mode highlighting for all 5 parse levels, layered-mode underline highlighting, config export/import backward compatibility)
- [x] T014 [P] Verify config backward compatibility: export a config, manually remove the `sustainMode` fields from the JSON, re-import — confirm each layer loads with its correct default `sustainMode` without errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2 (needs `playbackUtils.ts` and `CharRange` type)
- **US2 (Phase 4)**: Depends on Phase 3 (`playLayered` shared timeline must exist before sustain can be layered on top)
- **US3 (Phase 5)**: Depends on Phase 2 (`CharRange` type); logically benefits from Phase 3 being complete (playLayered loop to extend)
- **US4 (Phase 6)**: Depends on Phase 5 (text overlay render must use CharRange before `play()` can set it)
- **Polish (Phase 7)**: Depends on Phases 3–6

### User Story Dependencies

- **US1 (P1)**: Only needs Foundational phase complete
- **US2 (P1)**: Needs US1 complete (extends same function)
- **US3 (P2)**: Needs Foundational + US1 (playLayered step function to extend with highlight updates)
- **US4 (P2)**: Needs US3 (overlay render must support CharRange before play() fix makes sense)

### Parallel Opportunities Within Phases

| Phase | Parallel tasks |
|---|---|
| Phase 2 | T003 (configStore) ‖ T004 (playbackUtils) — after T002 |
| Phase 4 | T006 (App sustain logic) ‖ T007 (Controls Rocker) |
| Phase 5 | T008 (CSS) ‖ T009 (App state/render) |
| Phase 7 | T012 (build) → T013 (manual test) ‖ T014 (backward compat) |

---

## Parallel Example: Phase 4

```
# After T005 (US1) is complete, these two can run simultaneously:
Task T006: "Extend playLayered() with retrigger/hold logic in src/App.tsx"
Task T007: "Add sustainMode Rocker to LayeredLevelEditor in src/components/Controls.tsx"
```

---

## Implementation Strategy

### MVP (US1 + US2 only — timeline sync and sustain)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: US1 — shared timeline (T005)
4. Complete Phase 4: US2 — sustain + UI (T006–T007)
5. **STOP and validate**: layered playback is in sync; chords sustain correctly
6. Run `npm run build` to confirm no TypeScript errors

### Full Delivery (all 4 user stories)

1. MVP above
2. Complete Phase 5: US3 — layered highlighting (T008–T010)
3. Complete Phase 6: US4 — single-mode highlight fix (T011)
4. Complete Phase 7: Polish (T012–T014)

---

## Notes

- `[P]` tasks touch different files with no shared in-progress state — safe to work in parallel
- `[Story]` label maps every implementation task to its user story for traceability
- The text overlay render (T009) is shared infrastructure for both US3 and US4 — it lives in Phase 5 because US3's layered highlights require it first
- `activeUnit` (string state for CrtScope) is separate from `activeHighlight` (CharRange for text overlay) — preserve it in T011 unless CrtScope is confirmed to not use it
- Commit after each checkpoint; each checkpoint is a deployable increment
