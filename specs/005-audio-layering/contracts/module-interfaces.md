# Module Interface Contracts: Simultaneous Audio Layering

**Feature**: 005-audio-layering
**Date**: 2026-04-20

---

## Contract 1: `src/soundCharacters.ts` (new module)

### Exports

```typescript
// Full catalog of SoundCharacter definitions (24 entries)
export const SOUND_CHARACTERS: readonly SoundCharacter[]

// Lookup a SoundCharacter by id; returns undefined if not found
export function getSoundCharacter(id: string): SoundCharacter | undefined

// Return all sound characters valid for a backdrop level (percussive === false)
export function getBackdropCharacters(): SoundCharacter[]

// Return all sound characters (no restriction — for word level)
export function getAllCharacters(): SoundCharacter[]
```

### Invariants
- `SOUND_CHARACTERS` contains exactly all 12 synthesis presets (matching `INSTRUMENT_PRESETS` by id) plus 12 environmental entries
- All environmental entries have `percussive === false`
- All entries have unique `id` values
- `getSoundCharacter` never throws; returns `undefined` for unknown ids

---

## Contract 2: `src/types.ts` additions

### New exported types

```typescript
export type LayeredLevel = 'word' | 'phrase' | 'sentence' | 'paragraph'

export interface SoundCharacter {
  id: string
  name: string
  category: 'synthesis' | 'nature' | 'city' | 'environment'
  percussive: boolean
  attack: number
  release: number
  filterCutoff: number
  filterQ: number
  gain: number
  source: 'oscillator' | 'noise'
  // oscillator-only:
  waveform?: OscillatorType
  // noise-only:
  noiseColor?: 'white' | 'pink'
  noiseFilterType?: BiquadFilterType
  noiseFilterFreq?: number
}

export interface LayeredLevelConfig {
  soundCharacterId: string
  gain: number
  enabled: boolean
}

export const DEFAULT_LAYERED_PARAMS: Record<LayeredLevel, LayeredLevelConfig>

export const LAYERED_LEVELS: readonly LayeredLevel[]
```

### Modified `AppParams`

```typescript
export interface AppParams {
  parseLevel: ParseLevel           // unchanged
  levels: Record<ParseLevel, LevelParams>  // unchanged
  semantic: SemanticParams         // unchanged
  polyphony: number                // unchanged
  tempo: number                    // unchanged
  instrument: string               // unchanged
  mode: 'single' | 'layered'      // NEW — default 'single'
  layered: Record<LayeredLevel, LayeredLevelConfig>  // NEW
}
```

### New validation function

```typescript
// Validates a LayeredLevelConfig; clamps gain, validates soundCharacterId
// For backdrop levels (identified by level parameter), enforces percussive === false
export function validateLayeredLevelConfig(
  llc: LayeredLevelConfig,
  level: LayeredLevel
): LayeredLevelConfig
```

### Invariants
- `validateLayeredLevelConfig` never throws
- `validateAppParams` is extended to call `validateLayeredLevelConfig` for each layer
- Default `mode` is `'single'` for backward compatibility
- `DEFAULT_PARAMS.mode === 'single'`
- `DEFAULT_PARAMS.layered === DEFAULT_LAYERED_PARAMS`

---

## Contract 3: `src/soundEngine.ts` — extended `SoundEngine`

### New methods

```typescript
// Render a LayeredSoundParams, honouring the SoundCharacter.source discriminant.
// For 'oscillator': current behaviour (OscillatorNode).
// For 'noise': AudioBufferSourceNode with pre-generated noise buffer.
// Returns void; never throws; drops if polyphony exceeded.
playLayeredUnit(sp: LayeredSoundParams, char: SoundCharacter): void

// Stop all active voices (existing — no change needed, called per layer on stop)
stop(): void
```

### Noise generation contract

```typescript
// Generate a noise buffer of given duration at the context's sample rate.
// noiseColor 'white' → Math.random() * 2 - 1 per sample.
// noiseColor 'pink' → Voss-McCartney approximation (no external library).
// Returns: AudioBuffer
function generateNoiseBuffer(
  ctx: AudioContext,
  duration: number,
  noiseColor: 'white' | 'pink'
): AudioBuffer
```

### Master compressor

The `SoundEngine` constructor adds a `DynamicsCompressorNode` between all GainNodes and `ctx.destination` when in layered mode. This node:
- threshold: −3 dBFS
- ratio: 4:1
- attack: 3 ms
- release: 250 ms

