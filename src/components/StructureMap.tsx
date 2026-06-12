import { useEffect, useMemo, useRef } from 'react'
import type { ParseLevel, Timeline } from '../types'
import type { EngineState } from '../soundEngine'
import { cellIndexAt } from '../timeline'

interface Props {
  timeline: Timeline
  textLength: number
  posMs: number
  playState: EngineState
  activeLevel: ParseLevel
  onSeek: (tMs: number) => void
  theme: string
}

// Rows top → bottom: paragraph, sentence, phrase, word
const ROWS: readonly ParseLevel[] = ['paragraph', 'sentence', 'phrase', 'word']
const ROW_GLYPH: Record<string, string> = { paragraph: '¶', sentence: 'S', phrase: 'P', word: 'W' }
const GUTTER = 18

// A canvas map of the parsed structure: each row shows that level's units as
// blocks over the text axis; the playhead sweeps through during playback.
// Click anywhere to play from that word. Arrow keys nudge by one unit.
export default function StructureMap({
  timeline, textLength, posMs, playState, activeLevel, onSeek, theme,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticRef = useRef<HTMLCanvasElement | null>(null)

  const cellIdx = playState === 'idle' ? -1 : cellIndexAt(timeline.grid, posMs)

  // rebuild the static structure layer when content/theme/size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth * dpr
      const h = canvas.clientHeight * dpr
      if (!w || !h) return
      canvas.width = w
      canvas.height = h

      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const ctx = off.getContext('2d')!
      const styles = getComputedStyle(canvas)
      const phosphor = styles.getPropertyValue('--phosphor').trim() || '#7fff9a'
      const amber = styles.getPropertyValue('--amber').trim() || '#ffb347'
      const inkDim = styles.getPropertyValue('--ink-dim').trim() || '#8a7a65'

      const gutter = GUTTER * dpr
      const rowGap = 3 * dpr
      const rowH = (h - rowGap * (ROWS.length - 1)) / ROWS.length
      const span = Math.max(1, textLength)
      const xOf = (charPos: number) => gutter + (charPos / span) * (w - gutter - 2 * dpr)

      ctx.clearRect(0, 0, w, h)
      ctx.font = `${Math.round(rowH * 0.6)}px IBM Plex Mono, monospace`
      ctx.textBaseline = 'middle'

      ROWS.forEach((level, ri) => {
        const y = ri * (rowH + rowGap)
        const units = timeline.unitsByLevel[level] ?? []
        const isLayered = timeline.mode === 'layered'
        let alpha: number
        if (isLayered) alpha = level === 'word' ? 0.9 : 0.55
        else alpha = level === activeLevel ? 0.9 : 0.18
        const color = level === 'word' ? phosphor : amber

        ctx.fillStyle = inkDim
        ctx.globalAlpha = 0.7
        ctx.fillText(ROW_GLYPH[level]!, 2 * dpr, y + rowH / 2)

        ctx.globalAlpha = alpha
        for (const u of units) {
          const x0 = xOf(u.range.start)
          const x1 = xOf(u.range.end)
          const bw = Math.max(u.kind === 'punct' ? 1 * dpr : 1.5 * dpr, x1 - x0 - 1 * dpr)
          ctx.fillStyle = u.kind === 'punct' ? inkDim : color
          const padY = u.kind === 'punct' ? rowH * 0.3 : rowH * 0.12
          ctx.fillRect(x0, y + padY, bw, rowH - padY * 2)
        }
        ctx.globalAlpha = 1
      })

      staticRef.current = off
      drawDynamic()
    }

    const ro = new ResizeObserver(render)
    ro.observe(canvas)
    render()
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, textLength, theme, activeLevel])

  // dynamic layer: progress veil + playhead
  const drawDynamic = () => {
    const canvas = canvasRef.current
    const stat = staticRef.current
    if (!canvas || !stat) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width: w, height: h } = canvas
    if (!w || !h) return
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(stat, 0, 0)

    if (playState === 'idle' || !timeline.grid.length) return
    const dpr = window.devicePixelRatio || 1
    const gutter = GUTTER * dpr
    const span = Math.max(1, textLength)
    const idx = cellIndexAt(timeline.grid, posMs)
    if (idx < 0) return
    const cell = timeline.grid[idx]!
    const frac = cell.durMs > 0 ? Math.min(1, (posMs - cell.tMs) / cell.durMs) : 0
    const charPos = cell.range.start + (cell.range.end - cell.range.start) * frac
    const x = gutter + (charPos / span) * (w - gutter - 2 * dpr)

    ctx.fillStyle = theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)'
    ctx.fillRect(gutter, 0, Math.max(0, x - gutter), h)

    const styles = getComputedStyle(canvas)
    const phosphor = styles.getPropertyValue('--phosphor').trim() || '#7fff9a'
    ctx.strokeStyle = phosphor
    ctx.lineWidth = 1.5 * dpr
    ctx.shadowColor = phosphor
    ctx.shadowBlur = 5 * dpr
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // redraw the dynamic layer whenever position advances
  useEffect(drawDynamic)

  const seekToChar = (charPos: number) => {
    const grid = timeline.grid
    if (!grid.length) return
    let target = grid[grid.length - 1]!
    for (const cell of grid) {
      if (cell.range.end > charPos) { target = cell; break }
    }
    onSeek(target.tMs)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !timeline.grid.length) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frac = (x - GUTTER) / Math.max(1, rect.width - GUTTER - 2)
    seekToChar(Math.max(0, Math.min(1, frac)) * Math.max(1, textLength))
  }

  const handleKey = (e: React.KeyboardEvent) => {
    const grid = timeline.grid
    if (!grid.length) return
    const cur = Math.max(0, cellIdx)
    if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(grid[Math.min(grid.length - 1, cur + 1)]!.tMs) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(grid[Math.max(0, cur - 1)]!.tMs) }
    else if (e.key === 'Home') { e.preventDefault(); onSeek(grid[0]!.tMs) }
    else if (e.key === 'End') { e.preventDefault(); onSeek(grid[grid.length - 1]!.tMs) }
  }

  const valueText = useMemo(() => {
    if (!timeline.grid.length) return 'empty'
    const n = cellIdx >= 0 ? cellIdx + 1 : 0
    return `unit ${n} of ${timeline.grid.length}`
  }, [cellIdx, timeline.grid.length])

  return (
    <div className="osc-structmap">
      <div className="osc-structmap__label">structure map · click to play from a word</div>
      <canvas
        ref={canvasRef}
        className="osc-structmap__canvas"
        role="slider"
        aria-label="playback position in text structure"
        aria-valuemin={0}
        aria-valuemax={timeline.grid.length}
        aria-valuenow={cellIdx >= 0 ? cellIdx + 1 : 0}
        aria-valuetext={valueText}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKey}
      />
    </div>
  )
}
