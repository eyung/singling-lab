import nlp from 'compromise'
import type { CharRange, ParseLevel, ParseUnit, SemanticSignal, SentenceType, UnitKind, WordClass } from './types'
import {
  POSITIVE_WORDS, NEGATIVE_WORDS, HIGH_ENERGY_WORDS, LOW_ENERGY_WORDS, NEGATORS,
  MODAL_STRENGTH, FUNCTION_WORDS, countSyllables, frequencyTierOf, categoryOf,
} from './lexicon'

// Offset-exact parsing: for every unit, text.slice(range.start, range.end) === unit.text.
// Segmentation is implemented directly on the raw string (deterministic, Principle IX);
// compromise is used in a single full-text pass for POS tags only.

export interface ParsedText {
  text: string
  units: Record<ParseLevel, ParseUnit[]>
}

interface Token {
  text: string
  lower: string
  start: number
  end: number
  kind: UnitKind
}

// Words (incl. internal apostrophes), punctuation runs, dashes, brackets/quotes
const TOKEN_RE = /[\p{L}\p{N}]+(?:['’][\p{L}]+)*|[.,!?;:…]+|[—–]|[()"“”‘’']/gu

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'mt', 'vs', 'etc', 'eg', 'ie', 'jr', 'sr',
  'no', 'fig', 'al', 'inc', 'ltd', 'co', 'capt', 'gen', 'sen', 'rep', 'est', 'dept', 'approx',
])

const CONJUNCTIONS = new Set([
  'and', 'but', 'or', 'nor', 'yet', 'so', 'because', 'although', 'while',
  'since', 'if', 'when', 'unless', 'whereas', 'though',
])

const FUNCTION_TAGS = new Set([
  'Determiner', 'Preposition', 'Conjunction', 'Pronoun', 'Copula', 'Auxiliary', 'Negative', 'QuestionWord', 'Modal',
])

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(TOKEN_RE)) {
    const t = m[0]
    tokens.push({
      text: t,
      lower: t.toLowerCase(),
      start: m.index,
      end: m.index + t.length,
      kind: /^[\p{L}\p{N}]/u.test(t) ? 'text' : 'punct',
    })
  }
  return tokens
}

function trimmedRange(text: string, start: number, end: number): CharRange | null {
  let s = start
  let e = end
  while (s < e && /\s/.test(text[s]!)) s++
  while (e > s && /\s/.test(text[e - 1]!)) e--
  return e > s ? { start: s, end: e } : null
}

function paragraphRanges(text: string): CharRange[] {
  const ranges: CharRange[] = []
  let last = 0
  for (const m of text.matchAll(/\n[ \t]*\n+/g)) {
    const r = trimmedRange(text, last, m.index)
    if (r) ranges.push(r)
    last = m.index + m[0].length
  }
  const r = trimmedRange(text, last, text.length)
  if (r) ranges.push(r)
  return ranges
}

// Sentence boundary: terminator run (.!?…) + optional closing quotes/brackets,
// followed by whitespace or paragraph end. Pure-period runs are guarded against
// abbreviations ("Dr.") and single-letter initials ("J. Smith").
function sentenceRanges(text: string, para: CharRange): CharRange[] {
  const ranges: CharRange[] = []
  const re = /[.!?…]+["”’')\]]*/g
  re.lastIndex = para.start
  let segStart = para.start
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null && m.index < para.end) {
    const endIdx = Math.min(m.index + m[0].length, para.end)
    let boundary = true
    if (endIdx < para.end && !/\s/.test(text[endIdx]!)) boundary = false
    if (boundary && m[0][0] === '.' && !/[!?…]/.test(m[0])) {
      let ws = m.index
      while (ws > segStart && /[\p{L}\p{N}]/u.test(text[ws - 1]!)) ws--
      const wordBefore = text.slice(ws, m.index)
      if (wordBefore.length === 1 && /[\p{Lu}]/u.test(wordBefore)) boundary = false
      else if (ABBREVIATIONS.has(wordBefore.toLowerCase())) boundary = false
    }
    if (boundary) {
      const r = trimmedRange(text, segStart, endIdx)
      if (r) ranges.push(r)
      segStart = endIdx
    }
  }
  const tail = trimmedRange(text, segStart, para.end)
  if (tail) ranges.push(tail)
  return ranges
}

