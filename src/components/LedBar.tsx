const SEGS = 24

interface Props {
  label: string
  min: number
  max: number
  step?: number
  value: number
  unit?: string
  onChange: (v: number) => void
}

export default function LedBar({ label, min, max, step = 1, value, unit, onChange }: Props) {
  const frac = (value - min) / (max - min)
  const lit = Math.round(frac * SEGS)
  const display = step < 1 ? value.toFixed(2) : value.toFixed(0)

  return (
    <div className="osc-dial">
      <div className="osc-dial__row">
        <span>{label}</span>
        <span className="osc-dial__val">{display}{unit ? ` ${unit}` : ''}</span>
      </div>
      <div className="osc-bar">
        <div className="osc-bar__segs" aria-hidden="true">
          {Array.from({ length: SEGS }).map((_, i) => (
            <div key={i} className={`osc-bar__seg${i < lit ? ' on' : ''}`} />
          ))}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
