import { useRef, useState } from 'react'
import type { AppParams, ParseLevel, LevelParams } from '../types'
import { validateLevelParams, validateAppParams } from '../types'
import { INSTRUMENT_PRESETS, applyPreset } from '../instruments'
import { exportConfig, importConfig, resetToDefaults } from '../configStore'

interface Props {
  params: AppParams
  onChange: (p: AppParams) => void
}

function Slider({
  label, min, max, step = 0.01, value, onChange
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-zinc-500 font-mono">
        <span>{label}</span>
        <span>{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-zinc-500 dark:accent-zinc-400"
      />
    </label>
  )
}

function LevelEditor({
  level, lp, onChange
}: {
  level: ParseLevel
  lp: LevelParams
  onChange: (lp: LevelParams) => void
}) {
  const set = <K extends keyof LevelParams>(k: K, v: LevelParams[K]) =>
    onChange(validateLevelParams({ ...lp, [k]: v }))

  return (
    <details className="border border-zinc-300 dark:border-zinc-800 rounded p-3 group">
      <summary className="cursor-pointer font-mono text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 select-none">
        <span className="text-zinc-400 dark:text-zinc-600 group-open:rotate-90 inline-block transition-transform">▶</span>
        {level}
        {!lp.enabled && <span className="text-zinc-400 dark:text-zinc-600">(disabled)</span>}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={lp.enabled}
            onChange={e => set('enabled', e.target.checked)}
            className="accent-zinc-500 dark:accent-zinc-400"
          />
          enabled
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Slider label="pitch min (Hz)" min={20} max={2000} step={1} value={lp.pitchMin} onChange={v => set('pitchMin', v)} />
          <Slider label="pitch max (Hz)" min={20} max={4000} step={1} value={lp.pitchMax} onChange={v => set('pitchMax', v)} />
          <Slider label="dur min (s)" min={0.01} max={4} value={lp.durationMin} onChange={v => set('durationMin', v)} />
          <Slider label="dur max (s)" min={0.01} max={8} value={lp.durationMax} onChange={v => set('durationMax', v)} />
          <Slider label="attack (s)" min={0.001} max={2} value={lp.attack} onChange={v => set('attack', v)} />
          <Slider label="release (s)" min={0.01} max={4} value={lp.release} onChange={v => set('release', v)} />
          <Slider label="filter cutoff (Hz)" min={20} max={10000} step={1} value={lp.filterCutoff} onChange={v => set('filterCutoff', v)} />
          <Slider label="filter Q" min={0.1} max={20} value={lp.filterQ} onChange={v => set('filterQ', v)} />
          <Slider label="gain" min={0} max={1} value={lp.gain} onChange={v => set('gain', v)} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-zinc-500">waveform</span>
          <select
            value={lp.waveform}
            onChange={e => set('waveform', e.target.value as OscillatorType)}
            className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-700 dark:text-zinc-300"
          >
            {(['sine', 'triangle', 'sawtooth', 'square'] as OscillatorType[]).map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
      </div>
    </details>
  )
}

export default function Controls({ params, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const setLevel = (level: ParseLevel, lp: LevelParams) =>
    onChange({ ...params, levels: { ...params.levels, [level]: lp } })

  const LEVELS: ParseLevel[] = ['letter', 'word', 'phrase', 'sentence', 'paragraph']

  return (
    <div className="w-1/2 overflow-y-auto p-4 flex flex-col gap-4 bg-white dark:bg-zinc-950">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Global</h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-zinc-500">instrument</span>
          <select
            value={params.instrument}
            onChange={e => {
              const id = e.target.value
              const levels = applyPreset(id, params.levels)
              onChange(validateAppParams({ ...params, instrument: id, levels }))
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-700 dark:text-zinc-300"
          >
            {INSTRUMENT_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <Slider label="tempo (ms/unit)" min={50} max={5000} step={10} value={params.tempo} onChange={v => onChange(validateAppParams({ ...params, tempo: v }))} />
        <Slider label="polyphony" min={1} max={16} step={1} value={params.polyphony} onChange={v => onChange(validateAppParams({ ...params, polyphony: v }))} />
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => exportConfig(params)}
            aria-label="Export configuration as JSON file"
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            export config
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import configuration from JSON file"
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            import config
          </button>
          <button
            onClick={() => { setImportError(null); onChange(resetToDefaults()) }}
            aria-label="Reset all parameters to defaults"
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            reset
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0]
            if (!file) return
            e.target.value = ''
            try {
              const imported = await importConfig(file)
              setImportError(null)
              onChange(imported)
            } catch (err) {
              setImportError(err instanceof Error ? err.message : 'Import failed.')
            }
          }}
        />
        {importError && (
          <p className="text-xs font-mono text-red-600 dark:text-red-400">{importError}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Semantic</h2>
        {(
          [
            ['sentimentToPitch', 'sentiment → pitch'],
            ['energyToFilterCutoff', 'energy → filter cutoff'],
            ['energyToTempo', 'energy → tempo'],
          ] as [keyof AppParams['semantic'], string][]
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={params.semantic[key]}
              onChange={e => onChange({ ...params, semantic: { ...params.semantic, [key]: e.target.checked } })}
              className="accent-zinc-500 dark:accent-zinc-400"
            />
            {label}
          </label>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Levels</h2>
        {LEVELS.map(level => (
          <LevelEditor
            key={level}
            level={level}
            lp={params.levels[level]}
            onChange={lp => setLevel(level, lp)}
          />
        ))}
      </section>
    </div>
  )
}
