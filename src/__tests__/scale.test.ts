import { describe, it, expect } from 'vitest'
import { buildScaleFreqs, quantiseFreq, midiToFreq } from '../scale'

describe('scale quantisation', () => {
  it('C major contains A440 and C261.63, not C#', () => {
    const freqs = buildScaleFreqs({ quantize: true, root: 0, mode: 'major' })
    const has = (f: number) => freqs.some(x => Math.abs(x - f) < 0.01)
    expect(has(440)).toBe(true)
    expect(has(261.63)).toBe(true) // C4 = 261.6256
    expect(freqs.some(x => Math.abs(x - midiToFreq(60)) < 1e-9)).toBe(true)
    expect(freqs.some(x => Math.abs(x - midiToFreq(61)) < 1e-9)).toBe(false) // C#4
  })

  it('quantises to the nearest member in log space', () => {
    const freqs = buildScaleFreqs({ quantize: true, root: 0, mode: 'major' })
    expect(quantiseFreq(445, freqs)).toBeCloseTo(440, 1)
    const q = quantiseFreq(265, freqs)
    expect(q).toBeCloseTo(midiToFreq(60), 3) // → C4
  })

  it('root shifts the member set', () => {
    const dMajor = buildScaleFreqs({ quantize: true, root: 2, mode: 'major' })
    expect(dMajor.some(x => Math.abs(x - midiToFreq(61)) < 1e-9)).toBe(true)  // C# ∈ D major
    expect(dMajor.some(x => Math.abs(x - midiToFreq(60)) < 1e-9)).toBe(false) // C ∉ D major
  })

  it('pentatonic has 5 members per octave, chromatic 12', () => {
    const pent = buildScaleFreqs({ quantize: true, root: 0, mode: 'pentatonic' })
    const chrom = buildScaleFreqs({ quantize: true, root: 0, mode: 'chromatic' })
    const inOctave = (fs: number[]) => fs.filter(f => f >= midiToFreq(60) - 0.01 && f < midiToFreq(72) - 0.01).length
    expect(inOctave(pent)).toBe(5)
    expect(inOctave(chrom)).toBe(12)
  })

  it('clamps out-of-range frequencies to the nearest end', () => {
    const freqs = buildScaleFreqs({ quantize: true, root: 0, mode: 'major' })
    expect(quantiseFreq(5, freqs)).toBe(freqs[0])
    expect(quantiseFreq(99999, freqs)).toBe(freqs[freqs.length - 1])
  })
})