// Phrase boundaries inside a sentence: splitting punctuation (, ; : — – ( ) . ! ? …)
// and coordinating/subordinating conjunctions. A conjunction closes the current
// phrase and opens the next one (it attaches forward — no orphan units).
function phraseRanges(tokens: Token[]): CharRange[] {
  const ranges: CharRange[] = []
  let cur: Token[] = []
  let wordCount = 0
  const close = () => {
    if (wordCount > 0) {
      ranges.push({ start: cur[0]!.start, end: cur[cur.length - 1]!.end })
    }
    cur = []
    wordCount = 0
  }
  for (const tok of tokens) {
    if (tok.kind === 'punct') {
      if (/[,;:—–().!?…]/.test(tok.text[0]!)) close()
      else if (cur.length) cur.push(tok)
    } else if (CONJUNCTIONS.has(tok.lower) && wordCount > 0) {
      close()
      cur = [tok]
      wordCount = 1
    } else {
      cur.push(tok)
      wordCount++
    }
  }
  close()
  return ranges
}

// Single full-text compromise pass → POS tags keyed by term start offset
function buildTagMap(text: string): Map<number, string[]> {
  const map = new Map<number, string[]>()
  interface CTerm { offset?: { start: number }; tags?: string[] }
  interface CSentence { terms: CTerm[] }
  const json = nlp(text).json({ offset: true }) as unknown as CSentence[]
  for (const s of json) {
    for (const t of s.terms) {
      if (t.offset) map.set(t.offset.start, t.tags ?? [])
    }
  }
  return map
}

// Word-class resolution order (documented): modal → function-word list / function
// tags → adverb → adjective → verb → noun → suffix heuristics.
function classifyWord(lower: string, tags: string[]): WordClass {
  if (lower in MODAL_STRENGTH) return 'function'
  if (FUNCTION_WORDS.has(lower)) return 'function'
  if (tags.some(t => FUNCTION_TAGS.has(t))) return 'function'
  if (tags.includes('Adverb')) return 'adverb'
  if (tags.includes('Adjective')) return 'adjective'
  if (tags.includes('Verb')) return 'verb'
  if (tags.includes('Noun') || tags.includes('Value')) return 'noun'
  if (lower.endsWith('ly')) return 'adverb'
  if (/(?:ous|ful|ive|able|ible|al|ic)$/.test(lower)) return 'adjective'
  if (/(?:ize|ise|ate|ify)$/.test(lower)) return 'verb'
  return 'noun'
}

function categoryFor(lower: string, tags: string[]): string | undefined {
  const curated = categoryOf(lower)
  if (curated) return curated
  if (tags.includes('Person')) return 'person'
  if (tags.includes('Place')) return 'place'
  if (tags.includes('Date')) return 'time'
  if (tags.includes('Value') || tags.includes('Cardinal')) return 'number'
  return undefined
}

const NEUTRAL_PUNCT_SEMANTIC: Omit<SemanticSignal, 'wordLength'> = {
  sentiment: 0, energy: 0.3, tags: [], syllables: 0,
}

interface WordAnalysis {
  token: Token
  signal: SemanticSignal
  sentimentScore: number   // ±1 after negation, for span aggregation
  highEnergy: boolean
  lowEnergy: boolean
}

// Per-word semantics with a 3-word negation window: "not happy" flips happy → negative.
function analyzeWords(tokens: Token[], tagMap: Map<number, string[]>): Map<number, WordAnalysis> {
  const out = new Map<number, WordAnalysis>()
  let negWindow = 0
  for (const tok of tokens) {
    if (tok.kind !== 'text') continue
    const lower = tok.lower
    const tags = tagMap.get(tok.start) ?? []
    let score = POSITIVE_WORDS.has(lower) ? 1 : NEGATIVE_WORDS.has(lower) ? -1 : 0
    if (NEGATORS.has(lower)) {
      negWindow = 3
    } else if (negWindow > 0) {
      if (score !== 0) { score = -score; negWindow = 0 }
      else negWindow--
    }
    const syllables = countSyllables(tok.text)
    const high = HIGH_ENERGY_WORDS.has(lower)
    const low = LOW_ENERGY_WORDS.has(lower)
    const wordClass = classifyWord(lower, tags)
    const isFunction = wordClass === 'function'
    const energy = Math.max(0, Math.min(1,
      0.3 + (high ? 0.35 : 0) - (low ? 0.2 : 0) + Math.min(0.2, (syllables - 1) * 0.05)
    ))
    const signal: SemanticSignal = {
      sentiment: isFunction ? 0 : score,
      energy: isFunction ? 0.3 : energy,
      tags: tags.slice(0, 6),
      wordLength: tok.text.length,
      syllables,
      wordClass,
      frequencyTier: frequencyTierOf(lower),
    }
    const modal = MODAL_STRENGTH[lower]
    if (modal !== undefined) signal.modalStrength = modal
    const cat = categoryFor(lower, tags)
    if (cat) signal.category = cat
    out.set(tok.start, {
      token: tok,
      signal,
      sentimentScore: isFunction ? 0 : score,
      highEnergy: high,
      lowEnergy: low,
    })
  }
  return out
}

