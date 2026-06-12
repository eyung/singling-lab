import type { AppParams, ParseLevel, ParseUnit, Timeline, TimelineEvent } from './types'
import { LAYERED_LEVELS } from './types'

// Pure encoders for the three constitution-required output formats:
// .wav (via encodeWav), .mid (buildMidi), .txt (buildParsedTxt).
// No DOM, no Web Audio — fully unit-testable.

// ── WAV (PCM16 stereo) ────────────────────────────────────────────────────────

export function encodeWav(channels: readonly Float32Array[], sampleRate: number): ArrayBuffer {
  const numCh = channels.length
  const frames = channels[0]?.length ?? 0
  const dataBytes = frames * numCh * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)            // fmt chunk size
  view.setUint16(20, 1, true)             // PCM
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numCh * 2, true) // byte rate
  view.setUint16(32, numCh * 2, true)     // block align
  view.setUint16(34, 16, true)            // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, dataBytes, true)
  let off = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i]!))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
  }
  return buffer
}

// ── MIDI (format 1) ───────────────────────────────────────────────────────────

const TPQ = 480                  // ticks per quarter note
const US_PER_QUARTER = 500000    // 120 bpm → 1 tick = 500/480 ms
const MS_TO_TICKS = TPQ / 500

// GM program per sound character (documented, deterministic mapping)
const GM_PROGRAM: Record<string, number> = {
  default: 79, piano: 0, organ: 16, strings: 48, brass: 61, flute: 73, bass: 33,
  pluck: 45, pad: 89, bell: 14, choir: 52, lead: 80,
  rain: 96, wind: 121, forest: 123, ocean: 122, campfire: 97,
  'city-hum': 102, traffic: 125, cave: 99, underwater: 122, thunder: 96,
  machinery: 125, space: 103,
  tick: 115, thud: 117, snap: 115, chime: 112, block: 115,
}

// GM drum notes (channel 10) per punctuation class
function drumNoteFor(text: string): number {
  const ch = text[0] ?? '.'
  if (ch === '.') return text.length > 1 ? 38 : 35  // … → snare, . → kick
  if (ch === ',') return 42                          // closed hat
  if (ch === ';' || ch === ':') return 44            // pedal hat
  if (ch === '!') return 49                          // crash
  if (ch === '?') return 56                          // cowbell
  if (ch === '—' || ch === '–') return 37            // side stick
  return 75                                          // claves (quotes, brackets)
}

function vlq(n: number): number[] {
  let v = Math.max(0, Math.round(n))
  const bytes = [v & 0x7f]
  while ((v >>= 7) > 0) bytes.unshift((v & 0x7f) | 0x80)
  return bytes
}

function freqToMidi(freq: number): number {
  if (freq <= 0) return 60
  return Math.max(0, Math.min(127, Math.round(69 + 12 * Math.log2(freq / 440))))
}

function velocityOf(ev: TimelineEvent): number {
  const g = Math.max(0, Math.min(1, ev.sp.gain * ev.layerGain))
  return Math.max(20, Math.min(127, Math.round(Math.sqrt(g) * 127)))
}

interface MidiMsg { tick: number; order: number; bytes: number[] }

function trackBytes(msgs: MidiMsg[]): number[] {
  msgs.sort((a, b) => a.tick - b.tick || a.order - b.order)
  const out: number[] = []
  let last = 0
  for (const m of msgs) {
    out.push(...vlq(m.tick - last), ...m.bytes)
    last = m.tick
  }
  out.push(0x00, 0xff, 0x2f, 0x00) // end of track
  return out
}

function chunk(tag: string, body: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < 4; i++) out.push(tag.charCodeAt(i))
  out.push((body.length >>> 24) & 0xff, (body.length >>> 16) & 0xff, (body.length >>> 8) & 0xff, body.length & 0xff)
  return out.concat(body)
}

const LEVEL_CHANNEL: Record<string, number> = { letter: 0, word: 0, phrase: 1, sentence: 2, paragraph: 3 }

