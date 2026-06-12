import type { Timeline } from './types'
import { createMasterChain, scheduleEvent } from './soundEngine'
import { encodeWav } from './export'

// Offline WAV rendering + file download helpers (browser-only module).

const SAMPLE_RATE = 44100
const LEAD_IN_S = 0.05

// Renders the timeline through the exact same synthesis graph as live playback.
export async function renderWavBlob(timeline: Timeline): Promise<Blob> {
  const lengthS = Math.max(1, timeline.totalMs / 1000 + LEAD_IN_S + 0.3)
  const ctx = new OfflineAudioContext(2, Math.ceil(lengthS * SAMPLE_RATE), SAMPLE_RATE)
  const master = createMasterChain(ctx, false)
  for (const ev of timeline.events) {
    scheduleEvent(ctx, master.input, ev, LEAD_IN_S + ev.tMs / 1000)
  }
  const rendered = await ctx.startRendering()
  const channels = [rendered.getChannelData(0), rendered.getChannelData(1)]
  return new Blob([encodeWav(channels, SAMPLE_RATE)], { type: 'audio/wav' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// "The storm came fast" → "the-storm-came"
export function filenameSlug(text: string): string {
  const words = text.trim().toLowerCase().match(/[\p{L}\p{N}]+/gu)?.slice(0, 3) ?? []
  return words.length ? words.join('-') : 'untitled'
}
