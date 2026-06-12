// Parse granularity levels
export type ParseLevel = 'letter' | 'word' | 'phrase' | 'sentence' | 'paragraph'
export const PARSE_LEVELS: readonly ParseLevel[] = ['letter', 'word', 'phrase', 'sentence', 'paragraph']

// A unit is either real text or a punctuation mark (Rule 6: punctuation is sonified)
export type UnitKind = 'text' | 'punct'

export type WordClass = 'noun' | 'verb' | 'adjective' | 'adverb' | 'function'
export type FrequencyTier = 'common' | 'uncommon' | 'rare'
export type SentenceType = 'declarative' | 'question' | 'exclamation'

// A named oscillator-based timbre preset
export interface InstrumentPreset {
  id: string
  name: string
  waveform: OscillatorType
  filterCutoff: number    // Hz
  filterQ: number
  attack: number          // seconds
  release: number         // seconds
  gain: number            // 0–1
}

// A sound character — covers oscillator-based timbres and noise-based environmental sounds
export interface SoundCharacter {
  id: string
  name: string
  category: 'synthesis' | 'nature' | 'city' | 'environment' | 'percussion'
  percussive: boolean
  attack: number          // seconds
  release: number         // seconds
  filterCutoff: number    // Hz — primary lowpass cutoff
  filterQ: number
  gain: number            // 0–1 base gain
  source: 'oscillator' | 'noise'
  // oscillator-only fields:
  waveform?: OscillatorType
  // noise-only fields:
  noiseColor?: 'white' | 'pink'
  noiseFilterType?: BiquadFilterType
  noiseFilterFreq?: number  // Hz — noise-shaping filter frequency
}

// A character offset range within the raw input text string
export type CharRange = { start: number; end: number }

// The four parse levels that participate in layered mode
export type LayeredLevel = 'word' | 'phrase' | 'sentence' | 'paragraph'
export const LAYERED_LEVELS: readonly LayeredLevel[] = ['word', 'phrase', 'sentence', 'paragraph']

// Per-level configuration for layered playback mode
export interface LayeredLevelConfig {
  soundCharacterId: string
  gain: number    // 0–1
  enabled: boolean
  sustainMode: 'retrigger' | 'hold'  // phrase/sentence/paragraph only; word always fires once
  pan: number     // -1 (left) to 1 (right) — stereo placement of this layer
}

// Semantic signals extracted from text
export interface SemanticSignal {
  sentiment: number       // -1 (negative) to 1 (positive); negation-aware
  energy: number          // 0 (calm) to 1 (intense)
  tags: string[]          // POS tags, structural notes
  wordLength: number      // character count of the unit text
  syllables: number       // approximate syllable count (vowel-group heuristic)
  wordClass?: WordClass         // word level only
  modalStrength?: number        // 0–1, modal verbs only (could=0.15 … must=0.95)
  frequencyTier?: FrequencyTier // word level only
  category?: string             // curated semantic category id (animal, emotion, …)
  sentenceType?: SentenceType   // sentence level only
}

// A discrete unit of parsed text with its semantic context.
// `range` is exact: text.slice(range.start, range.end) === unit.text — always.
export interface ParseUnit {
  level: ParseLevel
  kind: UnitKind
  text: string
  index: number           // position in sequence at its level
  range: CharRange
  semantic: SemanticSignal
}

// Sound parameters for a single unit
export interface SoundParams {
  frequency: number       // Hz
  waveform: OscillatorType
  duration: number        // seconds
  attack: number          // seconds
  release: number         // seconds
  filterCutoff: number    // Hz
  filterQ: number
  gain: number            // 0–1
  detune: number          // cents
  pan: number             // -1 to 1
  glideTo?: number        // Hz — optional pitch glide target (question contour)
}

// User-controlled mapping parameters per parse level
export interface LevelParams {
  enabled: boolean
  pitchMin: number        // Hz
  pitchMax: number        // Hz
  durationMin: number     // seconds
  durationMax: number     // seconds
  attack: number
  release: number
  waveform: OscillatorType
  filterCutoff: number
  filterQ: number
  gain: number
  rate: number            // single-mode tempo multiplier for this level (×tempo)
}

// Semantic override controls (Rule 3: overrides blend, not replace)
export interface SemanticParams {
  sentimentToPitch: boolean       // positive sentiment → higher pitch
  energyToFilterCutoff: boolean   // high energy → open filter
  energyToTempo: boolean          // high energy → shorter inter-event interval
  wordLengthToDuration: boolean   // longer words → longer durations
  modalStrengthToPitch: boolean   // must/ought high, could/might low
  frequencyTierToGain: boolean    // rare words → louder (perceptual salience)
  categoryToCharacter: boolean    // semantic category → sound character (via categoryMap)
  punctuationSounds: boolean      // Rule 6: sonify , . ! ? ; : — ( )
  sentenceContour: boolean        // questions glide up; exclamations accent
}

