# Research: Layering Timeline Sync & Highlighting Fix

**Branch**: `007-layering-timeline-sync` | **Date**: 2026-04-29

## Decision 1 — Shared Timeline Driver

**Decision**: Word-level tokens drive the shared timeline. One `setTimeout` chain iterates word beats; all other layers are scheduled as side-effects of the same step function.

**Rationale**: The current `playLayered` spawns an independent `setTimeout` loop per layer, each advancing at the same `params.tempo` interval. A sentence layer with 2 tokens finishes in `2×tempo` ms while a word layer with 10 tokens takes `10×tempo` ms. Collapsing to a single loop driven by word beats eliminates the desync entirely — all layers are computed within the same JS task on each beat.

**Alternatives considered**:
- *Pre-computed absolute schedule with `AudioContext.currentTime`*: Schedule every audio event as `ctx.currentTime + offset` at play-start, eliminating `setTimeout` entirely. More accurate for audio but doesn't integrate cleanly with React highlight state (which must update via `setState` on each beat). Deferred as a future performance improvement.
- *Keep separate loops but synchronise via a shared counter*: Fragile — JS timer drift compounds and the approach doesn't solve sustain.

---

## Decision 2 — Word-to-Span Mapping via Character Offsets

**Decision**: Map each word token to its containing higher-level span by finding the character offset of every token in the original text string, then assigning each word to the last span whose start ≤ the word's start.

**Rationale**: `ParseUnit` carries `.text` and `.index` (position in its own level's sequence) but no character offsets. The only reliable way to map word tokens to sentence/phrase/paragraph tokens is to locate each token's text inside the original string. Walking forward through `text.indexOf(token.text, searchFrom)` is O(n) and correct as long as tokens appear in document order (which the parser guarantees).

**Alternatives considered**:
- *Containment check (`sentenceText.includes(wordText)`)*: Fails when the same word appears in multiple sentences.
- *Augmenting `ParseUnit` with `charStart`/`charEnd`*: Cleaner long-term but requires changing the parser and the `ParseUnit` type — a broader change than this fix warrants.

---

## Decision 3 — Character-Range Highlighting

**Decision**: Replace the `activeDisplayIdx: number` integer with a `CharRange = { start: number; end: number }` per active layer. The text overlay pre-computes the character offset of each whitespace-split display token; a token is highlighted if its range overlaps the active `CharRange` for any enabled layer.

**Rationale**: The current integer index (`unit.index * 2`) only works for word-level parsing where words interleave with whitespace tokens in the `displayTokens` array. For sentence-level parsing, `unit.index` is the sentence count (0, 1, 2…) which has no relationship to whitespace-split token positions. Character ranges are level-agnostic and work identically for word, phrase, sentence, and paragraph.

**Alternatives considered**:
- *Keep integer index, add a level-aware offset multiplier*: The required multiplier is not constant — a sentence spans a variable number of whitespace-split tokens. Not feasible without character offsets.
- *Replace `displayTokens.split` with a structured token array carrying offsets from the parser*: Correct, but changes the parser interface and is more work than pre-computing offsets from the existing split.

---

## Decision 4 — Hold Mode Implementation

**Decision**: For `sustainMode: 'hold'`, override `SoundParams.duration` to the full span duration (`spanWordCount × beatMs / 1000 s`) immediately after calling `buildSoundParams()`, then call `playLayeredUnit` once. No new `SoundEngine` methods are needed.

**Rationale**: `SoundEngine.playLayeredUnit` already schedules a Web Audio gain envelope over `sp.duration` seconds. Setting a longer duration before the call is all that is needed for a held note. The oscillator/buffer-source stops automatically at `now + sp.duration`.

**Alternatives considered**:
- *Open an oscillator node, keep a reference, close it at span end*: Requires node lifecycle tracking across beats, significantly complicating `SoundEngine`. Rejected for complexity.
- *Loop a short buffer*: Only applicable to noise sources; oscillators don't benefit. Inconsistent behaviour across sound characters.

---

## Decision 5 — Sustain Mode UI Control

**Decision**: Add a two-option `Rocker` component labelled `retrigger | hold` inside `LayeredLevelEditor` for backdrop levels (phrase, sentence, paragraph). The word layer does not show this control.

**Rationale**: A `Rocker` is already used for mode and parse-level selection; it matches the OSC-1 hardware aesthetic and is compact enough to fit inside the accordion body alongside the existing gain and sound-character controls.

**Alternatives considered**:
- *`Toggle` switch (on = hold, off = retrigger)*: Less readable — requires labelling one state as "on" which is ambiguous.
- *`<select>` dropdown*: Heavier than needed for a binary choice.

---

## Constitution Observation

The constitution's Open Questions list includes: *"Visualization: how should active units be highlighted in the input text?"* — this feature resolves that question by implementing character-range-based span highlighting with the per-level underline convention (solid amber = phrase, dashed = sentence, dotted = paragraph). A constitution amendment should follow implementation to close the open question and document the canonical highlighting approach in the vocabulary.
