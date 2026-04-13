import type { InstrumentPreset, ParseLevel, LevelParams } from './types'
import { validateLevelParams } from './types'

export const INSTRUMENT_PRESETS: readonly InstrumentPreset[] = [
  { id: 'default', name: 'Default',    waveform: 'sine',     attack: 0.010, release: 0.100, filterCutoff: 2000, filterQ: 1.0, gain: 0.4 },
  { id: 'piano',   name: 'Piano',      waveform: 'triangle', attack: 0.002, release: 0.080, filterCutoff: 3500, filterQ: 0.8, gain: 0.4 },
  { id: 'organ',   name: 'Organ',      waveform: 'square',   attack: 0.005, release: 0.010, filterCutoff: 1800, filterQ: 0.5, gain: 0.4 },
  { id: 'strings', name: 'Strings',    waveform: 'sawtooth', attack: 0.120, release: 0.400, filterCutoff: 1200, filterQ: 2.0, gain: 0.4 },
  { id: 'brass',   name: 'Brass',      waveform: 'sawtooth', attack: 0.030, release: 0.150, filterCutoff: 4000, filterQ: 3.0, gain: 0.4 },
  { id: 'flute',   name: 'Flute',      waveform: 'sine',     attack: 0.060, release: 0.200, filterCutoff: 6000, filterQ: 0.3, gain: 0.4 },
  { id: 'bass',    name: 'Bass',       waveform: 'sawtooth', attack: 0.008, release: 0.060, filterCutoff:  500, filterQ: 1.5, gain: 0.4 },
  { id: 'pluck',   name: 'Pluck',      waveform: 'triangle', attack: 0.001, release: 0.040, filterCutoff: 5000, filterQ: 4.0, gain: 0.4 },
  { id: 'pad',     name: 'Pad',        waveform: 'sine',     attack: 0.300, release: 0.800, filterCutoff: 1000, filterQ: 0.5, gain: 0.4 },
  { id: 'bell',    name: 'Bell',       waveform: 'sine',     attack: 0.001, release: 1.200, filterCutoff: 8000, filterQ: 6.0, gain: 0.4 },
  { id: 'choir',   name: 'Choir',      waveform: 'triangle', attack: 0.150, release: 0.600, filterCutoff:  900, filterQ: 1.5, gain: 0.4 },
  { id: 'lead',    name: 'Synth Lead', waveform: 'square',   attack: 0.005, release: 0.080, filterCutoff: 5000, filterQ: 2.0, gain: 0.4 },
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