function sentenceTypeOf(rangeText: string): SentenceType {
  const tail = rangeText.match(/[.!?…]+["”’')\]]*$/)?.[0] ?? ''
  if (tail.includes('?')) return 'question'
  if (tail.includes('!')) return 'exclamation'
  return 'declarative'
}

// Aggregate word analyses inside a span into a span-level SemanticSignal.
function aggregateSpan(
  text: string,
  range: CharRange,
  words: WordAnalysis[],
  sentenceType?: SentenceType,
): SemanticSignal {
  const n = words.length
  let score = 0
  let high = 0
  let low = 0
  let syllables = 0
  for (const w of words) {
    score += w.sentimentScore
    if (w.highEnergy) high++
    if (w.lowEnergy) low++
    syllables += w.signal.syllables
  }
  const slice = text.slice(range.start, range.end)
  const sentiment = Math.max(-1, Math.min(1, n ? score / n : 0))
  const energy = Math.max(0, Math.min(1, 0.3 + high * 0.2 - low * 0.1 + n * 0.02))
  const tags: string[] = []
  if (sentenceType === 'question') tags.push('question')
  if (sentenceType === 'exclamation') tags.push('exclamation')
  const signal: SemanticSignal = {
    sentiment,
    energy,
    tags,
    wordLength: slice.length,
    syllables,
  }
  if (sentenceType) signal.sentenceType = sentenceType
  return signal
}

export function parseAll(text: string): ParsedText {
  const empty: ParsedText = {
    text,
    units: { letter: [], word: [], phrase: [], sentence: [], paragraph: [] },
  }
  if (!text.trim()) return empty

  const tokens = tokenize(text)
  const tagMap = buildTagMap(text)
  const wordAnalyses = analyzeWords(tokens, tagMap)

  // ── word level: words + punctuation marks, in document order ──
  const wordUnits: ParseUnit[] = tokens.map((tok, index) => {
    if (tok.kind === 'punct') {
      return {
        level: 'word' as const,
        kind: 'punct' as const,
        text: tok.text,
        index,
        range: { start: tok.start, end: tok.end },
        semantic: { ...NEUTRAL_PUNCT_SEMANTIC, tags: [], wordLength: tok.text.length },
      }
    }
    const wa = wordAnalyses.get(tok.start)!
    return {
      level: 'word' as const,
      kind: 'text' as const,
      text: tok.text,
      index,
      range: { start: tok.start, end: tok.end },
      semantic: wa.signal,
    }
  })

  // ── letter level: every non-whitespace character ──
  const letterUnits: ParseUnit[] = []
  for (const m of text.matchAll(/\S/gu)) {
    const ch = m[0]
    letterUnits.push({
      level: 'letter',
      kind: /[\p{L}\p{N}]/u.test(ch) ? 'text' : 'punct',
      text: ch,
      index: letterUnits.length,
      range: { start: m.index, end: m.index + ch.length },
      semantic: {
        sentiment: 0, energy: 0.3, tags: [],
        wordLength: 1, syllables: 1,
      },
    })
  }

  // ── structural spans ──
  const paraRanges = paragraphRanges(text)
  const sentRanges = paraRanges.flatMap(p => sentenceRanges(text, p))

  const textTokens = tokens.filter(t => t.kind === 'text')
  const wordsInRange = (range: CharRange): WordAnalysis[] => {
    const out: WordAnalysis[] = []
    for (const tok of textTokens) {
      if (tok.start >= range.end) break
      if (tok.start >= range.start && tok.end <= range.end) {
        const wa = wordAnalyses.get(tok.start)
        if (wa) out.push(wa)
      }
    }
    return out
  }

  const tokensInRange = (range: CharRange): Token[] =>
    tokens.filter(t => t.start >= range.start && t.end <= range.end)

  const phraseRangeList = sentRanges.flatMap(s => phraseRanges(tokensInRange(s)))

  const makeSpanUnits = (level: ParseLevel, ranges: CharRange[], withType: boolean): ParseUnit[] =>
    ranges.map((range, index) => {
      const slice = text.slice(range.start, range.end)
      const st = withType ? sentenceTypeOf(slice) : undefined
      return {
        level,
        kind: 'text' as const,
        text: slice,
        index,
        range,
        semantic: aggregateSpan(text, range, wordsInRange(range), st),
      }
    })

  return {
    text,
    units: {
      letter: letterUnits,
      word: wordUnits,
      phrase: makeSpanUnits('phrase', phraseRangeList, false),
      sentence: makeSpanUnits('sentence', sentRanges, true),
      paragraph: makeSpanUnits('paragraph', paraRanges, false),
    },
  }
}
