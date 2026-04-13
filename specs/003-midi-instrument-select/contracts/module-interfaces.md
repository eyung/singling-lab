# Module Interface Contracts: MIDI Instrument Selector

**Branch**: `003-midi-instrument-select` | **Date**: 2026-04-13

This document covers only the new and changed contracts introduced by this feature.
For the full baseline contracts, see `specs/001-core-instrument/contracts/module-interfaces.md`.

---

## `instruments.ts` — NEW MODULE

### `INSTRUMENT_PRESETS: readonly InstrumentPreset[]`

The static catalog of all available instrument presets, in display order.

**Guarantees**:
- Non-empty; always contains at least the `'default'` preset.
- No duplicate `id` values.
- All field values satisfy `LevelParams` range constraints.
- Read-only; never mutated at runtime.

**Ordered**: First entry is displayed first in the UI. The `'default'` preset is
always the first entry.

---

### `getPreset(id: string): InstrumentPreset | undefined`

Looks up a preset by its `id`.

| Argument | Type | Constraints |
|---|---|---|
| `id` | string | Any string; unknown IDs return `undefined` |

**Returns**: The matching `InstrumentPreset`, or `undefined` if not found.

**Guarantees**:
- Pure function; no side effects.
- Deterministic.

---

### `applyPreset(id: string, levels: Record<ParseLevel, LevelParams>): Record<ParseLevel, LevelParams>`

Applies the preset identified by `id` to all five parse levels and returns the
updated levels record.

| Argument | Type | Constraints |
|---|---|---|
| `id` | string | Must be a valid `InstrumentPreset.id` |
| `levels` | Record<ParseLevel, LevelParams> | Existing levels state |

**Returns**: A new `Record<ParseLevel, LevelParams>` where each level has its
`waveform`, `filterCutoff`, `filterQ`, `attack`, `release`, and `gain` replaced
by the preset's values. Pitch range and duration fields (`pitchMin`, `pitchMax`,
`durationMin`, `durationMax`, `enabled`) are preserved unchanged.

**Validation**: `validateLevelParams()` is applied to each updated level before
inclusion in the returned record.

**Guarantees**:
- Returns a new object; `levels` is not mutated.
- If `id` is not found, returns `levels` unchanged.
- Deterministic.

---

## `types.ts` — CHANGES

### New type: `InstrumentPreset`

```typescript
interface InstrumentPreset {
  id: string
  name: string
  waveform: OscillatorType
  filterCutoff: number
  filterQ: number
  attack: number
  release: number
  gain: number
}
```

### Modified: `AppParams`

`instrument: string` added. Default: `'default'`.

### Modified: `DEFAULT_PARAMS`

`instrument: 'default'` added.

### Unchanged: `validateAppParams()`

No changes — `instrument` is not validated (it is a label).

---

## `components/Controls.tsx` — CHANGES

### New instrument selector in Global section

A `<select>` element populated from `INSTRUMENT_PRESETS`.

**Behaviour**:
- Displays `preset.name` for each option; `value` is `preset.id`.
- `value` bound to `params.instrument`.
- On change: calls `applyPreset(id, params.levels)` → merges result into
  updated `AppParams` with `instrument: id` → calls `onChange`.

**No new props**: Uses existing `params: AppParams` and `onChange: (p: AppParams) => void`.

---

## `App.tsx` — CHANGES

No logic changes. `AppParams` now includes `instrument`, so the `useState` initial
value must include `instrument: 'default'` (satisfied by using updated `DEFAULT_PARAMS`).
No other changes to `App.tsx`.

---

## Unchanged contracts

All contracts from `specs/001-core-instrument/contracts/module-interfaces.md` remain
valid and unchanged:
- `parser.ts` — `parseText()` is unchanged
- `soundEngine.ts` — `buildSoundParams()`, `SoundEngine` class are unchanged
- `types.ts` — `validateLevelParams()`, `validateAppParams()` signatures unchanged
- `App.tsx` — Playback loop contract unchanged
