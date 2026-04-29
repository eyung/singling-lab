# Quickstart: Layering Timeline Sync & Highlighting Fix

**Branch**: `007-layering-timeline-sync` | **Date**: 2026-04-29

## What This Feature Changes

Three independent bugs are fixed in this feature, all in the playback and display logic. The data model gains one new field (`sustainMode`). No new components are added.

| Area | File(s) changed | Nature of change |
|---|---|---|
| Data model | `src/types.ts` | Add `sustainMode` to `LayeredLevelConfig`; update validator + defaults |
| Config persistence | `src/configStore.ts` | Read `sustainMode` with backward-compat fallback |
| Playback engine | `src/App.tsx` | Rewrite `playLayered`; fix `play` highlight logic |
| Highlighting | `src/App.tsx`, `src/index.css` | Character-range state replaces integer index; add underline CSS |
| Layered tab UI | `src/components/Controls.tsx` | Add sustain mode `Rocker` to backdrop level editors |
| Utilities | `src/playbackUtils.ts` | New file: offset and span mapping helpers |

---

## Step-by-Step Implementation Order

### Step 1 — New utility file

Create `src/playbackUtils.ts`. This file has no dependencies on React or Web Audio and can be written and unit-verified first.

Three exports are needed:

**`findTextOffsets(text, units)`**  
Walk forward through `text` using `text.indexOf(unit.text, searchFrom)` for each unit. Return `CharRange[]` (same length as `units`). If a unit's text is not found, record `{ start: searchFrom, end: searchFrom }` and do not advance `searchFrom`.

**`buildWordToSpanMap(wordOffsets, spanOffsets)`**  
For each `wordOffset`, find the last `spanOffset` where `spanOffset.start <= wordOffset.start`. Return `number[]`. Handle edge cases: if `spanOffsets` is empty, return array of zeros.

**`computeBeatMs(wordUnit, params)`**  
`return params.tempo * (params.semantic.energyToTempo ? Math.max(0.4, 1 - wordUnit.semantic.energy * 0.5) : 1)`  
This mirrors the existing tempo formula in `play()` and `playLayered()`.

---

### Step 2 — Update `types.ts`

Add `sustainMode: 'retrigger' | 'hold'` to `LayeredLevelConfig`.

Update `validateLayeredLevelConfig`:
```ts
sustainMode: (llc.sustainMode === 'hold') ? 'hold' : 'retrigger'
```

Update `DEFAULT_LAYERED_PARAMS`:
```ts
word:      { ..., sustainMode: 'retrigger' },
phrase:    { ..., sustainMode: 'retrigger' },
sentence:  { ..., sustainMode: 'retrigger' },
paragraph: { ..., sustainMode: 'hold'      },
```

---

### Step 3 — Update `configStore.ts`

Inside `validateConfig`, in the `LAYERED_LEVELS.map` block, add:
```ts
sustainMode: (l['sustainMode'] === 'hold') ? 'hold' : def.sustainMode,
```
after the existing `enabled` field read.

---

### Step 4 — Rewrite `playLayered` in `App.tsx`

Replace the current parallel-loop implementation with a single word-beat step function. The new implementation:

1. Parse word units: `const wordUnits = parseText(text, 'word')`
2. For each active non-word layer, parse at that level
3. Call `findTextOffsets` and `buildWordToSpanMap` for each active non-word layer
4. Track `activeSpanIdx: Partial<Record<LayeredLevel, number>>` — which span each layer is currently in
5. Step function iterates `wordIdx` from 0 to `wordUnits.length - 1`:
   - Compute `beatMs = computeBeatMs(wordUnit, params)`
   - Fire word layer audio if enabled
   - For each non-word layer:
     - Determine `newSpanIdx = wordToSpanMap[level][wordIdx]`
     - If `newSpanIdx !== activeSpanIdx[level]` (span transition):
       - Fire audio (hold: `duration = remaining beats in span × beatMs / 1000`; retrigger: `duration = beatMs / 1000`)
       - Update `activeSpanIdx[level] = newSpanIdx`
       - Update highlight state for this layer
     - Else if same span and `sustainMode === 'retrigger'`:
       - Fire audio with `duration = beatMs / 1000`
   - Schedule next step with `setTimeout(step, beatMs)`
6. On last beat: clear all state, `setIsPlaying(false)`

