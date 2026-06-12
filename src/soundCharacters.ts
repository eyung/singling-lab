import type { SoundCharacter } from './types'

export const SOUND_CHARACTERS: readonly SoundCharacter[] = [
  // ── Synthesis (oscillator-based) ────────────────────────────────────────────
  { id: 'default',  name: 'Default',     category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sine',     attack: 0.010, release: 0.100, filterCutoff: 2000, filterQ: 1.0, gain: 0.4 },
  { id: 'piano',    name: 'Piano',       category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'triangle', attack: 0.002, release: 0.080, filterCutoff: 3500, filterQ: 0.8, gain: 0.4 },
  { id: 'organ',    name: 'Organ',       category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'square',   attack: 0.005, release: 0.010, filterCutoff: 1800, filterQ: 0.5, gain: 0.4 },
  { id: 'strings',  name: 'Strings',     category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sawtooth', attack: 0.120, release: 0.400, filterCutoff: 1200, filterQ: 2.0, gain: 0.4 },
  { id: 'brass',    name: 'Brass',       category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sawtooth', attack: 0.030, release: 0.150, filterCutoff: 4000, filterQ: 3.0, gain: 0.4 },
  { id: 'flute',    name: 'Flute',       category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sine',     attack: 0.060, release: 0.200, filterCutoff: 6000, filterQ: 0.3, gain: 0.4 },
  { id: 'bass',     name: 'Bass',        category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sawtooth', attack: 0.008, release: 0.060, filterCutoff:  500, filterQ: 1.5, gain: 0.4 },
  { id: 'pluck',    name: 'Pluck',       category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'triangle', attack: 0.001, release: 0.040, filterCutoff: 5000, filterQ: 4.0, gain: 0.4 },
  { id: 'pad',      name: 'Pad',         category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sine',     attack: 0.300, release: 0.800, filterCutoff: 1000, filterQ: 0.5, gain: 0.4 },
  { id: 'bell',     name: 'Bell',        category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'sine',     attack: 0.001, release: 1.200, filterCutoff: 8000, filterQ: 6.0, gain: 0.4 },
  { id: 'choir',    name: 'Choir',       category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'triangle', attack: 0.150, release: 0.600, filterCutoff:  900, filterQ: 1.5, gain: 0.4 },
  { id: 'lead',     name: 'Synth Lead',  category: 'synthesis',   percussive: false, source: 'oscillator', waveform: 'square',   attack: 0.005, release: 0.080, filterCutoff: 5000, filterQ: 2.0, gain: 0.4 },

  // ── Nature ──────────────────────────────────────────────────────────────────
  { id: 'rain',      name: 'Rain',       category: 'nature',      percussive: false, source: 'noise', noiseColor: 'white', noiseFilterType: 'lowpass',  noiseFilterFreq:  600, attack: 0.3, release: 1.0, filterCutoff:  600, filterQ: 0.5, gain: 0.3 },
  { id: 'wind',      name: 'Wind',       category: 'nature',      percussive: false, source: 'noise', noiseColor: 'pink',  noiseFilterType: 'bandpass', noiseFilterFreq:  250, attack: 0.5, release: 1.5, filterCutoff:  400, filterQ: 1.0, gain: 0.25 },
  { id: 'forest',    name: 'Forest',     category: 'nature',      percussive: false, source: 'noise', noiseColor: 'pink',  noiseFilterType: 'lowpass',  noiseFilterFreq:  300, attack: 0.4, release: 1.2, filterCutoff:  300, filterQ: 0.5, gain: 0.2 },
  { id: 'ocean',     name: 'Ocean',      category: 'nature',      percussive: false, source: 'noise', noiseColor: 'pink',  noiseFilterType: 'lowpass',  noiseFilterFreq:  200, attack: 1.0, release: 2.0, filterCutoff:  200, filterQ: 0.8, gain: 0.35 },
  { id: 'campfire',  name: 'Campfire',   category: 'nature',      percussive: false, source: 'noise', noiseColor: 'white', noiseFilterType: 'lowpass',  noiseFilterFreq:  500, attack: 0.2, release: 0.8, filterCutoff:  500, filterQ: 0.5, gain: 0.2 },

  // ── City ────────────────────────────────────────────────────────────────────
  { id: 'city-hum',  name: 'City Hum',   category: 'city',        percussive: false, source: 'noise', noiseColor: 'white', noiseFilterType: 'bandpass', noiseFilterFreq:  600, attack: 0.3, release: 0.8, filterCutoff: 1200, filterQ: 1.5, gain: 0.25 },
  { id: 'traffic',   name: 'Traffic',    category: 'city',        percussive: false, source: 'noise', noiseColor: 'pink',  noiseFilterType: 'bandpass', noiseFilterFreq:  200, attack: 0.5, release: 1.0, filterCutoff:  500, filterQ: 1.0, gain: 0.3 },

  // ── Environment ─────────────────────────────────────────────────────────────
  { id: 'cave',       name: 'Cave',      category: 'environment', percussive: false, source: 'noise', noiseColor: 'pink',  noiseFilterType: 'bandpass', noiseFilterFreq:  150, attack: 0.6, release: 2.0, filterCutoff:  300, filterQ: 2.0, gain: 0.2 },
  { id: 'underwater', name: 'Underwater',category: 'environment', percussive: false, source: 'noise', noiseColor: 'white', noiseFilterType: 'lowpass',  noiseFilterFreq:  200, attack: 0.8, release: 2.5, filterCutoff:  200, filterQ: 1.0, gain: 0.25 },
  { id: 'thunder',    name: 'Thunder',   category: 'environment', percussive: false, source: 'noise', noiseColor: 'white', noiseFilterType: 'lowpass',  noiseFilterFreq:  150, attack: 0.05,release: 3.0, filterCutoff:  150, filterQ: 0.5, gain: 0.4 },
  { id: 'machinery',  name: 'Machinery', category: 'environment', percussive: false, source: 'noise', noiseColor: 'white', noiseFilterType: 'bandpass', noiseFilterFreq:  600, attack: 0.1, release: 0.5, filterCutoff:  800, filterQ: 3.0, gain: 0.2 },
  { id: 'space',      name: 'Space',     category: 'environment', percussive: false, source: 'noise', noiseColor: 'pink',  noiseFilterType: 'lowpass',  noiseFilterFreq:  100, attack: 1.5, release: 4.0, filterCutoff:  100, filterQ: 0.5, gain: 0.3 },

  // ── Percussion (word-level / punctuation / keyword accents only) ────────────
  { id: 'tick',  name: 'Tick',      category: 'percussion', percussive: true, source: 'noise', noiseColor: 'white', noiseFilterType: 'highpass', noiseFilterFreq: 6000, attack: 0.001, release: 0.030, filterCutoff: 12000, filterQ: 1.0, gain: 0.30 },
  { id: 'thud',  name: 'Thud',      category: 'percussion', percussive: true, source: 'noise', noiseColor: 'white', noiseFilterType: 'lowpass',  noiseFilterFreq:  140, attack: 0.001, release: 0.120, filterCutoff:  200, filterQ: 0.7, gain: 0.50 },
  { id: 'snap',  name: 'Snap',      category: 'percussion', percussive: true, source: 'noise', noiseColor: 'white', noiseFilterType: 'bandpass', noiseFilterFreq: 2500, attack: 0.001, release: 0.050, filterCutoff: 5000, filterQ: 3.0, gain: 0.35 },
  { id: 'chime', name: 'Chime',     category: 'percussion', percussive: true, source: 'oscillator', waveform: 'sine', attack: 0.001, release: 0.300, filterCutoff: 9000, filterQ: 6.0, gain: 0.30 },
  { id: 'block', name: 'Woodblock', category: 'percussion', percussive: true, source: 'oscillator', waveform: 'triangle', attack: 0.001, release: 0.060, filterCutoff: 3000, filterQ: 8.0, gain: 0.40 },
] as const

export function getSoundCharacter(id: string): SoundCharacter | undefined {
  return SOUND_CHARACTERS.find(c => c.id === id)
}

export function getBackdropCharacters(): SoundCharacter[] {
  return SOUND_CHARACTERS.filter(c => !c.percussive)
}

export function getAllCharacters(): SoundCharacter[] {
  return [...SOUND_CHARACTERS]
}
