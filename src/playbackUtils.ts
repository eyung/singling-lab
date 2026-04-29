import type { ParseUnit, AppParams, CharRange } from './types'

/**
 * Locates each unit's text inside `text` by walking forward with indexOf,
 * returning a CharRange[] in document order (same length as units).
 */
export function findTextOffsets(text: string, units: ParseUnit[]): CharRange[] {
  const offsets: CharRange[] = []
  let searchFrom = 0
  for (const unit of units) {
    const idx = text.indexOf(unit.text, searchFrom)
    if (idx >= 0) {
      offsets.push({ start: idx, end: idx + unit.text.length })
      searchFrom = idx + unit.text.length
    } else {
      offsets.push({ start: searchFrom, end: searchFrom })
    }
  }
  return offsets
}

/**
 * For each word offset, finds the index of the last span whose start ≤ wordOffset.start.
 * Returns number[] of length wordOffsets.length.
 */
export function buildWordToSpanMap(wordOffsets: CharRange[], spanOffsets: CharRange[]): number[] {
  if (!spanOffsets.length) return wordOffsets.map(() => 0)
  return wordOffsets.map(wo => {
    let spanIdx = 0
    for (let si = 0; si < spanOffsets.length; si++) {
      if (spanOffsets[si]!.start <= wo.start) spanIdx = si
    }
    return spanIdx
  })
}

/**
 * Returns the inter-beat interval in ms for a given word unit,
 * applying the energyToTempo modifier if enabled.
 */
export function computeBeatMs(wordUnit: ParseUnit, params: AppParams): number {
  return params.tempo * (
    params.semantic.energyToTempo
      ? Math.max(0.4, 1 - wordUnit.semantic.energy * 0.5)
      : 1
  )
}