// A user-defined keyword trigger (Rule 7: keywords override)
export interface KeywordRule {
  word: string              // matched case-insensitively against word units
  soundCharacterId: string
  boost: number             // gain multiplier, 0.25–4
}

// Musical scale quantisation
export type ScaleMode =
  | 'major' | 'minor' | 'pentatonic' | 'pentatonicMinor'
  | 'dorian' | 'mixolydian' | 'wholetone' | 'chromatic'
export const SCALE_MODES: readonly ScaleMode[] = [
  'major', 'minor', 'pentatonic', 'pentatonicMinor', 'dorian', 'mixolydian', 'wholetone', 'chromatic',
]

export interface ScaleConfig {
  quantize: boolean   // single mode honours this; layered mode always quantises (Principle V)
  root: number        // 0–11 (0 = C)
  mode: ScaleMode
}

export type PlaybackMode = 'single' | 'layered'

// ── Timeline: the precomputed, deterministic event schedule ──────────────────
// A Timeline is a pure function of (text, params). Live playback, WAV render
// and MIDI export all consume the same Timeline (Principles II & IX).

export interface TimelineEvent {
  tMs: number
  durMs: number
  level: ParseLevel
  kind: UnitKind
  unitIndex: number          // index into unitsByLevel[level]
  range: CharRange
  sp: SoundParams
  characterId: string | null // null → plain oscillator built from sp alone
  layerGain: number          // layered-mode mix gain; 1 in single mode
  dropped: boolean           // deterministic voice-steal (Rule 4)
}

// One step of the highlight/inspector grid — word grid in layered mode,
// active-level units in single mode.
export interface GridCell {
  tMs: number
  durMs: number
  range: CharRange
  text: string
  kind: UnitKind
  semantic: SemanticSignal
}

export interface Timeline {
  mode: PlaybackMode
  totalMs: number
  events: TimelineEvent[]    // sorted by tMs
  grid: GridCell[]           // sorted by tMs
  unitsByLevel: Partial<Record<ParseLevel, ParseUnit[]>>
}

// Versioned configuration file envelope (for export/import)
export const CONFIG_VERSION = '2'

export interface ConfigFile {
  version: string
  app: 'singling-lab'
  exported: string      // ISO 8601 timestamp
  params: AppParams
}

// Full user parameter state
export interface AppParams {
  parseLevel: ParseLevel
  levels: Record<ParseLevel, LevelParams>
  semantic: SemanticParams
  polyphony: number             // max simultaneous voices
  tempo: number                 // ms between word-level events (base beat)
  instrument: string            // ID of last-applied InstrumentPreset
  mode: PlaybackMode
  layered: Record<LayeredLevel, LayeredLevelConfig>
  scale: ScaleConfig
  keywords: KeywordRule[]
  categoryMap: Record<string, string>  // semantic category id → sound character id ('' = none)
}

// Clamp a number to [min, max]
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Enforce all VI.c validation rules on a LevelParams object
export function validateLevelParams(lp: LevelParams): LevelParams {
  const pitchMin = clamp(lp.pitchMin, 20, 20000)
  const pitchMax = Math.max(pitchMin + 1, clamp(lp.pitchMax, 20, 20000))
  const durationMin = clamp(lp.durationMin, 0.01, 60)
  const durationMax = Math.max(durationMin + 0.01, clamp(lp.durationMax, 0.01, 60))
  const attack = clamp(lp.attack, 0.001, 60)
  const release = clamp(lp.release, 0.001, 60)
  // attack + release must not exceed duration — clamp release if needed
  const safeRelease = Math.min(release, durationMin - attack)
  return {
    ...lp,
    pitchMin,
    pitchMax,
    durationMin,
    durationMax,
    attack,
    release: Math.max(0.001, safeRelease),
    filterCutoff: clamp(lp.filterCutoff, 20, 20000),
    filterQ: clamp(lp.filterQ, 0.1, 20),
    gain: clamp(lp.gain, 0, 1),
    rate: clamp(lp.rate, 0.1, 8),
  }
}

// Validate a LayeredLevelConfig; clamp gain/pan, ensure soundCharacterId is non-empty
export function validateLayeredLevelConfig(llc: LayeredLevelConfig): LayeredLevelConfig {
  return {
    ...llc,
    soundCharacterId: llc.soundCharacterId || 'default',
    gain: clamp(llc.gain, 0, 1),
    sustainMode: llc.sustainMode === 'hold' ? 'hold' : 'retrigger',
    pan: clamp(llc.pan, -1, 1),
  }
}

