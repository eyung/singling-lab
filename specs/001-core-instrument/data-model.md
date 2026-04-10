# Data Model: Core Instrument

**Branch**: `001-core-instrument` | **Date**: 2026-04-10

---

## Entities

### Text (input)

The raw written input. Captured as a snapshot at play-time. Never mutated.

| Field | Type | Constraints |
|---|---|---|
| `value` | string | Any Unicode text; empty string is valid |

**State transitions**: Text is read at play-time into a local `units` array.
The `value` in state is never modified by the playback engine.

---

### ParseLevel

The active granularity at which text is segmented.

| Value | Segment Definition |
|---|---|
| `letter` | Single non-whitespace character |
| `word` | Contiguous `\w+` sequence |
| `phrase` | Sub-sentence: punctuation (`,;:—–`) or conjunction boundary |
| `sentence` | Full grammatical sentence (via `compromise`) |
| `paragraph` | Block separated by `\n{2,}` |

**Constraint**: Exactly one level is active at a time.

---

### ParseUnit

A single segment produced by parsing Text at a given ParseLevel.
The atomic trigger of a Sound Event.

| Field | Type | Constraints |
|---|---|---|
| `level` | ParseLevel | One of the five levels |
| `text` | string | Non-empty string |
| `index` | number | Position in the ordered sequence (0-based) |
| `semantic` | SemanticSignal | Derived, not user-supplied |

---

### SemanticSignal

Derived properties of a ParseUnit's text content.

| Field | Type | Range | Source |
|---|---|---|---|
| `sentiment` | number | –1.0 to 1.0 | Word-level lexicon + negation detection via `compromise` |
| `energy` | number | 0.0 to 1.0 | High-energy word lexicon + text length heuristic |
| `tags` | string[] | subset of: noun, verb, adjective, question, negative | POS tags via `compromise` |

**Validation**: Values are clamped to range on derivation; they never exceed bounds.

---

### SoundParams

The complete set of audio parameters defining a single Sound Event.
Computed from a ParseUnit + LevelParams + SemanticParams. Immutable once computed.

| Field | Type | Range | Description |
|---|---|---|---|
| `frequency` | number (Hz) | 20–20000 | Fundamental pitch |
| `waveform` | OscillatorType | sine, triangle, sawtooth, square | Spectral character |
| `duration` | number (s) | 0.01–∞ | Total voice lifespan |
| `attack` | number (s) | 0.001–∞ | Time to peak gain |
| `release` | number (s) | 0.001–∞ | Time from peak to silence |
| `filterCutoff` | number (Hz) | 20–20000 | Lowpass filter corner frequency |
| `filterQ` | number | 0.1–20 | Filter resonance |
| `gain` | number | 0–1 | Peak amplitude |
| `detune` | number (cents) | any | Fine pitch offset |

**Invariant**: `attack + release ≤ duration` (enforced by clamping release at
computation time if LevelParams are invalid).

---

### LevelParams

User-configurable parameters governing the Mapping for one ParseLevel.
Stored per-level in AppParams.

| Field | Type | Constraints |
|---|---|---|
| `enabled` | boolean | If false, level produces no sound |
| `pitchMin` | number (Hz) | 20–20000; MUST be < pitchMax |
| `pitchMax` | number (Hz) | 20–20000; MUST be > pitchMin |
| `durationMin` | number (s) | 0.01–60; MUST be < durationMax |
| `durationMax` | number (s) | 0.01–60; MUST be > durationMin |
| `attack` | number (s) | 0.001–60 |
| `release` | number (s) | 0.001–60; clamped so attack+release ≤ durationMin |
| `waveform` | OscillatorType | sine, triangle, sawtooth, square |
| `filterCutoff` | number (Hz) | 20–20000 |
| `filterQ` | number | 0.1–20 |
| `gain` | number | 0–1 |

**Validation**: Applied on every user change via `validateLevelParams()`.
Invalid states are corrected silently; they are never persisted.

---

### SemanticParams

User-toggleable semantic override switches. Global (not per-level).

| Field | Type | Effect when true |
|---|---|---|
| `sentimentToPitch` | boolean | Blends pitch toward range top (positive) / bottom (negative) |
| `energyToFilterCutoff` | boolean | Maps energy to filter cutoff (high energy → open filter) |
| `energyToTempo` | boolean | Scales inter-event interval by energy (high energy → shorter) |

---

### AppParams

The complete user parameter state. Single source of truth for all controls.

| Field | Type | Constraints |
|---|---|---|
| `parseLevel` | ParseLevel | One of five levels |
| `levels` | Record<ParseLevel, LevelParams> | One LevelParams per level |
| `semantic` | SemanticParams | Three override toggles |
| `polyphony` | number | Integer in [1, 16] |
| `tempo` | number (ms) | [50, 5000] |

**Validation**: `validateAppParams()` applied on global param changes.

---

## Relationships

```
AppParams
  └── levels: Record<ParseLevel, LevelParams>   (5 entries, one per level)
  └── semantic: SemanticParams

Text ──[parsed by]-→ ParseUnit[]
  ParseUnit
    └── semantic: SemanticSignal

ParseUnit + LevelParams + SemanticParams ──[mapped to]-→ SoundParams
SoundParams ──[rendered as]-→ Voice (Web Audio chain)
```

---

## State Transitions

```
IDLE
  → [user types text] → IDLE (text updated)
  → [user presses play, text non-empty] → PLAYING

PLAYING
  → [all units consumed] → IDLE
  → [user presses stop] → IDLE
  → [each tick] → PLAYING (next unit, or silent if level disabled)

PLAYING (voice)
  → [playUnit called, voices < polyphony] → voice active
  → [playUnit called, voices = polyphony] → dropped (no state change)
  → [osc.onended] → voice count decremented
```
