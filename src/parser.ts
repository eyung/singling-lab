import nlp from 'compromise'
import type { ParseLevel, ParseUnit, SemanticSignal } from './types'

// Positive/negative word lists for lightweight sentiment
const POSITIVE_WORDS = new Set([
  'good','great','love','happy','joy','bright','warm','hope','kind','beautiful',
  'wonderful','excellent','amazing','fantastic','positive','light','peace','calm',
  'gentle','lovely','sweet','pleasant','delight','bliss','radiant','vibrant',
])
const NEGATIVE_WORDS = new Set([
  'bad','hate','sad','dark','cold','fear','anger','pain','harsh','ugly',
  'terrible','horrible','awful','negative','heavy','war','death','violence',
  'bitter','cruel','misery','dread','despair','grim','bleak','toxic',
])
const HIGH_ENERGY_WORDS = new Set([
  'fast','rush','burst','explode','scream','shout','race','crash','blast','fury',
  'intense','surge','wild','fierce','storm','fire','strike','urgent','rapid',
])

function analyzeSentiment(text: string): SemanticSignal {
  const words = text.toLowerCase().match(/\b\w+\b/g) ?? []
  let score = 0
  let energy = 0.3 // baseline

  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) score++
    if (NEGATIVE_WORDS.has(w)) score--
    if (HIGH_ENERGY_WORDS.has(w)) energy += 0.2
  }

  const doc = nlp(text)
  const tags: string[] = []
  if (doc.has('#Noun')) tags.push('noun')
  if (doc.has('#Verb')) tags.push('verb')
  if (doc.has('#Adjective')) tags.push('adjective')
  if (doc.has('#Question')) tags.push('question')
  if (doc.has('#Negative')) { tags.push('negative'); score-- }

  const wordCount = words.length || 1
  const normalizedSentiment = Math.max(-1, Math.min(1, score / wordCount))
  const normalizedEnergy = Math.max(0, Math.min(1, energy + words.length * 0.02))

  return { sentiment: normalizedSentiment, energy: normalizedEnergy, tags }
}

function splitPhrases(sentence: string): string[] {
  // Split on commas, semicolons, colons, dashes, and conjunctions
  return sentence
    .split(/[,;:—–]|\b(and|but|or|nor|yet|so|because|although|while|since|if)\b/i)
    .map(s => s?.trim())
    .filter(s => s && s.length > 1)
}

export function parseText(text: string, level: ParseLevel): ParseUnit[] {
  if (!text.trim()) return []

  const doc = nlp(text)
  let segments: string[] = []

  switch (level) {
    case 'letter':
      segments = text.replace(/\s+/g, '').split('')
      break
    case 'word':
      segments = (text.match(/\b\w+\b/g) ?? [])
      break
    case 'phrase':
      segments = doc.sentences().out('array').flatMap(splitPhrases)
      break
    case 'sentence':
      segments = doc.sentences().out('array')
      break
    case 'paragraph':
      segments = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
      break
  }

  return segments.map((text, index) => ({
    level,
    text,
    index,
    semantic: analyzeSentiment(text),
  }))
}