The compressor node is created once on first `playLayeredUnit` call and reused until `stop()`.

### Pitch quantisation contract

```typescript
// Quantise a frequency to the nearest C-major note across octaves C2–C6.
// Only called when in layered mode.
// Returns the nearest C-major frequency in Hz.
export function quantiseToCMajor(frequency: number): number
```

### Invariants
- `playLayeredUnit` drops silently if `activeVoices >= maxVoices` (Rule 4 unchanged)
- `generateNoiseBuffer` is deterministic for a given `(duration, noiseColor)` tuple
- `quantiseToCMajor(261.63)` returns `261.63` (C4 exactly)
- `quantiseToCMajor(300)` returns `293.66` (D4, nearest)

---

## Contract 4: `src/App.tsx` — layered playback loop

### `playLayered()` function

```typescript
// Called when mode === 'layered' and user clicks Play.
// Starts 4 independent setTimeout loops, one per enabled LayeredLevel.
// All loops start simultaneously.
function playLayered(): void
```

**Behaviour**:
1. Parse text at all 4 layered levels: `parseText(text, 'word')`, `parseText(text, 'phrase')`, `parseText(text, 'sentence')`, `parseText(text, 'paragraph')`
2. If all 4 produce empty unit arrays → return without starting (no sound)
3. For each enabled level with at least one unit, start an independent tick loop
4. Each tick loop:
   a. Gets the current unit for this level
   b. Builds `SoundParams` via `buildSoundParams(unit, params)`
   c. Quantises frequency via `quantiseToCMajor(sp.frequency)`
   d. Applies layer gain from `params.layered[level].gain`
   e. Calls `engine.playLayeredUnit(sp, getSoundCharacter(params.layered[level].soundCharacterId))`
   f. Schedules next tick at `params.tempo`
5. `isPlaying` is set to `true` once all loops are started; set to `false` when all loops complete
6. `stop()` clears all active timeout refs and calls `engine.stop()`

### `activeUnit` state in layered mode

In layered mode, `activeUnit` displays the current **word** level unit (most foreground). Other levels do not contribute to `activeUnit` display.

---

## Contract 5: `src/components/Controls.tsx` — Layered Levels section

### New UI section: "Layered Levels"

Rendered only when `params.mode === 'layered'`. Appears between "Global" and "Semantic" sections.

For each of `['word', 'phrase', 'sentence', 'paragraph']`:
```
[level name]
  [enabled checkbox]
  [SoundCharacter selector — filtered by backdrop constraint for non-word levels]
  [gain slider: 0–1, step 0.01]
```

### Mode toggle

Rendered in the "Global" section, between the instrument selector and tempo slider.

```
mode:  [single]  [layered]     ← two buttons, active one highlighted
```

### Invariants
- Backdrop character selectors only show `SoundCharacter` entries with `percussive === false`
- Word character selector shows all `SoundCharacter` entries
- Gain slider changes call `validateLayeredLevelConfig` on update
- Mode toggle updates `params.mode`; persists via existing `saveToStorage`

---

## Contract 6: `src/configStore.ts` — backward-compatible validation extension

### `validateConfig` additions

The existing `validateConfig(raw: unknown): AppParams | null` function must be extended:
- Read `raw.params.mode`: if present and `=== 'layered'`, use `'layered'`; otherwise default to `'single'`
- Read `raw.params.layered`: if present, validate each `LayeredLevelConfig` via `validateLayeredLevelConfig`; missing layers fall back to `DEFAULT_LAYERED_PARAMS[level]`
- Pre-005 config files (without `mode` or `layered`) load without error and use defaults

### Invariants
- Any valid pre-005 config file MUST still load successfully after this change
- `validateConfig` never throws

---

## Summary of New/Modified Files

| File | Type | Summary |
|------|------|---------|
| `src/soundCharacters.ts` | NEW | 24-entry SoundCharacter catalog + helpers |
| `src/types.ts` | MODIFY | Add LayeredLevel, SoundCharacter, LayeredLevelConfig, AppParams fields |
| `src/soundEngine.ts` | MODIFY | Add noise rendering, compressor, quantisation, playLayeredUnit |
| `src/App.tsx` | MODIFY | Mode toggle state, playLayered(), multi-loop playback |
| `src/components/Controls.tsx` | MODIFY | Mode toggle UI, Layered Levels section |
| `src/configStore.ts` | MODIFY | Validate new AppParams fields, backward-compat defaults |
