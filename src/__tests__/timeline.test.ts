import { describe, it, expect } from 'vitest'
import { parseAll } from '../parser'
import { buildTimeline, cellIndexAt } from '../timeline'
import { buildScaleFreqs } from '../scale'
import { DEFAULT_PARAMS } from '../types'
import type { AppParams } from '../types'

const TEXT = `The morning was calm, and the harbour lay bright. Small boats drifted out, one by one.

But the storm came fast! Could the little fleet survive?`

function freshParams(): AppParams {
  return JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as AppParams
}

describe('buildTimeline — layered', () => {
  const parsed = parseAll(TEXT)
  const params: AppParams = { ...freshParams(), mode: 'layered' }
  const tl = buildTimeline(parsed, params)

  it('is deterministic', () => {
    expect(JSON.stringify(buildTimeline(parsed, params))).toBe(JSON.stringify(tl))
  })

  it('every backdrop event starts exactly on a word-grid cell', () => {
    const cellTimes = new Set(tl.grid.map(c => c.tMs.toFixed(4)))
    const backdrop = tl.events.filter(e => e.level !== 'word')
    expect(backdrop.length).toBeGreaterThan(0)
    for (const ev of backdrop) {
      expect(cellTimes.has(ev.tMs.toFixed(4))).toBe(true)
    }
  })

  it('hold spans cover their words exactly to the end of the last cell', () => {
    const paraEvents = tl.events.filter(e => e.level === 'paragraph')
    expect(paraEvents.length).toBe(parsed.units.paragraph.length)
    const last = tl.grid[tl.grid.length - 1]!
    const lastPara = paraEvents[paraEvents.length - 1]!
    expect(lastPara.tMs + lastPara.durMs).toBeCloseTo(last.tMs + last.durMs, 4)
  })

  it('all pitched layered events are quantised to the configured scale', () => {
    const freqs = buildScaleFreqs(params.scale)
    for (const ev of tl.events) {
      if (ev.kind === 'punct') continue
      expect(freqs.some(f => Math.abs(f - ev.sp.frequency) < 1e-6)).toBe(true)
    }
  })

  it('voice budget drops deterministically under low polyphony', () => {
    const tight = buildTimeline(parsed, { ...params, polyphony: 1 })
    const dropped = tight.events.filter(e => e.dropped).length
    expect(dropped).toBeGreaterThan(0)
    expect(JSON.stringify(buildTimeline(parsed, { ...params, polyphony: 1 }))).toBe(JSON.stringify(tight))
    const roomy = buildTimeline(parsed, { ...params, polyphony: 16 })
    expect(roomy.events.filter(e => e.dropped).length).toBeLessThan(dropped)
  })

  it('punctuation cells vanish when punctuationSounds is off', () => {
    const p = freshParams()
    p.mode = 'layered'
    p.semantic.punctuationSounds = false
    const noPunct = buildTimeline(parsed, p)
    expect(noPunct.grid.every(c => c.kind === 'text')).toBe(true)
    expect(noPunct.grid.length).toBeLessThan(tl.grid.length)
  })

  it('disabled layers stay silent', () => {
    const p = freshParams()
    p.mode = 'layered'
    p.layered.sentence.enabled = false
    const noSent = buildTimeline(parsed, p)
    expect(noSent.events.some(e => e.level === 'sentence')).toBe(false)
    expect(noSent.events.some(e => e.level === 'phrase')).toBe(true)
  })
})

describe('buildTimeline — single', () => {
  const parsed = parseAll(TEXT)

  it('disabled level keeps its timing slots but emits no events (Principle V/VI)', () => {
    const p = freshParams()
    p.parseLevel = 'word'
    p.levels.word.enabled = false
    const tl = buildTimeline(parsed, p)
    expect(tl.events).toHaveLength(0)
    expect(tl.grid.length).toBeGreaterThan(0)
    expect(tl.totalMs).toBeGreaterThan(0)
  })

  it('sentence mode paces by the sentence rate multiplier', () => {
    const p = freshParams()
    p.parseLevel = 'sentence'
    p.semantic.energyToTempo = false
    const tl = buildTimeline(parsed, p)
    expect(tl.grid[0]!.durMs).toBeCloseTo(p.tempo * p.levels.sentence.rate, 4)
  })

  it('quantize=false leaves frequencies unquantised in single mode', () => {
    const p = freshParams()
    p.parseLevel = 'word'
    p.scale.quantize = true
    const freqs = buildScaleFreqs(p.scale)
    const quant = buildTimeline(parsed, p)
    const pitched = quant.events.filter(e => e.kind === 'text')
    expect(pitched.every(e => freqs.some(f => Math.abs(f - e.sp.frequency) < 1e-6))).toBe(true)
  })

  it('cellIndexAt finds the active cell', () => {
    const p = freshParams()
    const tl = buildTimeline(parsed, p)
    expect(cellIndexAt(tl.grid, -5)).toBe(-1)
    expect(cellIndexAt(tl.grid, tl.grid[0]!.tMs)).toBe(0)
    const mid = tl.grid[3]!.tMs + 1
    expect(cellIndexAt(tl.grid, mid)).toBe(3)
  })
})
