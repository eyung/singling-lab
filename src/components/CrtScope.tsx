import { useMemo } from 'react'
import type { AppParams } from '../types'

interface Props {
  playing: boolean
  activeUnit: string | null
  params: AppParams
  tick: number
}

export default function CrtScope({ playing, activeUnit, params, tick }: Props) {
  const pts = 120
  const path = useMemo(() => {
    const wave = params.levels.word.waveform
    let d = ''
    for (let i = 0; i < pts; i++) {
      const x = (i / (pts - 1)) * 100
      const t = i / pts
      const phase = (tick / 8) + t * Math.PI * 6
      let y: number
      if (wave === 'sine') y = Math.sin(phase)
      else if (wave === 'triangle') y = (2 / Math.PI) * Math.asin(Math.sin(phase))
      else if (wave === 'sawtooth') y = 2 * ((phase / (2 * Math.PI)) % 1) - 1
      else y = Math.sign(Math.sin(phase))
      y = y * (playing ? 0.82 : 0.18) * (1 + 0.08 * Math.sin(tick / 3 + t * 6))
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + (50 - y * 38).toFixed(2) + ' '
    }
    return d
  }, [tick, playing, params.levels.word.waveform])

  const freq = Math.round(
    params.levels.word.pitchMin +
    (params.levels.word.pitchMax - params.levels.word.pitchMin) * 0.5
  )

  return (
    <div className="osc-crt-wrap" aria-hidden="true">
      <div className="osc-crt">
        <div className="osc-grid" />
        <div className="osc-crt-inner">
          <div className="osc-crt-header">
            <span>ch.1 · {params.levels.word.waveform} · {params.instrument}</span>
            <span>
              {playing
                ? <>● rec<span className="blink">_</span></>
                : <>○ standby<span className="blink">_</span></>}
            </span>
          </div>
          <div className="osc-wave">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d={path} />
            </svg>
          </div>
          <div className={`osc-unit${!activeUnit ? ' idle' : ''}`}>
            {activeUnit
              ? <span className="osc-unit__cur">{activeUnit}</span>
              : <span>awaiting signal</span>}
          </div>
          <div className="osc-readout">
            <span>freq <b>{freq}hz</b></span>
            <span>gain <b>{params.levels.word.gain.toFixed(2)}</b></span>
            <span>tempo <b>{params.tempo}ms</b></span>
            <span>poly <b>{params.polyphony}</b></span>
          </div>
        </div>
      </div>
    </div>
  )
}
