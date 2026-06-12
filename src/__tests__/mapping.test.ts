import { describe, it, expect } from 'vitest'
import { mapUnit, hash01 } from '../mapping'
import { parseAll } from '../parser'
import { buildScaleFreqs } from '../scale'
import { DEFAULT_PARAMS } from '../types'
import type { AppParams } from '../types'

const params: AppParams = JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as AppParams

function wordUnit(text: string, source = text) {
  const parsed = parseAll(source)
  const u = parsed.units.word.find(w => w.text === text)
  if (!u) throw new Error(`word ${text} not found`)
  return u
}

const ctx = { level: 'word' as const, scaleFreqs: null, pan: 0, defaultCharacterId: null }

describe('mapUnit', () => {
  it('is deterministic and case-insensitive on the base hash', () => {
    expect(hash01('storm', 1)).toBe(hash01('storm', 1))
    expect(hash01('storm', 1)).not.toBe(hash01('storm', 2))
    const a = mapUnit(wordUnit('storm', 'the storm came'), params, ctx)
    const b = mapUnit(wordUnit('storm', 'the storm came'), params, ctx)
    expect(a).toEqual(b)
  })

  it('keyword rules override character and boost gain (Rule 7)', () => {
    const p: AppParams = { ...params, keywords: [{ word: 'storm', soundCharacterId: 'thunder', boost: 2 }] }
    const base = mapUnit(wordUnit('storm', 'a storm came'), params, ctx)
    const kw = mapUnit(wordUnit('storm', 'a storm came'), p, ctx)
    expect(kw.characterId).toBe('thunder')
    expect(kw.sp.gain).toBeGreaterThan(base.sp.gain)
  })

  it('category map assigns characters when enabled', () => {
    const u = wordUnit('wolf', 'the wolf ran')
    const on = mapUnit(u, params, ctx)
    expect(on.characterId).toBe('flute') // animal → flute by default
    const off = mapUnit(u, { ...params, semantic: { ...params.semantic, categoryToCharacter: false } }, ctx)
    expect(off.characterId).toBeNull()
  })

  it('quantises to scale members and zeroes detune', () => {
    const freqs = buildScaleFreqs({ quantize: true, root: 0, mode: 'pentatonic' })
    const m = mapUnit(wordUnit('storm', 'a storm'), params, { ...ctx, scaleFreqs: freqs })
    expect(freqs.some(f => Math.abs(f - m.sp.frequency) < 1e-9)).toBe(true)
    expect(m.sp.detune).toBe(0)
  })

  it('modal strength pulls pitch: must > could', () => {
    const could = mapUnit(wordUnit('could', 'it could be'), params, ctx)
    const must = mapUnit(wordUnit('must', 'it must be'), params, ctx)
    expect(must.sp.frequency).toBeGreaterThan(could.sp.frequency)
  })

  it('maps punctuation to percussive characters (Rule 6)', () => {
    const parsed = parseAll('Stop, now!')
    const comma = parsed.units.word.find(u => u.text === ',')!
    const bang = parsed.units.word.find(u => u.text === '!')!
    const mc = mapUnit(comma, params, ctx)
    const mb = mapUnit(bang, params, ctx)
    expect(mc.characterId).toBe('tick')
    expect(mb.characterId).toBe('thud')
    expect(mb.sp.gain).toBeGreaterThan(mc.sp.gain)
  })

  it('question sentences get an upward glide when contour is on', () => {
    const parsed = parseAll('Could they win?')
    const sent = parsed.units.sentence[0]!
    const m = mapUnit(sent, params, { ...ctx, level: 'sentence' })
    expect(m.sp.glideTo).toBeDefined()
    expect(m.sp.glideTo!).toBeGreaterThan(m.sp.frequency)
  })
})
