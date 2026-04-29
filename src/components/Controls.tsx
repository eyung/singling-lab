import { useRef, useState } from 'react'
import type { AppParams, ParseLevel, LevelParams, LayeredLevel, LayeredLevelConfig } from '../types'
import { validateLevelParams, validateAppParams, validateLayeredLevelConfig, LAYERED_LEVELS } from '../types'
import { INSTRUMENT_PRESETS, applyPreset } from '../instruments'
import { exportConfig, importConfig, resetToDefaults } from '../configStore'
import { getAllCharacters, getBackdropCharacters } from '../soundCharacters'
import LedBar from './LedBar'
import Rocker from './Rocker'
import Toggle from './Toggle'
import VuMeter from './VuMeter'

type Tab = 'global' | 'levels' | 'layered' | 'semantic'

const PARSE_LEVELS: readonly ParseLevel[] = ['letter', 'word', 'phrase', 'sentence', 'paragraph']
const MODES = ['single', 'layered'] as const

interface Props {
  params: AppParams
  onChange: (p: AppParams) => void
  isPlaying: boolean
  tick: number
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
    <details className="osc-acc" open={level === 'word'}>
      <summary>
        <span className="osc-acc__tri">▶</span>
        <span style={{ flex: 1 }}>{level}</span>
        <span
          className="osc-led"
          style={{
            background: lp.enabled ? 'var(--phosphor)' : '#2a201a',
            boxShadow: lp.enabled ? '0 0 4px var(--phosphor-glow)' : 'inset 0 0 2px rgba(0,0,0,.6)',
          }}
        />
      </summary>
      <div className="osc-acc__body">
        <Toggle label="enabled" checked={lp.enabled} onChange={v => set('enabled', v)} />
        <label>
          <span className="osc-sel-label">waveform</span>
          <select
            className="osc-sel"
            value={lp.waveform}
            onChange={e => set('waveform', e.target.value as OscillatorType)}
          >
            {(['sine', 'triangle', 'sawtooth', 'square'] as OscillatorType[]).map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <div className="osc-grid-2">
          <LedBar label="pitch min" min={20} max={2000} step={1} unit="hz" value={lp.pitchMin} onChange={v => set('pitchMin', v)} />
          <LedBar label="pitch max" min={20} max={4000} step={1} unit="hz" value={lp.pitchMax} onChange={v => set('pitchMax', v)} />
          <LedBar label="dur min" min={0.01} max={4} step={0.01} unit="s" value={lp.durationMin} onChange={v => set('durationMin', v)} />
          <LedBar label="dur max" min={0.01} max={8} step={0.01} unit="s" value={lp.durationMax} onChange={v => set('durationMax', v)} />
          <LedBar label="attack" min={0.001} max={2} step={0.01} unit="s" value={lp.attack} onChange={v => set('attack', v)} />
          <LedBar label="release" min={0.01} max={4} step={0.01} unit="s" value={lp.release} onChange={v => set('release', v)} />
          <LedBar label="cutoff" min={20} max={10000} step={1} unit="hz" value={lp.filterCutoff} onChange={v => set('filterCutoff', v)} />
          <LedBar label="res (q)" min={0.1} max={20} step={0.1} value={lp.filterQ} onChange={v => set('filterQ', v)} />
        </div>
        <LedBar label="gain" min={0} max={1} step={0.01} value={lp.gain} onChange={v => set('gain', v)} />
      </div>
    </details>
  )
}

function LayeredLevelEditor({
  level, config, onChange
}: {
  level: LayeredLevel
  config: LayeredLevelConfig
  onChange: (c: LayeredLevelConfig) => void
}) {
  const isBackdrop = level !== 'word'
  const characters = isBackdrop ? getBackdropCharacters() : getAllCharacters()
  const set = (update: Partial<LayeredLevelConfig>) =>
    onChange(validateLayeredLevelConfig({ ...config, ...update }))

  return (
    <details className="osc-acc" open={level === 'word'}>
      <summary>
        <span className="osc-acc__tri">▶</span>
        <span style={{ flex: 1 }}>
          {level}{isBackdrop ? ' · backdrop' : ''}
        </span>
        <span
          className="osc-led"
          style={{
            background: config.enabled ? 'var(--amber)' : '#2a201a',
            boxShadow: config.enabled ? '0 0 4px rgba(255,179,71,.5)' : 'inset 0 0 2px rgba(0,0,0,.6)',
          }}
        />
      </summary>
      <div className="osc-acc__body">
        <Toggle label="enabled" checked={config.enabled} onChange={v => set({ enabled: v })} />
        <label>
          <span className="osc-sel-label">sound character</span>
          <select
            className="osc-sel"
            value={config.soundCharacterId}
            onChange={e => set({ soundCharacterId: e.target.value })}
          >
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
            ))}
          </select>
        </label>
        <LedBar label="gain" min={0} max={1} step={0.01} value={config.gain} onChange={v => set({ gain: v })} />
        {isBackdrop && (
          <div>
            <span className="osc-sel-label">sustain mode</span>
            <Rocker
              value={config.sustainMode}
              options={['retrigger', 'hold'] as const}
              onChange={v => set({ sustainMode: v as 'retrigger' | 'hold' })}
            />
          </div>
        )}
      </div>
    </details>
  )
}

