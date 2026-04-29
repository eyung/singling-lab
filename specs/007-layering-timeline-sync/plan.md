# Implementation Plan: Layering Timeline Sync & Highlighting Fix

**Branch**: `007-layering-timeline-sync` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-layering-timeline-sync/spec.md`

## Summary

Fix three independent bugs in the layered playback and text-overlay highlighting systems: (1) layer desync caused by independent `setTimeout` loops running at the same per-step interval, (2) higher-level layers playing once and going silent instead of sustaining or re-triggering, and (3) the text overlay highlight failing to track active tokens for non-word parse levels. Additionally, add a per-layer `sustainMode` control (`retrigger | hold`) to `LayeredLevelConfig`. The fix collapses all layer timers into a single word-beat step function and replaces the integer-index highlight with a character-range approach.

## Technical Context

**Language/Version**: TypeScript 5.x strict mode  
**Primary Dependencies**: React 19, Vite 8, Web Audio API (native), compromise 14  
**Storage**: localStorage (via `configStore.ts`); file export/import (`.json`)  
**Testing**: Manual browser testing (`npm run dev`); no automated test suite  
**Target Platform**: Browser (Chromium/Firefox/Safari); desktop viewport ≥1024px  
**Project Type**: Browser web app (Vite + React SPA, static deploy)  
**Performance Goals**: Timing accurate to within one JS event loop tick (~16ms); no audible jitter on standard desktop hardware  
**Constraints**: No new external libraries; `sustainMode` field must be backward-compatible in exported configs; `validateConfig` must silently fall back on old configs  
**Scale/Scope**: Single-user browser app; text input bounded by practical polyphony (4–16 simultaneous voices)

## Constitution Check

- [x] **I. Non-Phonetic** — No phoneme or pronunciation mapping introduced. Timeline and highlighting are structural, not articulatory. ✅
- [x] **III. Client-Side First** — Entirely browser-side. No server round-trips. ✅
- [x] **IV. Parameters Over Presets** — `sustainMode` is a new user-adjustable parameter exposed via `Rocker` in the layered tab for each backdrop level. ✅
- [x] **V. Structural Levels Are Orthogonal** — Feature enforces the intended layered-mode behaviour (simultaneous levels with independent instruments/gains, unified timing). Principle V's layered-mode constraints are upheld. ✅
- [x] **VII. The Text Is Not Consumed** — Playback reads from a snapshot of `text`; no modification. Character-offset lookup is read-only. ✅
- [x] **VIII. No External Audio Dependencies** — Web Audio API only (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`, `AudioBufferSourceNode`). ✅
- [x] **IX. Reduce Ambiguity** — Shared timeline makes layered output fully deterministic given the same text and params. Resolves an open question in the constitution about active-unit visualization. ✅
- [x] **X. Persist & Portability** — `sustainMode` is included in `LayeredLevelConfig` and flows through `configStore.validateConfig`, `saveToStorage`, and `exportConfig`. Old configs fall back to layer-appropriate defaults. ✅
- [x] **XI. Accessibility First** — Highlighting improvement increases readability. Existing keyboard navigation and ARIA roles unchanged. ✅

**Verdict**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/007-layering-timeline-sync/
├── plan.md              ← this file
├── research.md          ← design decisions (5 decisions)
├── data-model.md        ← LayeredLevelConfig change + new runtime types
├── quickstart.md        ← step-by-step implementation guide + test checklist
├── contracts/
│   └── layered-level-config.md  ← LayeredLevelConfig shape + invariants
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code

```text
src/
├── types.ts             — LayeredLevelConfig: add sustainMode field + validator + defaults
├── configStore.ts       — validateConfig: read sustainMode with backward-compat fallback
├── playbackUtils.ts     — NEW: findTextOffsets(), buildWordToSpanMap(), computeBeatMs()
├── App.tsx              — playLayered: rewrite to single-loop shared timeline
│                          play: replace activeDisplayIdx with CharRange highlight state
│                          text overlay render: character-range comparison
├── index.css            — Add .hl-phrase, .hl-sentence, .hl-paragraph underline classes
└── components/
    └── Controls.tsx     — LayeredLevelEditor: add sustainMode Rocker for backdrop levels
```

## Implementation Tasks

### Task 1 — `src/playbackUtils.ts` (new file)
Create the utility module with three pure functions:
- `findTextOffsets(text: string, units: ParseUnit[]): CharRange[]` — locates each unit's text in the original string by walking forward with `text.indexOf`
- `buildWordToSpanMap(wordOffsets: CharRange[], spanOffsets: CharRange[]): number[]` — assigns each word to a span by last-start-≤-word-start matching
- `computeBeatMs(wordUnit: ParseUnit, params: AppParams): number` — returns the inter-beat interval applying `energyToTempo` if enabled

No React, no Web Audio. Fully testable in isolation.

### Task 2 — `src/types.ts`
- Add `sustainMode: 'retrigger' | 'hold'` to `LayeredLevelConfig`
- Update `validateLayeredLevelConfig`: `sustainMode: (llc.sustainMode === 'hold') ? 'hold' : 'retrigger'`
- Update `DEFAULT_LAYERED_PARAMS`: phrase/sentence → `'retrigger'`, paragraph → `'hold'`, word → `'retrigger'`
- Add `CharRange` type alias: `export type CharRange = { start: number; end: number }`

