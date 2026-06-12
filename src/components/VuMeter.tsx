import { useEffect, useRef, useState } from 'react'

const SEGS = 20

interface Props {
  getAnalyser: () => AnalyserNode | null
}

// Real output metering: RMS of the master analyser, fast attack / slow decay.
export default function VuMeter({ getAnalyser }: Props) {
  const [level, setLevel] = useState(0)
  const smoothRef = useRef(0)

  useEffect(() => {
    let raf = 0
    const buf = new Float32Array(2048)
    const loop = () => {
      const analyser = getAnalyser()
      let rms = 0
      if (analyser) {
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i]! * buf[i]!
        rms = Math.sqrt(sum / buf.length)
      }
      const target = Math.min(1, rms * 2.6)
      const prev = smoothRef.current
      const next = target > prev ? prev + (target - prev) * 0.6 : prev * 0.92
      smoothRef.current = next
      setLevel(l => (Math.abs(l - next) > 0.004 ? next : l))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [getAnalyser])

  const lit = Math.max(0, Math.min(SEGS, Math.round(level * SEGS)))

  return (
    <div className="osc-vu" aria-hidden="true">
      <div className="osc-vu__label">
        <span>output</span>
        <span>{(level * 100).toFixed(0)}%</span>
      </div>
      <div className="osc-vu__bar">
        {Array.from({ length: SEGS }).map((_, i) => {
          const on = i < lit
          const hot = on && i > SEGS * 0.65
          const peak = on && i > SEGS * 0.85
          return (
            <div
              key={i}
              className={`osc-vu__seg${on ? ' lit' : ''}${hot && !peak ? ' hot' : ''}${peak ? ' peak' : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