export function validateKeywordRule(kr: KeywordRule): KeywordRule | null {
  const word = kr.word.trim().toLowerCase()
  if (!word || !/^[\p{L}\p{N}'’-]+$/u.test(word)) return null
  return {
    word,
    soundCharacterId: kr.soundCharacterId || 'bell',
    boost: clamp(kr.boost, 0.25, 4),
  }
}

export function validateScale(s: ScaleConfig): ScaleConfig {
  return {
    quantize: !!s.quantize,
    root: clamp(Math.round(s.root), 0, 11),
    mode: SCALE_MODES.includes(s.mode) ? s.mode : 'major',
  }
}

// Enforce global param bounds
export function validateAppParams(p: AppParams): AppParams {
  const layered = Object.fromEntries(
    LAYERED_LEVELS.map(level => [level, validateLayeredLevelConfig(p.layered[level])])
  ) as Record<LayeredLevel, LayeredLevelConfig>
  const keywords = p.keywords
    .map(validateKeywordRule)
    .filter((k): k is KeywordRule => k !== null)
    .filter((k, i, arr) => arr.findIndex(o => o.word === k.word) === i)
    .slice(0, 32)
  return {
    ...p,
    polyphony: clamp(Math.round(p.polyphony), 1, 16),
    tempo: clamp(p.tempo, 50, 5000),
    mode: p.mode === 'layered' ? 'layered' : 'single',
    layered,
    scale: validateScale(p.scale),
    keywords,
  }
}

export const DEFAULT_LEVEL_PARAMS: LevelParams = {
  enabled: true,
  pitchMin: 110,
  pitchMax: 880,
  durationMin: 0.1,
  durationMax: 0.6,
  attack: 0.01,
  release: 0.1,
  waveform: 'sine',
  filterCutoff: 2000,
  filterQ: 1,
  gain: 0.4,
  rate: 1,
}

export const DEFAULT_LAYERED_PARAMS: Record<LayeredLevel, LayeredLevelConfig> = {
  word:      { soundCharacterId: 'pluck',   gain: 0.70, enabled: true, sustainMode: 'retrigger', pan: 0 },
  phrase:    { soundCharacterId: 'pad',     gain: 0.42, enabled: true, sustainMode: 'retrigger', pan: -0.3 },
  sentence:  { soundCharacterId: 'strings', gain: 0.22, enabled: true, sustainMode: 'hold',      pan: 0.3 },
  paragraph: { soundCharacterId: 'ocean',   gain: 0.10, enabled: true, sustainMode: 'hold',      pan: 0 },
}

// Semantic categories available for category → character mapping.
export const SEMANTIC_CATEGORIES: readonly string[] = [
  'person', 'place', 'animal', 'nature', 'body', 'emotion', 'motion', 'time', 'number', 'color',
]

export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  person: '', place: '', animal: 'flute', nature: '', body: '',
  emotion: 'bell', motion: '', time: '', number: 'pluck', color: '',
}

export const DEFAULT_PARAMS: AppParams = {
  parseLevel: 'word',
  instrument: 'default',
  levels: {
    letter:    { ...DEFAULT_LEVEL_PARAMS, pitchMax: 1760, durationMax: 0.15, rate: 0.45 },
    word:      { ...DEFAULT_LEVEL_PARAMS },
    phrase:    { ...DEFAULT_LEVEL_PARAMS, pitchMin: 80, pitchMax: 440, durationMin: 0.3, durationMax: 1.2, rate: 2.2 },
    sentence:  { ...DEFAULT_LEVEL_PARAMS, pitchMin: 55, pitchMax: 220, durationMin: 0.5, durationMax: 2.0, waveform: 'triangle', rate: 3.5 },
    paragraph: { ...DEFAULT_LEVEL_PARAMS, pitchMin: 40, pitchMax: 110, durationMin: 1.0, durationMax: 4.0, waveform: 'sawtooth', rate: 6 },
  },
  semantic: {
    sentimentToPitch: true,
    energyToFilterCutoff: true,
    energyToTempo: true,
    wordLengthToDuration: true,
    modalStrengthToPitch: true,
    frequencyTierToGain: true,
    categoryToCharacter: true,
    punctuationSounds: true,
    sentenceContour: true,
  },
  polyphony: 12,
  tempo: 300,
  mode: 'single',
  layered: { ...DEFAULT_LAYERED_PARAMS },
  scale: { quantize: false, root: 0, mode: 'major' },
  keywords: [],
  categoryMap: { ...DEFAULT_CATEGORY_MAP },
}
