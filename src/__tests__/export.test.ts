import { describe, it, expect } from 'vitest'
import { encodeWav, buildMidi, buildParsedTxt } from '../export'
import { parseAll } from '../parser'
import { buildTimeline } from '../timeline'
import { DEFAULT_PARAMS } from '../types'
import type { AppParams } from '../types'

describe('encodeWav', () => {
  it('writes a valid 16-bit stereo RIFF header', () => {
    const left = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2])
    const right = new Float32Array(7)
    const buf = encodeWav([left, right], 44100)
    const view = new DataView(buf)
    const str = (off: number, len: number) =>
      Array.from({ length: len }, (_, i) => String.fromCharCode(view.getUint8(off + i))).join('')
    expect(str(0, 4)).toBe('RIFF')
    expect(str(8, 4)).toBe('WAVE')
    expect(str(12, 4)).toBe('fmt ')
    expect(str(36, 4)).toBe('data')
    expect(view.getUint16(22, true)).toBe(2)        // channels
    expect(view.getUint32(24, true)).toBe(44100)    // sample rate
    expect(view.getUint32(40, true)).toBe(7 * 2 * 2) // data bytes
    expect(buf.byteLength).toBe(44 + 28)
    // clipping: ±2 clamps to int16 extremes
    expect(view.getInt16(44 + 5 * 4, true)).toBe(0x7fff)
    expect(view.getInt16(44 + 6 * 4, true)).toBe(-0x8000)
  })
})

describe('buildMidi', () => {
  const params: AppParams = { ...(JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as AppParams), mode: 'layered' }
  const tl = buildTimeline(parseAll('The wolf ran fast! Could it win? It must.'), params)
  const midi = buildMidi(tl, params)

  it('starts with MThd and declares matching MTrk chunks', () => {
    const str = (off: number) => String.fromCharCode(midi[off]!, midi[off + 1]!, midi[off + 2]!, midi[off + 3]!)
    expect(str(0)).toBe('MThd')
    const declared = (midi[10]! << 8) | midi[11]!
    let count = 0
    for (let i = 0; i < midi.length - 3; i++) {
      if (midi[i] === 0x4d && midi[i + 1] === 0x54 && midi[i + 2] === 0x72 && midi[i + 3] === 0x6b) count++
    }
    expect(count).toBe(declared)
    expect(declared).toBeGreaterThanOrEqual(3) // meta + word + at least one backdrop
  })

  it('every track ends with an end-of-track meta', () => {
    // last three bytes of the file are FF 2F 00
    expect(midi[midi.length - 3]).toBe(0xff)
    expect(midi[midi.length - 2]).toBe(0x2f)
    expect(midi[midi.length - 1]).toBe(0x00)
  })
})

describe('buildParsedTxt', () => {
  it('reports all four levels in layered mode with semantic annotations', () => {
    const params: AppParams = { ...(JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as AppParams), mode: 'layered' }
    const text = 'The wolf ran. It was not happy!'
    const tl = buildTimeline(parseAll(text), params)
    const txt = buildParsedTxt(tl, params, text)
    expect(txt).toContain('── word')
    expect(txt).toContain('── phrase')
    expect(txt).toContain('── sentence')
    expect(txt).toContain('── paragraph')
    expect(txt).toContain('cat:animal')
    expect(txt).toContain('punctuation')
  })
})
