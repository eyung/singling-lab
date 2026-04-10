# Module Interface Contracts: Core Instrument

**Branch**: `001-core-instrument` | **Date**: 2026-04-10

These contracts define the public interface of each core module. Implementation
details (internal helpers, private state) are excluded. Any change to a contract
requires re-checking dependent modules and updating this document.

---

## `parser.ts`

### `parseText(text: string, level: ParseLevel): ParseUnit[]`

Segments `text` into an ordered array of ParseUnits at the given level.

| Argument | Type | Constraints |
|---|---|---|
| `text` | string | Any string, including empty |
| `level` | ParseLevel | One of: letter, word, phrase, sentence, paragraph |

**Returns**: `ParseUnit[]`
- Empty array if `text.trim()` is empty.
- Empty array if the level produces no segments (e.g., paragraph on single-line text).
- Each unit has `level`, `text`, `index` (0-based), and `semantic` fields populated.
- Order matches left-to-right reading order of the source text.

**Guarantees**:
- Deterministic: same `text` + `level` → same output every call.
- Non-destructive: `text` argument is never mutated.
- No async operations; no side effects.

---

## `soundEngine.ts`

### `buildSoundParams(unit: ParseUnit, params: AppParams): SoundParams`

Computes the complete audio parameter set for a single ParseUnit given the current
AppParams.

| Argument | Type | Constraints |
|---|---|---|
| `unit` | ParseUnit | Valid ParseUnit with populated `semantic` field |
| `params` | AppParams | Validated AppParams (all ranges correct) |

**Returns**: `SoundParams`
- `frequency` is within [`pitchMin`, `pitchMax`] of the unit's LevelParams.
- `duration` is within [`durationMin`, `durationMax`] of the unit's LevelParams.
- If `params.semantic.sentimentToPitch` is true, `frequency` is blended toward the
  sentiment bias at weight 0.5.
- If `params.semantic.energyToFilterCutoff` is true, `filterCutoff` is derived from
  `unit.semantic.energy` in range [200, 8000] Hz.
- `energyToTempo` does NOT affect SoundParams; it affects inter-event interval only
  (see SoundEngine.playbackInterval).

**Guarantees**:
- Deterministic: same `unit` + `params` → same `SoundParams`.
- No side effects; no audio is produced.

---

### `class SoundEngine`

Manages the Web Audio context and active voice count.

#### `constructor(maxVoices?: number)`

Creates an engine with polyphony limit `maxVoices` (default: 4).

#### `playUnit(sp: SoundParams): void`

Launches a single voice for the given SoundParams.

- If `activeVoices >= maxVoices`: voice is dropped silently (no error).
- Otherwise: creates `OscillatorNode → BiquadFilterNode → GainNode → destination`,
  applies envelope, starts, and schedules stop at `sp.duration`.
- `activeVoices` is incremented on start, decremented via `osc.onended`.

**Side effects**: Produces audio. Increments `activeVoices`.

#### `stop(): void`

Closes the `AudioContext`, nulls the reference, resets `activeVoices` to 0.
Safe to call when already stopped.

#### `updateMaxVoices(n: number): void`

Updates the polyphony limit. Takes effect on the next `playUnit` call.

---

## `types.ts`

### `validateLevelParams(lp: LevelParams): LevelParams`

Returns a new `LevelParams` with all values clamped to valid ranges.

**Rules applied** (in order):
1. `pitchMin` clamped to [20, 20000]
2. `pitchMax` = max(pitchMin + 1, clamp(pitchMax, 20, 20000))
3. `durationMin` clamped to [0.01, 60]
4. `durationMax` = max(durationMin + 0.01, clamp(durationMax, 0.01, 60))
5. `attack` clamped to [0.001, 60]
6. `release` = max(0.001, min(release, durationMin − attack))
7. `filterCutoff` clamped to [20, 20000]
8. `filterQ` clamped to [0.1, 20]
9. `gain` clamped to [0, 1]

**Returns**: A new object; `lp` is not mutated.

---

### `validateAppParams(p: AppParams): AppParams`

Returns a new `AppParams` with global params clamped.

**Rules applied**:
1. `polyphony` = clamp(round(polyphony), 1, 16)
2. `tempo` = clamp(tempo, 50, 5000)

**Returns**: A new object; `p` is not mutated.

---

## `App.tsx` — Playback Loop Contract

The tick loop is the temporal controller of the playback sequence. Its contract:

1. `parseText(text, parseLevel)` is called once at play-time → units snapshot.
2. Each tick:
   a. If unit's level is disabled (`!params.levels[unit.level].enabled`): skip sound, advance index.
   b. Otherwise: call `buildSoundParams(unit, params)` → call `engine.playUnit(sp)`.
   c. Compute interval: `params.tempo × (energyToTempo ? max(0.4, 1 − energy × 0.5) : 1)`.
   d. Schedule next tick at computed interval.
3. Loop ends when all units are consumed or `stop()` is called.
4. `stop()` calls `engine.stop()`, clears the timeout ref, resets UI state.

**Guarantee**: Parameter changes made during playback take effect from the next tick
onward. In-progress voices (already launched) are not interrupted.