export default function Controls({ params, onChange, isPlaying, tick }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('global')

  const setLevel = (level: ParseLevel, lp: LevelParams) =>
    onChange({ ...params, levels: { ...params.levels, [level]: lp } })

  const setLayeredLevel = (level: LayeredLevel, config: LayeredLevelConfig) =>
    onChange({ ...params, layered: { ...params.layered, [level]: config } })

  const TABS: Tab[] = ['global', 'levels', 'layered', 'semantic']

  return (
    <div className="osc-right">
      {/* Tab bar */}
      <div className="osc-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            className={`osc-tab${tab === t ? ' osc-tab--on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id={`panel-${tab}`}
        role="tabpanel"
        tabIndex={0}
        className="osc-tabpane"
      >
        {/* ── GLOBAL ── */}
        {tab === 'global' && (
          <>
            <div className="osc-group">
              <div className="osc-group__h">transport & voice</div>
              <div className="osc-group__body">
                <label>
                  <span className="osc-sel-label">instrument</span>
                  <select
                    className="osc-sel"
                    value={params.instrument}
                    onChange={e => {
                      const id = e.target.value
                      const levels = applyPreset(id, params.levels)
                      onChange(validateAppParams({ ...params, instrument: id, levels }))
                    }}
                  >
                    {INSTRUMENT_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="osc-sel-label">mode</span>
                  <Rocker
                    value={params.mode}
                    options={MODES}
                    onChange={v => onChange(validateAppParams({ ...params, mode: v as 'single' | 'layered' }))}
                  />
                </div>
                <div>
                  <span className="osc-sel-label">parse level</span>
                  <Rocker
                    value={params.parseLevel}
                    options={PARSE_LEVELS}
                    onChange={v => onChange(validateAppParams({ ...params, parseLevel: v as ParseLevel }))}
                  />
                </div>
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">timing</div>
              <div className="osc-group__body">
                <LedBar label="tempo" min={50} max={5000} step={10} unit="ms" value={params.tempo} onChange={v => onChange(validateAppParams({ ...params, tempo: v }))} />
                <LedBar label="polyphony" min={1} max={16} step={1} value={params.polyphony} onChange={v => onChange(validateAppParams({ ...params, polyphony: v }))} />
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">master out</div>
              <div className="osc-group__body">
                <VuMeter playing={isPlaying} tick={tick} />
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">config</div>
              <div className="osc-group__body">
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="osc-tb"
                    style={{ flex: 1, fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', padding: '8px 4px' }}
                    onClick={() => exportConfig(params)}
                    aria-label="Export configuration as JSON file"
                  >
                    export
                  </button>
                  <button
                    className="osc-tb"
                    style={{ flex: 1, fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', padding: '8px 4px' }}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Import configuration from JSON file"
                  >
                    import
                  </button>
                  <button
                    className="osc-tb"
                    style={{ flex: 1, fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', padding: '8px 4px' }}
                    onClick={() => { setImportError(null); onChange(resetToDefaults()) }}
                    aria-label="Reset all parameters to defaults"
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
                  style={{ display: 'none' }}
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
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rose)', margin: 0 }}>{importError}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── LEVELS ── */}
        {tab === 'levels' && (
          <div className="osc-group">
            <div className="osc-group__h">per-level parameters</div>
            <div className="osc-group__body">
              {PARSE_LEVELS.map(level => (
                <LevelEditor
                  key={level}
                  level={level}
                  lp={params.levels[level]}
                  onChange={lp => setLevel(level, lp)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── LAYERED ── */}
        {tab === 'layered' && (
          <div className="osc-group">
            <div className="osc-group__h">layered mix</div>
            <div className="osc-group__body">
              {LAYERED_LEVELS.map(level => (
                <LayeredLevelEditor
                  key={level}
                  level={level}
                  config={params.layered[level]}
                  onChange={config => setLayeredLevel(level, config)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SEMANTIC ── */}
        {tab === 'semantic' && (
          <div className="osc-group">
            <div className="osc-group__h">semantic routing</div>
            <div className="osc-group__body">
              <Toggle
                label="sentiment → pitch"
                checked={params.semantic.sentimentToPitch}
                onChange={v => onChange({ ...params, semantic: { ...params.semantic, sentimentToPitch: v } })}
              />
              <Toggle
                label="energy → filter cutoff"
                checked={params.semantic.energyToFilterCutoff}
                onChange={v => onChange({ ...params, semantic: { ...params.semantic, energyToFilterCutoff: v } })}
              />
              <Toggle
                label="energy → tempo"
                checked={params.semantic.energyToTempo}
                onChange={v => onChange({ ...params, semantic: { ...params.semantic, energyToTempo: v } })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