export function buildMidi(timeline: Timeline, params: AppParams): Uint8Array {
  const live = timeline.events.filter(e => !e.dropped)

  // tempo/meta track
  const meta: MidiMsg[] = [{
    tick: 0, order: 0,
    bytes: [0xff, 0x51, 0x03, (US_PER_QUARTER >> 16) & 0xff, (US_PER_QUARTER >> 8) & 0xff, US_PER_QUARTER & 0xff],
  }]

  const levels: ParseLevel[] = timeline.mode === 'layered'
    ? [...LAYERED_LEVELS]
    : [params.parseLevel]

  const tracks: number[][] = [trackBytes(meta)]

  for (const level of levels) {
    const channel = LEVEL_CHANNEL[level] ?? 0
    const msgs: MidiMsg[] = []
    const charIds = new Set<string>()
    for (const ev of live) {
      if (ev.level !== level) continue
      const startTick = ev.tMs * MS_TO_TICKS
      const endTick = startTick + Math.max(20, ev.durMs) * MS_TO_TICKS
      if (ev.kind === 'punct') {
        const unit = timeline.unitsByLevel[ev.level]?.[ev.unitIndex]
        const note = drumNoteFor(unit?.text ?? '.')
        msgs.push({ tick: startTick, order: 1, bytes: [0x99, note, velocityOf(ev)] })
        msgs.push({ tick: endTick, order: 0, bytes: [0x89, note, 0] })
      } else {
        if (ev.characterId && !charIds.has(ev.characterId)) {
          charIds.add(ev.characterId)
          msgs.push({ tick: startTick, order: 0, bytes: [0xc0 | channel, GM_PROGRAM[ev.characterId] ?? 80] })
        }
        const note = freqToMidi(ev.sp.frequency)
        msgs.push({ tick: startTick, order: 1, bytes: [0x90 | channel, note, velocityOf(ev)] })
        msgs.push({ tick: endTick, order: 0, bytes: [0x80 | channel, note, 0] })
      }
    }
    if (msgs.length) tracks.push(trackBytes(msgs))
  }

  const header = chunk('MThd', [0, 1, (tracks.length >> 8) & 0xff, tracks.length & 0xff, (TPQ >> 8) & 0xff, TPQ & 0xff])
  const bytes = header.concat(...tracks.map(t => chunk('MTrk', t)))
  return new Uint8Array(bytes)
}

// ── TXT parse report (learning resource) ──────────────────────────────────────

function fmtSignal(u: ParseUnit): string {
  const s = u.semantic
  const parts = [
    `sent ${s.sentiment >= 0 ? '+' : ''}${s.sentiment.toFixed(2)}`,
    `nrg ${s.energy.toFixed(2)}`,
  ]
  if (s.wordClass) parts.push(s.wordClass)
  if (s.frequencyTier) parts.push(s.frequencyTier)
  if (s.syllables > 0) parts.push(`${s.syllables}syl`)
  if (s.modalStrength !== undefined) parts.push(`modal ${s.modalStrength.toFixed(2)}`)
  if (s.category) parts.push(`cat:${s.category}`)
  if (s.sentenceType && s.sentenceType !== 'declarative') parts.push(s.sentenceType)
  return parts.join(' · ')
}

function sectionFor(level: ParseLevel, units: ParseUnit[]): string {
  const lines = [`── ${level} (${units.length} units) ${'─'.repeat(Math.max(0, 40 - level.length))}`]
  for (const u of units) {
    const text = u.text.length > 64 ? u.text.slice(0, 61) + '…' : u.text
    const flat = text.replace(/\s+/g, ' ')
    lines.push(u.kind === 'punct'
      ? `[${String(u.index).padStart(4)}] ⟨${flat}⟩ punctuation`
      : `[${String(u.index).padStart(4)}] "${flat}" — ${fmtSignal(u)}`)
  }
  return lines.join('\n')
}

export function buildParsedTxt(timeline: Timeline, params: AppParams, sourceText: string): string {
  const levels: ParseLevel[] = timeline.mode === 'layered' ? [...LAYERED_LEVELS] : [params.parseLevel]
  const head = [
    'SINGLING LAB — PARSE REPORT',
    `mode: ${timeline.mode}${timeline.mode === 'single' ? ` (${params.parseLevel})` : ''}`,
    `tempo: ${params.tempo}ms · polyphony: ${params.polyphony}`,
    `source: ${sourceText.length} chars`,
    '',
  ]
  const sections = levels.map(level => sectionFor(level, timeline.unitsByLevel[level] ?? []))
  return head.concat(sections).join('\n') + '\n'
}
