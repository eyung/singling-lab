const SEGS = 20

interface Props {
  playing: boolean
  tick: number
}

export default function VuMeter({ playing, tick }: Props) {
  const level = playing
    ? 0.55 + 0.35 * Math.sin(tick / 4) + 0.1 * Math.sin(tick / 1.3)
    : 0.04
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
