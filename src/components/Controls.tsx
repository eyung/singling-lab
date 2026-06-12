import { memo, useRef, useState } from 'react'
import type { AppParams, ParseLevel, LevelParams, LayeredLevel, LayeredLevelConfig, ScaleMode, SoundCharacter } from '../types'
import {
  validateLevelParams, validateAppParams, validateLayeredLevelConfig,
  LAYERED_LEVELS, PARSE_LEVELS, SCALE_MODES, SEMANTIC_CATEGORIES,
} from '../types'
import { INSTRUMENT_PRESETS, applyPreset } from '../instruments'
import { exportConfig, importConfig, resetToDefaults } from '../configStore'
import { getAllCharacters, getBackdropCharacters } from '../soundCharacters'
import { NOTE_NAMES } from '../scale'
import LedBar from './LedBar'
import Rocker from './Rocker'
import Toggle from './Toggle'
import VuMeter from './VuMeter'

type Tab = 'global' | 'levels' | 'layers' | 'language'

const MODES = ['single', 'layered'] as const

interface Props {
  params: AppParams
  onChange: (p: AppParams) => void
  getAnalyser: () => AnalyserNode | null
  onExportMidi: () => void
  onExportTxt: () => void
  canExport: boolean
}

function CharSelect({
  value, onChange, characters, ariaLabel,
}: {
  value: string
  onChange: (id: string) => void
  characters: SoundCharacter[]
  ariaLabel: string
}) {
  const cats = [...new Set(characters.map(c => c.category))]
  return (
    <select className="osc-sel" value={value} onChange={e => onChange(e.target.value)} aria-label={ariaLabel}>
      {cats.map(cat => (
        <optgroup key={cat} label={cat}>
          {characters.filter(c => c.category === cat).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function LevelEditor({
  level, lp, onChange,
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
        <div className="osc-grid-2">
          <LedBar label="gain" min={0} max={1} step={0.01} value={lp.gain} onChange={v => set('gain', v)} />
          <LedBar label="rate" min={0.1} max={8} step={0.05} unit="×" value={lp.rate} onChange={v => set('rate', v)} />
        </div>
      </div>
    </details>
  )
}

function LayeredLevelEditor({
  level, config, onChange,
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
          <CharSelect
            value={config.soundCharacterId}
            onChange={id => set({ soundCharacterId: id })}
            characters={characters}
            ariaLabel={`${level} layer sound character`}
          />
        </label>
        <div className="osc-grid-2">
          <LedBar label="gain" min={0} max={1} step={0.01} value={config.gain} onChange={v => set({ gain: v })} />
          <LedBar label="pan" min={-1} max={1} step={0.05} value={config.pan} onChange={v => set({ pan: v })} />
        </div>
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

function KeywordEditor({ params, onChange }: { params: AppParams; onChange: (p: AppParams) => void }) {
  const [draft, setDraft] = useState('')
  const characters = getAllCharacters()

  const add = () => {
    const word = draft.trim().toLowerCase()
    if (!word) return
    const keywords = [...params.keywords.filter(k => k.word !== word), { word, soundCharacterId: 'bell', boost: 1.5 }]
    onChange(validateAppParams({ ...params, keywords }))
    setDraft('')
  }
  const update = (word: string, patch: Partial<AppParams['keywords'][number]>) => {
    const keywords = params.keywords.map(k => (k.word === word ? { ...k, ...patch } : k))
    onChange(validateAppParams({ ...params, keywords }))
  }
  const remove = (word: string) => {
    onChange(validateAppParams({ ...params, keywords: params.keywords.filter(k => k.word !== word) }))
  }

  return (
    <div className="osc-group">
      <div className="osc-group__h">keyword triggers</div>
      <div className="osc-group__body">
        <p className="osc-hint">a matched word always plays its assigned sound (overrides everything else)</p>
        {params.keywords.map(k => (
          <div key={k.word} className="osc-kw">
            <div className="osc-kw__row">
              <span className="osc-kw__word">{k.word}</span>
              <CharSelect
                value={k.soundCharacterId}
                onChange={id => update(k.word, { soundCharacterId: id })}
                characters={characters}
                ariaLabel={`sound for keyword ${k.word}`}
              />
              <button className="osc-kw__del" onClick={() => remove(k.word)} aria-label={`remove keyword ${k.word}`}>×</button>
            </div>
            <LedBar label="boost" min={0.25} max={4} step={0.05} unit="×" value={k.boost} onChange={v => update(k.word, { boost: v })} />
          </div>
        ))}
        <div className="osc-kw__row">
          <input
            className="osc-sel"
            style={{ flex: 1 }}
            placeholder="add keyword…"
            value={draft}
            aria-label="new keyword"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
          />
          <button className="osc-tb osc-kw__add" onClick={add} disabled={!draft.trim()}>add</button>
        </div>
      </div>
    </div>
  )
}

function CategoryMapEditor({ params, onChange }: { params: AppParams; onChange: (p: AppParams) => void }) {
  const characters = getAllCharacters()
  const set = (cat: string, id: string) =>
    onChange({ ...params, categoryMap: { ...params.categoryMap, [cat]: id } })

  return (
    <div className="osc-group">
      <div className="osc-group__h">category → character</div>
      <div className="osc-group__body">
        <Toggle
          label="enable category mapping"
          checked={params.semantic.categoryToCharacter}
          onChange={v => onChange({ ...params, semantic: { ...params.semantic, categoryToCharacter: v } })}
        />
        <div className="osc-catmap">
          {SEMANTIC_CATEGORIES.map(cat => (
            <label key={cat} className="osc-catmap__row">
              <span className="osc-catmap__name">{cat}</span>
              <select
                className="osc-sel"
                value={params.categoryMap[cat] ?? ''}
                aria-label={`character for ${cat} words`}
                onChange={e => set(cat, e.target.value)}
              >
                <option value="">—</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// memoized: skips the 60 fps position re-renders during playback
export default memo(Controls)

function Controls({ params, onChange, getAnalyser, onExportMidi, onExportTxt, canExport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('global')

  const setLevel = (level: ParseLevel, lp: LevelParams) =>
    onChange({ ...params, levels: { ...params.levels, [level]: lp } })

  const setLayeredLevel = (level: LayeredLevel, config: LayeredLevelConfig) =>
    onChange({ ...params, layered: { ...params.layered, [level]: config } })

  const setSemantic = (key: keyof AppParams['semantic'], v: boolean) =>
    onChange({ ...params, semantic: { ...params.semantic, [key]: v } })

  const TABS: Tab[] = ['global', 'levels', 'layers', 'language']

  return (
    <div className="osc-right">
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

      <div id={`panel-${tab}`} role="tabpanel" tabIndex={0} className="osc-tabpane">
        {/* ── GLOBAL ── */}
        {tab === 'global' && (
          <>
            <div className="osc-group">
              <div className="osc-group__h">transport &amp; voice</div>
              <div className="osc-group__body">
                <div>
                  <span className="osc-sel-label">mode</span>
                  <Rocker
                    value={params.mode}
                    options={MODES}
                    onChange={v => onChange(validateAppParams({ ...params, mode: v as 'single' | 'layered' }))}
                  />
                </div>
                {params.mode === 'single' && (
                  <>
                    <div>
                      <span className="osc-sel-label">parse level</span>
                      <Rocker
                        value={params.parseLevel}
                        options={PARSE_LEVELS}
                        onChange={v => onChange(validateAppParams({ ...params, parseLevel: v as ParseLevel }))}
                      />
                    </div>
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
                  </>
                )}
                <LedBar label="tempo" min={50} max={2000} step={10} unit="ms" value={params.tempo} onChange={v => onChange(validateAppParams({ ...params, tempo: v }))} />
                <LedBar label="polyphony" min={1} max={16} step={1} value={params.polyphony} onChange={v => onChange(validateAppParams({ ...params, polyphony: v }))} />
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">musical scale</div>
              <div className="osc-group__body">
                {params.mode === 'single' ? (
                  <Toggle
                    label="quantize to scale"
                    checked={params.scale.quantize}
                    onChange={v => onChange(validateAppParams({ ...params, scale: { ...params.scale, quantize: v } }))}
                  />
                ) : (
                  <p className="osc-hint">layered mode always quantizes for harmony</p>
                )}
                <div className="osc-grid-2">
                  <label>
                    <span className="osc-sel-label">root</span>
                    <select
                      className="osc-sel"
                      value={params.scale.root}
                      onChange={e => onChange(validateAppParams({ ...params, scale: { ...params.scale, root: Number(e.target.value) } }))}
                    >
                      {NOTE_NAMES.map((n, i) => (
                        <option key={n} value={i}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="osc-sel-label">scale</span>
                    <select
                      className="osc-sel"
                      value={params.scale.mode}
                      onChange={e => onChange(validateAppParams({ ...params, scale: { ...params.scale, mode: e.target.value as ScaleMode } }))}
                    >
                      {SCALE_MODES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">master out</div>
              <div className="osc-group__body">
                <VuMeter getAnalyser={getAnalyser} />
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">downloads</div>
              <div className="osc-group__body">
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="osc-tb osc-tb--mini" disabled={!canExport} onClick={onExportMidi} aria-label="Download MIDI file">midi</button>
                  <button className="osc-tb osc-tb--mini" disabled={!canExport} onClick={onExportTxt} aria-label="Download parsed text report">txt</button>
                </div>
                <p className="osc-hint">wav renders from the rec button on the transport</p>
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">config</div>
              <div className="osc-group__body">
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="osc-tb osc-tb--mini" onClick={() => exportConfig(params)} aria-label="Export configuration as JSON file">export</button>
                  <button className="osc-tb osc-tb--mini" onClick={() => fileInputRef.current?.click()} aria-label="Import configuration from JSON file">import</button>
                  <button className="osc-tb osc-tb--mini" onClick={() => { setImportError(null); onChange(resetToDefaults()) }} aria-label="Reset all parameters to defaults">reset</button>
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
              <p className="osc-hint">single-mode synthesis per parse level · rate scales the beat for that level</p>
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

        {/* ── LAYERS ── */}
        {tab === 'layers' && (
          <div className="osc-group">
            <div className="osc-group__h">layered mix</div>
            <div className="osc-group__body">
              <p className="osc-hint">word leads · phrase &amp; sentence shade · paragraph grounds — backdrops are non-percussive</p>
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

        {/* ── LANGUAGE ── */}
        {tab === 'language' && (
          <>
            <div className="osc-group">
              <div className="osc-group__h">pitch &amp; time</div>
              <div className="osc-group__body">
                <Toggle label="sentiment → pitch" checked={params.semantic.sentimentToPitch} onChange={v => setSemantic('sentimentToPitch', v)} />
                <Toggle label="modal strength → pitch" checked={params.semantic.modalStrengthToPitch} onChange={v => setSemantic('modalStrengthToPitch', v)} />
                <Toggle label="word length → duration" checked={params.semantic.wordLengthToDuration} onChange={v => setSemantic('wordLengthToDuration', v)} />
                <Toggle label="energy → tempo" checked={params.semantic.energyToTempo} onChange={v => setSemantic('energyToTempo', v)} />
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">texture &amp; mix</div>
              <div className="osc-group__body">
                <Toggle label="energy → filter cutoff" checked={params.semantic.energyToFilterCutoff} onChange={v => setSemantic('energyToFilterCutoff', v)} />
                <Toggle label="rarity → gain" checked={params.semantic.frequencyTierToGain} onChange={v => setSemantic('frequencyTierToGain', v)} />
              </div>
            </div>

            <div className="osc-group">
              <div className="osc-group__h">events</div>
              <div className="osc-group__body">
                <Toggle label="punctuation sounds" checked={params.semantic.punctuationSounds} onChange={v => setSemantic('punctuationSounds', v)} />
                <Toggle label="sentence contour (? ↗ / ! accent)" checked={params.semantic.sentenceContour} onChange={v => setSemantic('sentenceContour', v)} />
              </div>
            </div>

            <KeywordEditor params={params} onChange={onChange} />
            <CategoryMapEditor params={params} onChange={onChange} />
          </>
        )}
      </div>
    </div>
  )
}
