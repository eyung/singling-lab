# Data Model: Simultaneous Audio Layering

**Feature**: 005-audio-layering
**Date**: 2026-04-20

---

## New Entities

### SoundCharacter

Replaces `InstrumentPreset` for the layered mode catalog. Covers oscillator-based timbres and noise-based environmental sounds.

```typescript
// Source discriminant
type OscillatorSource = {
  source: 'oscillator'
  waveform: OscillatorType           // 'sine' | 'triangle' | 'sawtooth' | 'square'
}

type NoiseSource = {
  source: 'noise'
  noiseColor: 'white' | 'pink'
  noiseFilterType: BiquadFilterType  // 'lowpass' | 'bandpass' | 'notch'
  noiseFilterFreq: number            // Hz — frequency for the noise-shaping filter
}

interface SoundCharacter {
  id: string
  name: string
  category: 'synthesis' | 'nature' | 'city' | 'environment'
  percussive: boolean                // true = excluded from backdrop levels in layered mode
  attack: number                     // seconds
  release: number                    // seconds
  filterCutoff: number               // Hz — primary lowpass cutoff (all sources)
  filterQ: number
  gain: number                       // 0–1 — base gain (overridden by LayeredLevelConfig.gain)
}
// SoundCharacter = (OscillatorSource | NoiseSource) & SoundCharacterBase
```

**Validation rules**:
- `attack` ∈ [0.001, 60]
- `release` ∈ [0.001, 60]
- `filterCutoff` ∈ [20, 20000]
- `filterQ` ∈ [0.1, 20]
- `gain` ∈ [0, 1]
- If `percussive === true`, the character MUST NOT appear in backdrop level selectors

**Catalog size**: 12 synthesis (existing) + 12 environmental (new) = 24 total

---

### LayeredLevelConfig

Per-level configuration for layered playback mode. One instance per `LayeredLevel`.

```typescript
type LayeredLevel = 'word' | 'phrase' | 'sentence' | 'paragraph'

interface LayeredLevelConfig {
  soundCharacterId: string   // must reference a valid SoundCharacter.id
  gain: number               // 0–1; default enforced by gain hierarchy
  enabled: boolean           // whether this level participates in layered playback
}
```

**Validation rules**:
- `soundCharacterId` MUST exist in `SOUND_CHARACTERS` catalog
- For backdrop levels (phrase, sentence, paragraph): `soundCharacterId` MUST reference a `SoundCharacter` with `percussive === false`
- `gain` ∈ [0, 1]

**Default values**:

| Level | soundCharacterId | gain | enabled |
|-------|-----------------|------|---------|
| word | `pluck` | 0.70 | true |
| phrase | `pad` | 0.42 | true |
| sentence | `strings` | 0.22 | true |
| paragraph | `ocean` | 0.10 | true |

---

### AppParams (extended)

Two new fields added to the existing `AppParams` interface.

```typescript
// New addition to AppParams:
interface AppParams {
  // ... all existing fields preserved ...
  mode: 'single' | 'layered'                         // new
  layered: Record<LayeredLevel, LayeredLevelConfig>   // new
}
```

**Default values**:
- `mode`: `'single'` (backward compatible — existing configs without this field default to single)
- `layered`: uses `DEFAULT_LAYERED_PARAMS` (see below)

```typescript
const DEFAULT_LAYERED_PARAMS: Record<LayeredLevel, LayeredLevelConfig> = {
  word:      { soundCharacterId: 'pluck',   gain: 0.70, enabled: true },
  phrase:    { soundCharacterId: 'pad',     gain: 0.42, enabled: true },
  sentence:  { soundCharacterId: 'strings', gain: 0.22, enabled: true },
  paragraph: { soundCharacterId: 'ocean',   gain: 0.10, enabled: true },
}
```

---

### LayeredSoundParams (runtime only — not persisted)

Extended version of `SoundParams` used during layered playback. Carries the layer source for rendering decisions.

```typescript
interface LayeredSoundParams extends SoundParams {
  soundCharacterId: string  // which SoundCharacter to render with
  layerGain: number         // gain from LayeredLevelConfig (applied as master gain per layer)
}
```

---

## Modified Entities

### AppParams

Changes to `src/types.ts`:
- Add `mode: 'single' | 'layered'` with default `'single'`
- Add `layered: Record<LayeredLevel, LayeredLevelConfig>` with `DEFAULT_LAYERED_PARAMS`
- Add `validateLayeredLevelConfig(llc: LayeredLevelConfig): LayeredLevelConfig` validation function

### InstrumentPreset (unchanged)

Remains in `types.ts` for backward compatibility with the single-level instrument selector (`Controls.tsx` Global section). The new `SoundCharacter` catalog is used only for layered mode.

---

## Relationships

```
AppParams
  ├── mode: 'single' | 'layered'
  ├── layered: Record<LayeredLevel, LayeredLevelConfig>
  │     └── LayeredLevelConfig.soundCharacterId → SoundCharacter
  └── levels: Record<ParseLevel, LevelParams>   [unchanged]

SoundCharacter
  ├── OscillatorSource: uses OscillatorNode in SoundEngine
  └── NoiseSource: uses AudioBufferSourceNode + noise buffer in SoundEngine

LayeredLevelConfig
  └── references SoundCharacter (by id)
```

---

## ConfigFile Compatibility

The `ConfigFile` format (`validateConfig` in `configStore.ts`) must be extended to read and validate the new `mode` and `layered` fields. Missing fields fall back to defaults (backward compatibility with pre-005 config files).

---

## SOUND_CHARACTERS Catalog (in `src/soundEngine.ts` or new `src/soundCharacters.ts`)

| id | name | category | percussive | source | notes |
|----|------|----------|------------|--------|-------|
| default | Default | synthesis | false | oscillator | existing |
| piano | Piano | synthesis | false | oscillator | existing |
| organ | Organ | synthesis | false | oscillator | existing |
| strings | Strings | synthesis | false | oscillator | existing |
| brass | Brass | synthesis | false | oscillator | existing |
| flute | Flute | synthesis | false | oscillator | existing |
| bass | Bass | synthesis | false | oscillator | existing |
| pluck | Pluck | synthesis | false | oscillator | existing |
| pad | Pad | synthesis | false | oscillator | existing |
| bell | Bell | synthesis | false | oscillator | existing |
| choir | Choir | synthesis | false | oscillator | existing |
| lead | Synth Lead | synthesis | false | oscillator | existing |
| rain | Rain | nature | false | noise | white, LP <600Hz |
| wind | Wind | nature | false | noise | pink, BP 100–400Hz |
| forest | Forest | nature | false | noise | pink, LP <300Hz |
| ocean | Ocean | nature | false | noise | pink, LP <200Hz, very long attack |
| campfire | Campfire | nature | false | noise | white, LP <500Hz |
| city-hum | City Hum | city | false | noise | white, BP 200–1200Hz |
| traffic | Traffic | city | false | noise | pink, BP 80–500Hz |
| cave | Cave | environment | false | noise | pink, BP 60–300Hz |
| underwater | Underwater | environment | false | noise | white, LP <200Hz |
| thunder | Thunder | environment | false | noise | white, LP <150Hz, long attack |
| machinery | Machinery | environment | false | noise | white, notch 400–800Hz |
| space | Space | environment | false | noise | pink, LP <100Hz |
