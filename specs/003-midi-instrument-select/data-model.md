# Data Model: MIDI Instrument Selector

**Branch**: `003-midi-instrument-select` | **Date**: 2026-04-13

This document covers only the additions and changes introduced by this feature.
For the full baseline data model, see `specs/001-core-instrument/data-model.md`.

---

## New Entity: InstrumentPreset

A named, statically defined set of oscillator timbre parameters. Presets are
immutable constants — they are never modified by user interaction after definition.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Unique lowercase identifier (e.g., `'piano'`) |
| `name` | string | Display name shown in the UI (e.g., `'Piano'`) |
| `waveform` | OscillatorType | One of: sine, triangle, sawtooth, square |
| `filterCutoff` | number (Hz) | [20, 20000] |
| `filterQ` | number | [0.1, 20] |
| `attack` | number (s) | [0.001, 60] |
| `release` | number (s) | [0.001, 60] |
| `gain` | number | [0, 1] |

**Read-only**: The preset catalog (`INSTRUMENT_PRESETS`) is a static `readonly` array
defined in `instruments.ts`. No runtime mutation.

**Validation**: All preset values are authored to be valid LevelParams fields and require
no runtime clamping. `attack + release` is ≤ 0.6s for all presets, well within
the default `durationMin` of 0.1s after accounting for the fact that validation will
clamp release to `durationMin - attack` per existing rules.

> **Implementation note**: When applying a preset, `validateLevelParams()` is called
> after merging, so any edge-case violations are caught. Presets are authored to pass.

---

## Modified Entity: AppParams

One new field is added to `AppParams`. All existing fields are unchanged.

| Field | Type | Constraints | Change |
|---|---|---|---|
| `instrument` | string | Must match an `InstrumentPreset.id`, or `'default'` | **NEW** |
| `parseLevel` | ParseLevel | (unchanged) | — |
| `levels` | Record<ParseLevel, LevelParams> | (unchanged) | — |
| `semantic` | SemanticParams | (unchanged) | — |
| `polyphony` | number | (unchanged) | — |
| `tempo` | number (ms) | (unchanged) | — |

**Semantics of `instrument`**:
- Tracks the ID of the last-applied preset.
- Is not validated against the preset catalog at runtime (it is a label, not a driver of synthesis).
- `validateAppParams()` does not need to inspect this field.
- Default value: `'default'` (matching `InstrumentPreset.id = 'default'`).

---

## Modified Entity: DEFAULT_PARAMS

`DEFAULT_PARAMS` gains the new field:

```
instrument: 'default'
```

All level defaults remain unchanged. The `'default'` preset encodes the same
waveform/filter/envelope values already present in `DEFAULT_LEVEL_PARAMS`.

---

## Relationships

```
InstrumentPreset[]  (INSTRUMENT_PRESETS — static catalog in instruments.ts)
  └── preset.id, preset.name displayed in Controls.tsx <select>

AppParams
  └── instrument: string    ← tracks last-applied preset ID (label only)
  └── levels: Record<ParseLevel, LevelParams>
        ← preset values written here on instrument selection

Instrument selection:
  User picks preset →
    Controls.tsx reads INSTRUMENT_PRESETS.find(id) →
    For each ParseLevel: merge preset fields into LevelParams →
    Apply validateLevelParams() →
    Call onChange({ ...params, instrument: id, levels: updatedLevels })
```

---

## State Transitions

```
Instrument selection flow:
  IDLE / PLAYING
    → [user selects instrument from dropdown]
      → look up InstrumentPreset by id
      → for each of 5 parse levels:
          merge { waveform, filterCutoff, filterQ, attack, release, gain } into LevelParams
          apply validateLevelParams()
      → update AppParams: { instrument: id, levels: updatedLevels }
      → next playUnit() call uses updated LevelParams

Individual slider change (post-instrument-select):
  → LevelParams for that level updated as before
  → AppParams.instrument label unchanged (FR-006)
  → Next playUnit() uses the slider's overridden value for that level
```
