interface Props {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}

export default function Rocker({ value, options, onChange }: Props) {
  return (
    <div className="osc-rocker" role="radiogroup">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          className={`osc-rocker__btn${value === opt ? ' osc-rocker__btn--on' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
