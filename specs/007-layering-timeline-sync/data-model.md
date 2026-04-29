# Data Model: Layering Timeline Sync & Highlighting Fix

**Branch**: `007-layering-timeline-sync` | **Date**: 2026-04-29

## Changed Types

### `LayeredLevelConfig` (in `src/types.ts`)

Adds one field: `sustainMode`.

```ts
// Before
export interface LayeredLevelConfig {
  soundCharacterId: string
  gain: number
  enabled: boolean
}

// After
export interface LayeredLevelConfig {
  soundCharacterId: string
  gain: number
  enabled: boolean
  sustainMode: 'retrigger' | 'hold'   // NEW — phrase/sentence/paragraph only
}
```

**Constraints**:
- `sustainMode` MUST be either `'retrigger'` or `'hold'`; any other value falls back to `'retrigger'`
- The word layer carries this field for type uniformity but it is never read by the playback engine (word tokens always fire once per beat)

**Default values** (in `DEFAULT_LAYERED_PARAMS`):

| Layer | sustainMode default |
|---|---|
| `word` | `'retrigger'` |
| `phrase` | `'retrigger'` |
| `sentence` | `'retrigger'` |
| `paragraph` | `'hold'` |

**Validation** (in `validateLayeredLevelConfig`):
```ts
sustainMode: (llc.sustainMode === 'hold') ? 'hold' : 'retrigger'
```

---

## New Types (runtime only — not persisted)

### `CharRange`

A character offset range within the raw input text string. Used exclusively in App render state; not stored in `AppParams` or `ConfigFile`.

```ts
interface CharRange {
  start: number   // inclusive, 0-indexed character position in text
  end: number     // exclusive
}
```

### `HighlightState`

Per-layer active character range, used to drive the text overlay. Lives in `App` component state.

```ts
type HighlightState = Partial<Record<LayeredLevel | 'current', CharRange>>
// 'current' = the active unit in single-mode playback (replaces activeDisplayIdx)
// LayeredLevel keys = per-layer active spans in layered mode
```

### `WordSpanMaps`

Pre-computed at play-start, mapping each word-beat index to a span index per layer.

```ts
type WordSpanMaps = Partial<Record<LayeredLevel, number[]>>
// wordSpanMaps['sentence'][3] = 1 means word[3] falls in sentence[1]
```

---

## Persistence Contract (`configStore.ts`)

`sustainMode` is a new field in `LayeredLevelConfig`. `validateConfig` must handle both old configs (missing `sustainMode`) and new ones:

```ts
// In validateConfig, inside the layered level loop:
sustainMode: (l['sustainMode'] === 'hold') ? 'hold' : def.sustainMode
// Falls back to DEFAULT_LAYERED_PARAMS[level].sustainMode for old configs
```

**Backward compatibility**: Old exported `.json` configs without `sustainMode` load correctly; each layer defaults to its `DEFAULT_LAYERED_PARAMS.sustainMode` value. No migration needed.

**Forward compatibility**: New configs export `sustainMode` as part of each layered level object. Old app versions (before this feature) that import a new config will silently ignore the unknown field via `validateLayeredLevelConfig`, which only reads known fields.

---

## Text Offset Pre-computation

`displayTokens` is already split on `/(\s+)/` in App. A companion array of character offsets is computed alongside it:

```ts
// Derived from displayTokens and text (memoised)
const tokenOffsets: CharRange[] = useMemo(() => {
  let pos = 0
  return displayTokens.map(t => {
    const start = pos
    pos += t.length
    return { start, end: pos }
  })
}, [displayTokens])
```

`tokenOffsets[i]` gives the `CharRange` of `displayTokens[i]` within the original `text`.

---

## Utility Functions (in `src/playbackUtils.ts`)

### `findTextOffsets(text, units)`

Locates each unit's text inside `text` by walking forward through `text.indexOf`, returning a `CharRange[]` in document order.

```ts
function findTextOffsets(text: string, units: ParseUnit[]): CharRange[]
```

### `buildWordToSpanMap(wordOffsets, spanOffsets)`

For each word offset, finds the index of the last span whose `start ≤ wordOffset.start`.

```ts
function buildWordToSpanMap(wordOffsets: CharRange[], spanOffsets: CharRange[]): number[]
// Returns array of length wordOffsets.length
// buildWordToSpanMap(wordOffsets, sentenceOffsets)[3] = 1 → word[3] is in sentence[1]
```

### `computeBeatMs(wordUnit, params)`

Returns the inter-beat interval in ms for a given word beat, applying the `energyToTempo` modifier if enabled.

```ts
function computeBeatMs(wordUnit: ParseUnit, params: AppParams): number
```