For `hold` duration: compute `spanWordCount` as the number of consecutive word beats in this span:
```ts
const spanWordCount = wordToSpanMap.filter(si => si === newSpanIdx).length
// Or more efficiently: count from wordIdx forward until span changes
```

---

### Step 5 — Fix `play()` highlight in `App.tsx`

Replace `setActiveDisplayIdx(unit.index * 2)` with a character-range update:

```ts
// Pre-compute unit offsets once before the play loop (or lazily)
const unitOffsets = findTextOffsets(text, units)
// In step():
const range = unitOffsets[i - 1]   // after increment
setActiveHighlight(range)           // CharRange | null
```

Remove `activeDisplayIdx` state. Add `activeHighlight: CharRange | null` state.

---

### Step 6 — Update text overlay render in `App.tsx`

Replace the current `activeDisplayIdx` integer comparison with character-range overlap detection:

```tsx
// Pre-compute token offsets (memoised)
const tokenOffsets = useMemo(() => {
  let pos = 0
  return displayTokens.map(t => ({ start: pos, end: (pos += t.length) - t.length + t.length }))
}, [displayTokens])

// In the overlay render:
{displayTokens.map((t, i) => {
  const { start, end } = tokenOffsets[i]!
  const isCur = activeHighlight && start >= activeHighlight.start && end <= activeHighlight.end
  const isPast = activeHighlight && end <= activeHighlight.start
  const inPhrase = layeredHighlights.phrase && start >= layeredHighlights.phrase.start && end <= layeredHighlights.phrase.end
  const inSentence = layeredHighlights.sentence && start >= layeredHighlights.sentence.start && end <= layeredHighlights.sentence.end
  const inParagraph = layeredHighlights.paragraph && start >= layeredHighlights.paragraph.start && end <= layeredHighlights.paragraph.end
  return (
    <span
      key={i}
      className={[
        isCur ? 'cur' : isPast ? 'past' : '',
        !isCur && inPhrase ? 'hl-phrase' : '',
        !isCur && inSentence ? 'hl-sentence' : '',
        !isCur && inParagraph ? 'hl-paragraph' : '',
      ].filter(Boolean).join(' ')}
    >{t}</span>
  )
})}
```

Add `layeredHighlights: Partial<Record<LayeredLevel, CharRange | null>>` state to App (used in layered mode only; cleared on stop).

---

### Step 7 — Add CSS underline classes to `src/index.css`

```css
.hl-phrase    { text-decoration-line: underline; text-decoration-style: solid;  text-decoration-color: var(--amber); text-decoration-thickness: 1px; }
.hl-sentence  { text-decoration-line: underline; text-decoration-style: dashed; text-decoration-color: var(--amber); text-decoration-thickness: 1px; }
.hl-paragraph { text-decoration-line: underline; text-decoration-style: dotted; text-decoration-color: var(--amber); text-decoration-thickness: 1px; }
```

---

### Step 8 — Add `sustainMode` control to `LayeredLevelEditor` in `Controls.tsx`

Inside the `LayeredLevelEditor` component, after the gain `LedBar`, add for backdrop levels:

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

Update `validateLayeredLevelConfig` call in `set` — already covered by Step 2.

---

## Testing Checklist

Manual testing — run `npm run dev` and verify:

**Timeline sync**
- [ ] Two-sentence text, word + sentence layers: both finish at the same time
- [ ] All four layers active: no layer finishes early or late

**Chord sustain — retrigger**
- [ ] Sentence layer, retrigger mode: audible pulsing at word tempo through each sentence
- [ ] Phrase layer, retrigger: chord re-fires on each word beat within the phrase

**Chord sustain — hold**
- [ ] Paragraph layer (default hold): smooth continuous note for the full paragraph
- [ ] Switch sentence to hold: smooth note through full sentence

**Single-mode highlighting**
- [ ] Parse level = sentence: sentences highlight in sequence; past sentences dim
- [ ] Parse level = phrase: phrases highlight in sequence
- [ ] Parse level = paragraph: full paragraph highlights
- [ ] Parse level = word: unchanged (regression test)

**Layered-mode highlighting**
- [ ] Word + sentence active: word gets phosphor-green fill; sentence span gets dashed amber underline
- [ ] All four active: three distinct underline styles visible simultaneously
- [ ] Disable phrase layer: phrase underline absent; sentence + paragraph remain

**Config persistence**
- [ ] Export config, reload page (restores `sustainMode` per layer)
- [ ] Import old config (pre-007): loads without error; defaults applied for `sustainMode`
