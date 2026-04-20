interface Props {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function Toggle({ label, checked, onChange }: Props) {
  return (
    <label className="osc-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="osc-toggle__sw" />
      <span>{label}</span>
    </label>
  )
}
