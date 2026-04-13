# Quickstart: MIDI Instrument Selector

**Branch**: `003-midi-instrument-select` | **Date**: 2026-04-13

How to implement the instrument selector from scratch, in order.

---

## Step 1 — Add `InstrumentPreset` type to `types.ts`

Add the interface and extend `AppParams`:

```typescript
// In types.ts — new interface
export interface InstrumentPreset {
  id: string
  name: string
  waveform: OscillatorType
  filterCutoff: number
  filterQ: number
  attack: number
  release: number
  gain: number
}

// In AppParams — add one field
export interface AppParams {
  // ...existing fields...
  instrument: string   // ID of the last-applied InstrumentPreset
}

// In DEFAULT_PARAMS — add default
export const DEFAULT_PARAMS: AppParams = {
  // ...existing fields...
  instrument: 'default',
}
```

`validateAppParams()` needs no changes.

---

## Step 2 — Create `src/instruments.ts`

Define the static catalog and the two utility functions:

```typescript
import type { InstrumentPreset } from './types'
import type { ParseLevel, LevelParams } from './types'
import { validateLevelParams } from './types'

export const INSTRUMENT_PRESETS: readonly InstrumentPreset[] = [
  { id: 'default',  name: 'Default',     waveform: 'sine',      attack: 0.010, release: 0.100, filterCutoff: 2000, filterQ: 1.0, gain: 0.4 },
  { id: 'piano',    name: 'Piano',       waveform: 'triangle',  attack: 0.002, release: 0.080, filterCutoff: 3500, filterQ: 0.8, gain: 0.4 },
  { id: 'organ',    name: 'Organ',       waveform: 'square',    attack: 0.005, release: 0.010, filterCutoff: 1800, filterQ: 0.5, gain: 0.4 },
  { id: 'strings',  name: 'Strings',     waveform: 'sawtooth',  attack: 0.120, release: 0.400, filterCutoff: 1200, filterQ: 2.0, gain: 0.4 },
  { id: 'brass',    name: 'Brass',       waveform: 'sawtooth',  attack: 0.030, release: 0.150, filterCutoff: 4000, filterQ: 3.0, gain: 0.4 },
  { id: 'flute',    name: 'Flute',       waveform: 'sine',      attack: 0.060, release: 0.200, filterCutoff: 6000, filterQ: 0.3, gain: 0.4 },
  { id: 'bass',     name: 'Bass',        waveform: 'sawtooth',  attack: 0.008, release: 0.060, filterCutoff:  500, filterQ: 1.5, gain: 0.4 },
  { id: 'pluck',    name: 'Pluck',       waveform: 'triangle',  attack: 0.001, release: 0.040, filterCutoff: 5000, filterQ: 4.0, gain: 0.4 },
  { id: 'pad',      name: 'Pad',         waveform: 'sine',      attack: 0.300, release: 0.800, filterCutoff: 1000, filterQ: 0.5, gain: 0.4 },
  { id: 'bell',     name: 'Bell',        waveform: 'sine',      attack: 0.001, release: 1.200, filterCutoff: 8000, filterQ: 6.0, gain: 0.4 },
  { id: 'choir',    name: 'Choir',       waveform: 'triangle',  attack: 0.150, release: 0.600, filterCutoff:  900, filterQ: 1.5, gain: 0.4 },
  { id: 'lead',     name: 'Synth Lead',  waveform: 'square',    attack: 0.005, release: 0.080, filterCutoff: 5000, filterQ: 2.0, gain: 0.4 },
] as const

export function getPreset(id: string): InstrumentPreset | undefined {
  return INSTRUMENT_PRESETS.find(p => p.id === id)
}

const LEVELS: readonly ParseLevel[] = ['letter', 'word', 'phrase', 'sentence', 'paragraph']

export function applyPreset(
  id: string,
  levels: Record<ParseLevel, LevelParams>
): Record<ParseLevel, LevelParams> {
  const preset = getPreset(id)
  if (!preset) return levels
  const updated = { ...levels }
  for (const level of LEVELS) {
    updated[level] = validateLevelParams({
      ...levels[level],
      waveform: preset.waveform,
      filterCutoff: preset.filterCutoff,
      filterQ: preset.filterQ,
      attack: preset.attack,
      release: preset.release,
      gain: preset.gain,
    })
  }
  return updated
}
```

---

## Step 3 — Add instrument selector to `Controls.tsx`

In the Global section, above the tempo slider:

```tsx
import { INSTRUMENT_PRESETS, applyPreset } from '../instruments'

// Inside the Controls component, in the Global <section>:
<label className="flex flex-col gap-1">
  <span className="text-xs font-mono text-zinc-500">instrument</span>
  <select
    value={params.instrument}
    onChange={e => {
      const id = e.target.value
      const levels = applyPreset(id, params.levels)
      onChange(validateAppParams({ ...params, instrument: id, levels }))
    }}
    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300"
  >
    {INSTRUMENT_PRESETS.map(p => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
</label>
```

---

## Step 4 — Verify

Run `npm run dev` and confirm:
1. Instrument selector appears in the Global section.
2. Selecting "Strings" (slow attack, sawtooth) is audibly different from "Pluck" (fast attack, triangle).
3. Selecting "Bell" produces a long ringing decay.
4. After selecting any instrument, adjusting a pitch slider still affects output.
5. The instrument label does not reset when other sliders are moved.
6. `npm run build` passes TypeScript check with no errors.

---

## Files changed

| File | Change type |
|---|---|
| `src/types.ts` | Edit — add `InstrumentPreset`, extend `AppParams`, update `DEFAULT_PARAMS` |
| `src/instruments.ts` | Create — preset catalog + `getPreset` + `applyPreset` |
| `src/components/Controls.tsx` | Edit — import + instrument `<select>` in Global section |
