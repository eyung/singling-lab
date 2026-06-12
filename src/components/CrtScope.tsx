import { useEffect, useRef } from 'react'
import type { AppParams, GridCell, LayeredLevel } from '../types'
import { LAYERED_LEVELS } from '../types'
import { scaleLabel } from '../scale'

export interface ScopeStats {
  words: number
  phrases: number
  sentences: number
  paragraphs: number
}

interface Props {
  playing: boolean
  paused: boolean
  posMs: number
  totalMs: number
  cell: GridCell | null
  activity: Partial<Record<LayeredLevel, boolean>>
  params: AppParams
  stats: ScopeStats
  theme: string
  getAnalyser: () => AnalyserNode | null
}

const LAYER_GLYPH: Record<LayeredLevel, string> = { word: 'W', phrase: 'P', sentence: 'S', paragraph: '¶' }

function fmtTime(ms: number): string {
  const s = Math.max(0, ms) / 1000
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`
}

// Compact semantic inspector line for the active unit (the literacoustic readout)
function inspect(cell: GridCell): string {
  const s = cell.semantic
  if (cell.kind === 'punct') return `punctuation · ${cell.text}`
  const parts = [
    `sent ${s.sentiment >= 0 ? '+' : ''}${s.sentiment.toFixed(2)}`,
    `nrg ${s.energy.toFixed(2)}`,
  ]
  if (s.wordClass) parts.push(s.wordClass)
  if (s.frequencyTier) parts.push(s.frequencyTier)
  if (s.syllables > 0) parts.push(`${s.syllables} syl`)
  if (s.modalStrength !== undefined) parts.push(`modal ${s.modalStrength.toFixed(2)}`)
  if (s.category) parts.push(s.category)
  if (s.sentenceType === 'question') parts.push('question ↗')
  if (s.sentenceType === 'exclamation') parts.push('exclaim !')
  return parts.join(' · ')
}

export default function CrtScope({
  playing, paused, posMs, totalMs, cell, activity, params, stats, theme, getAnalyser,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playingRef = useRef(playing)
  playingRef.current = playing

  // Self-animating phosphor trace: real waveform when the analyser is live,
  // a gentle idle scan otherwise. Trails come from partial-alpha clearing.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    // the CRT face is always dark (see .osc-crt var overrides), so the fade
    // veil that creates phosphor persistence is constant across themes
    const styles = getComputedStyle(canvas)
    const phosphor = styles.getPropertyValue('--phosphor').trim() || '#7fff9a'
    const fade = 'rgba(4, 10, 4, 0.28)'

    let raf = 0
    let running = true
    const buf = new Float32Array(2048)

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w && h && (canvas.width !== w * dpr || canvas.height !== h * dpr)) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const draw = (t: number) => {
      if (!running) return
      const w = canvas.width
      const h = canvas.height
      if (w && h) {
        ctx2d.fillStyle = fade
        ctx2d.fillRect(0, 0, w, h)
        ctx2d.strokeStyle = phosphor
        ctx2d.lineWidth = Math.max(1.4, h / 130)
        ctx2d.shadowColor = phosphor
        ctx2d.shadowBlur = 6
        ctx2d.beginPath()

        const analyser = getAnalyser()
        if (analyser && playingRef.current) {
          analyser.getFloatTimeDomainData(buf)
          const n = buf.length
          for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * w
            const y = h / 2 - buf[i]! * h * 0.46
            if (i === 0) ctx2d.moveTo(x, y)
            else ctx2d.lineTo(x, y)
          }
        } else {
          const phase = t / 900
          for (let i = 0; i <= 120; i++) {
            const x = (i / 120) * w
            const y = h / 2 - Math.sin(phase + (i / 120) * Math.PI * 4) * h * 0.05
              * (1 + 0.4 * Math.sin(t / 1400))
            if (i === 0) ctx2d.moveTo(x, y)
            else ctx2d.lineTo(x, y)
          }
        }
        ctx2d.stroke()
        ctx2d.shadowBlur = 0
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect() }
  }, [getAnalyser, theme])

  const isLayered = params.mode === 'layered'
  const chInfo = isLayered
    ? `layered · ${LAYERED_LEVELS.filter(l => params.layered[l].enabled).length} layers`
    : `single · ${params.parseLevel} · ${params.levels[params.parseLevel].waveform}`

  return (
    <div className="osc-crt-wrap">
      <div className="osc-crt">
        <div className="osc-grid" />
        <div className="osc-crt-inner">
          <div className="osc-crt-header">
            <span>ch.1 · {chInfo}</span>
            <span>
              {playing
                ? <>● run<span className="blink">_</span></>
                : paused
                  ? <>◐ hold<span className="blink">_</span></>
                  : <>○ standby<span className="blink">_</span></>}
            </span>
          </div>
          <div className="osc-wave">
            <canvas ref={canvasRef} className="osc-wave__canvas" aria-hidden="true" />
          </div>
          <div className={`osc-unit${!cell ? ' idle' : ''}`}>
            {cell
              ? <span className={`osc-unit__cur${cell.kind === 'punct' ? ' osc-unit__punct' : ''}`}>{cell.text}</span>
              : <span>awaiting signal</span>}
          </div>
          <div className="osc-inspect">
            {cell
              ? inspect(cell)
              : stats.words
                ? `${stats.words} words · ${stats.phrases} phrases · ${stats.sentences} sentences · ${stats.paragraphs} ¶`
                : 'no input parsed'}
          </div>
          <div className="osc-readout">
            <span>t <b>{fmtTime(posMs)}</b>/<b>{fmtTime(totalMs)}</b></span>
            <span>scale <b>{isLayered || params.scale.quantize ? scaleLabel(params.scale) : 'free'}</b></span>
            <span>tempo <b>{params.tempo}ms</b></span>
            {isLayered ? (
              <span className="osc-layer-leds">
                {LAYERED_LEVELS.map(l => (
                  <span
                    key={l}
                    className={`osc-layer-led${activity[l] ? ' on' : ''}${!params.layered[l].enabled ? ' off' : ''}`}
                  >
                    {LAYER_GLYPH[l]}
                  </span>
                ))}
              </span>
            ) : (
              <span>poly <b>{params.polyphony}</b></span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
