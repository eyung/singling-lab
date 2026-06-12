import type {
  AppParams, GridCell, ParseUnit, Timeline, TimelineEvent,
} from './types'
import type { ParsedText } from './parser'
import { mapUnit } from './mapping'
import { buildScaleFreqs } from './scale'

// Builds the complete, deterministic event schedule for a text + params pair.
// Live playback, WAV rendering and MIDI export all consume the same Timeline,
// so what you hear is exactly what you export (Principles II & IX).

const TAIL_MS = 400
const BACKDROP_LEVELS = ['phrase', 'sentence', 'paragraph'] as const
type BackdropLevel = (typeof BACKDROP_LEVELS)[number]

const LEVEL_RANK: Record<string, number> = { letter: 0, word: 0, phrase: 1, sentence: 2, paragraph: 3 }

// Inter-event interval for a unit (energyToTempo stretches calm, compresses intense;
// punctuation marks take a half slot — a breath, not a full beat).
function beatMs(unit: ParseUnit, params: AppParams, rate: number): number {
  let base = params.tempo * rate
  if (params.semantic.energyToTempo) {
    base *= Math.max(0.4, 1 - unit.semantic.energy * 0.5)
  }
  if (unit.kind === 'punct') base *= 0.5
  return base
}

function toCell(unit: ParseUnit, tMs: number, durMs: number): GridCell {
  return { tMs, durMs, range: unit.range, text: unit.text, kind: unit.kind, semantic: unit.semantic }
}

// Deterministic voice-steal (Rule 4): walk events in time order with a min-heap
// of active voice end times; an event that would exceed polyphony is dropped.
function applyVoiceBudget(events: TimelineEvent[], polyphony: number): void {
  const heap: number[] = []
  const push = (v: number) => {
    heap.push(v)
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p]! <= heap[i]!) break
      ;[heap[p], heap[i]] = [heap[i]!, heap[p]!]
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && heap[l]! < heap[m]!) m = l
        if (r < heap.length && heap[r]! < heap[m]!) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i]!, heap[m]!]
        i = m
      }
    }
    return top
  }
  for (const ev of events) {
    while (heap.length && heap[0]! <= ev.tMs + 1e-6) pop()
    if (heap.length >= polyphony) {
      ev.dropped = true
    } else {
      push(ev.tMs + ev.durMs)
    }
  }
}

function sortEvents(events: TimelineEvent[]): void {
  events.sort((a, b) =>
    a.tMs - b.tMs ||
    (LEVEL_RANK[a.level] ?? 0) - (LEVEL_RANK[b.level] ?? 0) ||
    a.unitIndex - b.unitIndex
  )
}

function buildSingle(parsed: ParsedText, params: AppParams): Timeline {
  const level = params.parseLevel
  const lp = params.levels[level]
  const all = parsed.units[level]
  const units = params.semantic.punctuationSounds ? all : all.filter(u => u.kind === 'text')
  const scaleFreqs = params.scale.quantize ? buildScaleFreqs(params.scale) : null

  const grid: GridCell[] = []
  const events: TimelineEvent[] = []
  let t = 0

  for (const unit of units) {
    const beat = beatMs(unit, params, lp.rate)
    grid.push(toCell(unit, t, beat))
    if (lp.enabled) {
      const { sp, characterId } = mapUnit(unit, params, {
        level, scaleFreqs, pan: 0, defaultCharacterId: null,
      })
      events.push({
        tMs: t,
        durMs: sp.duration * 1000,
        level,
        kind: unit.kind,
        unitIndex: unit.index,
        range: unit.range,
        sp,
        characterId,
        layerGain: 1,
        dropped: false,
      })
    }
    t += beat
  }

  sortEvents(events)
  applyVoiceBudget(events, params.polyphony)
  const lastEventEnd = events.reduce((mx, e) => Math.max(mx, e.tMs + e.durMs), 0)
  return {
    mode: 'single',
    totalMs: Math.max(t, lastEventEnd) + TAIL_MS,
    events,
    grid,
    unitsByLevel: parsed.units,
  }
}