### Task 3 — `src/configStore.ts`
In `validateConfig`, inside the `LAYERED_LEVELS.map` block, add:
```ts
sustainMode: (l['sustainMode'] === 'hold') ? 'hold' : def.sustainMode,
```
This ensures old configs without `sustainMode` load with the correct layer default.

### Task 4 — `src/App.tsx`: rewrite `playLayered`

Replace parallel `setTimeout` loops with a single word-beat step function:

1. Parse all levels: `wordUnits = parseText(text, 'word')`, plus one parse per active non-word layer
2. Pre-compute offsets and span maps: `findTextOffsets` + `buildWordToSpanMap` per active non-word layer
3. Pre-compute span-word counts per layer (for `hold` duration): for each span index, count how many word beats fall in it
4. Track `activeSpanIdx: Partial<Record<LayeredLevel, number>>` initialised to `{}`
5. Step function:
   - Fires word-layer audio if enabled (existing `playLayeredUnit` call)
   - For each active non-word layer:
     - Looks up `newSpanIdx = wordToSpanMaps[level][wordIdx]`
     - **Span transition** (`newSpanIdx !== activeSpanIdx[level]`): fire audio once; if `hold` use `duration = spanWordCounts[level][newSpanIdx] × beatMs / 1000`; update `activeSpanIdx[level]`; update `layeredHighlights[level]`
     - **Same span + retrigger**: fire audio with `duration = beatMs / 1000`
     - **Same span + hold**: no-op (audio is already sustained)
   - Advances `wordIdx`, schedules next step via `setTimeout(step, beatMs)`
6. On completion: clear all state, `setIsPlaying(false)`
7. All timeouts remain in `playbackRef.current` (single ref) — only one timeout is pending at any moment; `stop()` clears it cleanly

### Task 5 — `src/App.tsx`: fix `play()` (single-mode highlighting)

Replace `setActiveDisplayIdx(unit.index * 2)`:
1. Pre-compute `unitOffsets = findTextOffsets(text, units)` before the step loop
2. In `step()`: `setActiveHighlight(unitOffsets[i - 1] ?? null)` (after `i++`)
3. Remove `activeDisplayIdx` state; add `activeHighlight: CharRange | null` state
4. On stop/completion: `setActiveHighlight(null)`

### Task 6 — `src/App.tsx`: update text overlay render

Replace integer-index comparison with character-range overlap:

1. Add `tokenOffsets: CharRange[]` memo alongside `displayTokens`
2. In the overlay `map`: compare each token's `CharRange` against `activeHighlight` (single-mode) or `activeHighlight + layeredHighlights` (layered mode) using inclusive-start / exclusive-end overlap
3. CSS class assignments:
   - `'cur'` if token range falls within `activeHighlight` (same logic as before but range-based)
   - `'past'` if token end ≤ `activeHighlight.start`
   - `'hl-phrase'` / `'hl-sentence'` / `'hl-paragraph'` if token falls within the respective `layeredHighlights` entry (and is not already `'cur'`)

### Task 7 — `src/index.css`: highlight CSS classes

Add three underline classes to the OSC-1 chassis styles:
```css
.hl-phrase    { text-decoration-line: underline; text-decoration-style: solid;  text-decoration-color: var(--amber); text-decoration-thickness: 1px; }
.hl-sentence  { text-decoration-line: underline; text-decoration-style: dashed; text-decoration-color: var(--amber); text-decoration-thickness: 1px; }
.hl-paragraph { text-decoration-line: underline; text-decoration-style: dotted; text-decoration-color: var(--amber); text-decoration-thickness: 1px; }
```
These compose cleanly: a token inside a sentence span that is also inside a paragraph span will show both dashed and dotted underlines (stacked via `text-decoration`).

### Task 8 — `src/components/Controls.tsx`: sustain mode control

In `LayeredLevelEditor`, after the `LedBar` for gain, add for backdrop levels:
```tsx
{isBackdrop && (
  <div>
    <span className="osc-sel-label">sustain mode</span>
    <Rocker
      value={config.sustainMode}
      options={['retrigger', 'hold'] as const}
      onChange={v => set({ sustainMode: v as 'retrigger' | 'hold' })}
    />
  </div>
)}
```

### Task 9 — Integration & manual testing

Run `npm run dev`. Work through the testing checklist in `quickstart.md`:
- Timeline sync (two-sentence, four-layer)
- Sustain retrigger (audible pulse)
- Sustain hold (smooth continuous note)
- Single-mode highlighting: sentence, phrase, paragraph, word
- Layered-mode highlighting: underline styles per enabled layer
- Config export/import backward compatibility

### Task 10 — TypeScript build verification

Run `npm run build`. Confirm zero TypeScript errors. Verify `layered` tab renders without console errors.

## Post-Implementation: Constitution Note

After this feature merges, amend the constitution:
- Close the open question: *"Visualization: how should active units be highlighted in the input text?"*
- Add vocabulary term: **Highlight State** — the per-level active character range used to drive the text overlay during playback.
- Add vocabulary term: **Sustain Mode** — a per-layer setting controlling whether backdrop-level chords re-trigger on each word beat (`retrigger`) or sustain as a single long note for the full span (`hold`).
