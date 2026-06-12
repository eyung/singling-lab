import { describe, it, expect } from 'vitest'
import { parseAll } from '../parser'
import { PARSE_LEVELS } from '../types'

const GNARLY = `Dr. Smith could not swim, but he was happy. The quick dogs ran — and the birds flew! Could they win? "Yes," she said.

A new paragraph begins here; it drifts slowly, like the ocean.`

describe('parseAll', () => {
  it('every unit range slices back to its exact text, at all levels', () => {
    const parsed = parseAll(GNARLY)
    for (const level of PARSE_LEVELS) {
      const units = parsed.units[level]
      expect(units.length).toBeGreaterThan(0)
      for (const u of units) {
        expect(GNARLY.slice(u.range.start, u.range.end)).toBe(u.text)
      }
    }
  })

  it('is deterministic', () => {
    const a = parseAll(GNARLY)
    const b = parseAll(GNARLY)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('does not split sentences at abbreviations or initials', () => {
    const parsed = parseAll('Dr. Smith went home. He slept. J. Doe waved.')
    const texts = parsed.units.sentence.map(u => u.text)
    expect(texts).toHaveLength(3)
    expect(texts[0]).toBe('Dr. Smith went home.')
    expect(texts[2]).toBe('J. Doe waved.')
  })

  it('splits sentences at ! and ? and tags sentence type', () => {
    const parsed = parseAll('It works! Does it work? It works.')
    const sents = parsed.units.sentence
    expect(sents).toHaveLength(3)
    expect(sents[0]!.semantic.sentenceType).toBe('exclamation')
    expect(sents[1]!.semantic.sentenceType).toBe('question')
    expect(sents[2]!.semantic.sentenceType).toBe('declarative')
  })

  it('attaches conjunctions to the following phrase — no orphan conjunction units', () => {
    const parsed = parseAll('I ran fast and I jumped high.')
    const texts = parsed.units.phrase.map(u => u.text)
    expect(texts).toEqual(['I ran fast', 'and I jumped high'])
  })

  it('emits punctuation marks as word-level punct units', () => {
    const parsed = parseAll('Stop, now!')
    const kinds = parsed.units.word.map(u => `${u.text}:${u.kind}`)
    expect(kinds).toEqual(['Stop:text', ',:punct', 'now:text', '!:punct'])
  })

  it('keeps contractions whole at word level', () => {
    const parsed = parseAll("don't stop")
    const words = parsed.units.word.filter(u => u.kind === 'text').map(u => u.text)
    expect(words).toEqual(["don't", 'stop'])
  })

  it('flips sentiment under negation', () => {
    const parsed = parseAll('she was not happy today')
    const happy = parsed.units.word.find(u => u.text === 'happy')!
    expect(happy.semantic.sentiment).toBe(-1)
  })

  it('assigns modal strength per the constitution scale', () => {
    const parsed = parseAll('it could happen and it must happen')
    const could = parsed.units.word.find(u => u.text === 'could')!
    const must = parsed.units.word.find(u => u.text === 'must')!
    expect(could.semantic.modalStrength).toBeCloseTo(0.15)
    expect(must.semantic.modalStrength).toBeCloseTo(0.95)
    expect(could.semantic.wordClass).toBe('function')
  })

  it('gives function words neutral sentiment and energy (Rule 5)', () => {
    const parsed = parseAll('the storm destroyed the beautiful garden')
    const the = parsed.units.word.find(u => u.text === 'the')!
    expect(the.semantic.wordClass).toBe('function')
    expect(the.semantic.sentiment).toBe(0)
    expect(the.semantic.energy).toBeCloseTo(0.3)
  })

  it('detects semantic categories from curated lexicons', () => {
    const parsed = parseAll('the wolf crossed the river at dawn')
    const wolf = parsed.units.word.find(u => u.text === 'wolf')!
    const river = parsed.units.word.find(u => u.text === 'river')!
    expect(wolf.semantic.category).toBe('animal')
    expect(river.semantic.category).toBe('nature')
  })

  it('splits paragraphs on blank lines', () => {
    const parsed = parseAll('First block here.\n\nSecond block here.')
    expect(parsed.units.paragraph).toHaveLength(2)
  })

  it('returns empty units for whitespace-only input', () => {
    const parsed = parseAll('   \n\n  ')
    for (const level of PARSE_LEVELS) {
      expect(parsed.units[level]).toHaveLength(0)
    }
  })
})