function buildLayered(parsed: ParsedText, params: AppParams): Timeline {
  const scaleFreqs = buildScaleFreqs(params.scale) // layered mode always quantises (Principle V)
  const wordCfg = params.layered.word
  const allWords = parsed.units.word
  const wordUnits = params.semantic.punctuationSounds ? allWords : allWords.filter(u => u.kind === 'text')

  const grid: GridCell[] = []
  const events: TimelineEvent[] = []
  let t = 0

  // ── word layer: rhythmic foreground locked to the beat grid ──
  for (const unit of wordUnits) {
    const beat = beatMs(unit, params, 1)
    grid.push(toCell(unit, t, beat))
    if (wordCfg.enabled) {
      const { sp, characterId } = mapUnit(unit, params, {
        level: 'word',
        scaleFreqs: unit.kind === 'punct' ? null : scaleFreqs,
        pan: wordCfg.pan,
        defaultCharacterId: wordCfg.soundCharacterId,
      })
      if (unit.kind === 'text') sp.duration = beat / 1000
      events.push({
        tMs: t,
        durMs: sp.duration * 1000,
        level: 'word',
        kind: unit.kind,
        unitIndex: unit.index,
        range: unit.range,
        sp,
        characterId,
        layerGain: wordCfg.gain,
        dropped: false,
      })
    }
    t += beat
  }
  const totalGridMs = t

  // ── backdrop layers: span-driven, aligned to the same word grid ──
  for (const level of BACKDROP_LEVELS) {
    const cfg = params.layered[level as BackdropLevel]
    if (!cfg.enabled) continue
    const spans = parsed.units[level]
    if (!spans.length) continue

    // span index for each grid cell (containment by range; -1 = between spans)
    const cellSpan: number[] = grid.map(cell => {
      // spans are sorted and non-overlapping — binary search the last span starting ≤ cell start
      let lo = 0, hi = spans.length - 1, found = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (spans[mid]!.range.start <= cell.range.start) { found = mid; lo = mid + 1 }
        else hi = mid - 1
      }
      if (found >= 0 && cell.range.start < spans[found]!.range.end) return found
      return -1
    })

    let prev = -1
    for (let i = 0; i < grid.length; i++) {
      const spanIdx = cellSpan[i]!
      const cell = grid[i]!
      if (spanIdx < 0) { prev = -1; continue }
      const span = spans[spanIdx]!
      const isTransition = spanIdx !== prev
      prev = spanIdx
      if (!isTransition && (cfg.sustainMode === 'hold' || cell.kind === 'punct')) continue

      const { sp, characterId } = mapUnit(span, params, {
        level,
        scaleFreqs,
        pan: cfg.pan,
        defaultCharacterId: cfg.soundCharacterId,
      })
      if (cfg.sustainMode === 'hold') {
        // exact coverage: from this cell to the end of the span's last cell
        let endMs = cell.tMs + cell.durMs
        for (let j = i + 1; j < grid.length && cellSpan[j] === spanIdx; j++) {
          endMs = grid[j]!.tMs + grid[j]!.durMs
        }
        sp.duration = (endMs - cell.tMs) / 1000
      } else {
        sp.duration = cell.durMs / 1000
      }
      events.push({
        tMs: cell.tMs,
        durMs: sp.duration * 1000,
        level,
        kind: 'text',
        unitIndex: span.index,
        range: span.range,
        sp,
        characterId,
        layerGain: cfg.gain,
        dropped: false,
      })
    }
  }

  sortEvents(events)
  applyVoiceBudget(events, params.polyphony)
  const lastEventEnd = events.reduce((mx, e) => Math.max(mx, e.tMs + e.durMs), 0)
  return {
    mode: 'layered',
    totalMs: Math.max(totalGridMs, lastEventEnd) + TAIL_MS,
    events,
    grid,
    unitsByLevel: parsed.units,
  }
}

export function buildTimeline(parsed: ParsedText, params: AppParams): Timeline {
  if (!parsed.text.trim() || !parsed.units.word.length) {
    return { mode: params.mode, totalMs: 0, events: [], grid: [], unitsByLevel: parsed.units }
  }
  return params.mode === 'layered' ? buildLayered(parsed, params) : buildSingle(parsed, params)
}

// Index of the grid cell active at posMs (binary search; -1 before start)
export function cellIndexAt(grid: readonly GridCell[], posMs: number): number {
  if (!grid.length || posMs < grid[0]!.tMs) return -1
  let lo = 0, hi = grid.length - 1, found = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (grid[mid]!.tMs <= posMs) { found = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return found
}
