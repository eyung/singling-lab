import type { AppParams, ParseLevel, ParseUnit, SoundParams } from './types'
import { getSoundCharacter } from './soundCharacters'
import { quantiseFreq } from './scale'

// Maps a ParseUnit + AppParams to concrete SoundParams (the Mapping, Rules 1–3, 7).
// Pure and deterministic: same unit + params → same output (Principle II).

export interface MapContext {
  level: ParseLevel
  scaleFreqs: readonly number[] | null  // non-null → quantise pitch to these members
  pan: number
  defaultCharacterId: string | null     // layered-mode layer character; null in single mode
}

export interface MappedEvent {
  sp: SoundParams
  characterId: string | null
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// FNV-1a 32-bit over the lowercased text → [0,1). Two seeds give two
// independent hashes (Rule 2: pitch and duration mapped independently).
const SEED_PITCH = 0x811c9dc5
const SEED_DURATION = 0x9747b28c

export function hash01(text: string, seed: number): number {
  let h = seed >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 8) / 16777216
}

// Next scale member strictly above freq (for upward question glides)
function memberAbove(freq: number, scaleFreqs: readonly number[]): number {
  for (const f of scaleFreqs) {
    if (f > freq * 1.001) return f
  }
  return freq
}

// Punctuation voices (Rule 6). Each mark class has a fixed percussive character.
function mapPunct(unit: ParseUnit, params: AppParams, ctx: MapContext): MappedEvent {
  const lp = params.levels[ctx.level === 'letter' ? 'letter' : 'word']
  const ch = unit.text[0]!
  let characterId = 'tick'
  let frequency = 3000
  let duration = 0.06
  let gainFactor = 0.55
  let glideTo: number | undefined

  if (ch === '.' || ch === '…') {
    characterId = 'thud'
    frequency = 100
    duration = unit.text.length > 1 ? 0.2 : 0.14
    gainFactor = 0.8
  } else if (ch === '!') {
    characterId = 'thud'
    frequency = 120
    duration = 0.18
    gainFactor = 1.1
  } else if (ch === '?') {
    characterId = 'chime'
    frequency = 1174.7
    glideTo = 1568
    duration = 0.22
    gainFactor = 0.6
  } else if (ch === '—' || ch === '–') {
    duration = 0.05
    gainFactor = 0.35
  } else if (/["“”‘’'()]/.test(ch)) {
    duration = 0.04
    gainFactor = 0.3
  }

  const char = getSoundCharacter(characterId)
  const sp: SoundParams = {
    frequency,
    waveform: char?.waveform ?? 'sine',
    duration,
    attack: char?.attack ?? 0.001,
    release: char?.release ?? 0.05,
    filterCutoff: char?.filterCutoff ?? 4000,
    filterQ: char?.filterQ ?? 1,
    gain: clamp(lp.gain * gainFactor, 0, 1),
    detune: 0,
    pan: ctx.pan,
  }
  if (glideTo !== undefined) sp.glideTo = glideTo
  return { sp, characterId }
}

export function mapUnit(unit: ParseUnit, params: AppParams, ctx: MapContext): MappedEvent {
  if (unit.kind === 'punct') return mapPunct(unit, params, ctx)

  const lp = params.levels[ctx.level]
  const sem = params.semantic
  const sig = unit.semantic
  const lower = unit.text.toLowerCase()

  let pitchNorm = hash01(lower, SEED_PITCH)
  let durationNorm = hash01(lower, SEED_DURATION)
  let gainMul = 1

  // Semantic overrides blend toward targets (Rule 3)
  if (sem.sentimentToPitch) {
    pitchNorm = lerp(pitchNorm, (sig.sentiment + 1) / 2, 0.5)
  }
  if (sem.modalStrengthToPitch && sig.modalStrength !== undefined) {
    pitchNorm = lerp(pitchNorm, sig.modalStrength, 0.6)
  }
  if (sem.wordLengthToDuration) {
    durationNorm = lerp(durationNorm, Math.min(1, (sig.wordLength - 1) / 9), 0.6)
  }
  if (sem.frequencyTierToGain && sig.frequencyTier) {
    gainMul *= sig.frequencyTier === 'rare' ? 1.3 : sig.frequencyTier === 'uncommon' ? 1.05 : 0.85
  }

  let frequency = lerp(lp.pitchMin, lp.pitchMax, pitchNorm)
  const duration = lerp(lp.durationMin, lp.durationMax, durationNorm)

  // Character resolution: keyword (Rule 7) > category map > layer default > none
  let characterId: string | null = null
  let keywordBoost = 1
  const kw = params.keywords.find(k => k.word === lower)
  if (kw) {
    characterId = kw.soundCharacterId
    keywordBoost = kw.boost
  } else if (sem.categoryToCharacter && sig.category) {
    const mapped = params.categoryMap[sig.category]
    if (mapped) characterId = mapped
  }
  if (!characterId) characterId = ctx.defaultCharacterId

  // Base timbre/envelope: from the character if one drives this event, else level params
  const char = characterId ? getSoundCharacter(characterId) : undefined
  let waveform = lp.waveform
  let attack = lp.attack
  let release = lp.release
  let filterCutoff = lp.filterCutoff
  let filterQ = lp.filterQ
  let gain = lp.gain

  if (char) {
    waveform = char.waveform ?? lp.waveform
    attack = char.attack
    release = char.release
    filterQ = char.filterQ
    filterCutoff = char.filterCutoff
    // char.gain is authored around 0.4 — scale relative to that baseline
    gain = lp.gain * (char.gain / 0.4)
  }
  if (sem.energyToFilterCutoff) {
    filterCutoff = char
      ? clamp(char.filterCutoff * Math.pow(2, sig.energy * 2 - 1), 40, 18000)
      : lerp(200, 8000, sig.energy)
  }

  // Sentence contour: questions glide upward, exclamations accent
  let glideTo: number | undefined
  if (sem.sentenceContour && sig.sentenceType === 'question') {
    glideTo = frequency * 1.335
  }
  if (sem.sentenceContour && sig.sentenceType === 'exclamation') {
    gainMul *= 1.25
    filterCutoff = clamp(filterCutoff * 1.5, 40, 18000)
  }

  // Scale quantisation (layered mode always; single mode when enabled)
  let detune = (pitchNorm - 0.5) * 20
  if (ctx.scaleFreqs) {
    frequency = quantiseFreq(frequency, ctx.scaleFreqs)
    if (glideTo !== undefined) glideTo = memberAbove(frequency, ctx.scaleFreqs)
    detune = 0
  }

  const sp: SoundParams = {
    frequency,
    waveform,
    duration,
    attack,
    release,
    filterCutoff,
    filterQ,
    gain: clamp(gain * gainMul * keywordBoost, 0, 1),
    detune,
    pan: ctx.pan,
  }
  if (glideTo !== undefined) sp.glideTo = glideTo
  return { sp, characterId }
}
