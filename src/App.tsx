import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseAll } from './parser'
import { buildTimeline, cellIndexAt } from './timeline'
import { LiveEngine } from './soundEngine'
import type { EngineState } from './soundEngine'
import { mapUnit } from './mapping'
import { buildScaleFreqs } from './scale'
import { buildMidi, buildParsedTxt } from './export'
import { renderWavBlob, downloadBlob, filenameSlug } from './render'
import { DEFAULT_PARAMS } from './types'
import type { AppParams, CharRange, LayeredLevel, Timeline, TimelineEvent } from './types'
import { loadFromStorage, saveToStorage, resetToDefaults } from './configStore'
import { getInitialTheme, applyTheme } from './themeStore'
import type { Theme } from './themeStore'
import Controls from './components/Controls'
import CrtScope from './components/CrtScope'
import StructureMap from './components/StructureMap'
import Transport from './components/Transport'

const engine = new LiveEngine()
const getAnalyser = () => engine.getAnalyser()

const BACKDROP_LEVELS: readonly Exclude<LayeredLevel, 'word'>[] = ['phrase', 'sentence', 'paragraph']

const DEMOS = [
  {
    id: 'storm',
    label: 'storm',
    text: `The morning was calm, and the harbour lay bright beneath a gentle sun. Small boats drifted out, one by one, past the quiet lighthouse.

But the storm came fast. Wind struck the water; waves rose, crashed, and rose again! Could the little fleet survive? The fishermen must hold their course — they will not turn back.`,
  },
  {
    id: 'ishmael',
    label: 'ishmael',
    text: `Call me Ishmael. Some years ago — never mind how long precisely — having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.`,
  },
  {
    id: 'rhythm',
    label: 'rhythm',
    text: `One, two, three, four. Numbers march in order, steady as a drum. Five and six and seven and eight! When the counting stops, the silence answers.

Listen: every comma taps, every period lands, and every question floats. Hear it?`,
  },
]

// Recently fired layers around posMs, for the scope's layer activity LEDs
function activityAt(events: readonly TimelineEvent[], posMs: number): Partial<Record<LayeredLevel, boolean>> {
  const out: Partial<Record<LayeredLevel, boolean>> = {}
  if (!events.length) return out
  let lo = 0
  let hi = events.length - 1
  let idx = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (events[mid]!.tMs <= posMs) { idx = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  for (let i = idx; i >= 0 && events[i]!.tMs > posMs - 180; i--) {
    const ev = events[i]!
    if (!ev.dropped) out[ev.level as LayeredLevel] = true
  }
  return out
}

export default function App() {
  const [text, setText] = useState('')
  const [params, setParams] = useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)
  const [playState, setPlayState] = useState<EngineState>('idle')
  const [posMs, setPosMs] = useState(0)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  const [liveTyping, setLiveTyping] = useState(false)
  const [rendering, setRendering] = useState(false)
  const playingTimelineRef = useRef<Timeline | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const parsed = useMemo(() => parseAll(text), [text])
  const timeline = useMemo(() => buildTimeline(parsed, params), [parsed, params])

  // while audible, highlights/structure track the snapshot the engine is playing
  const activeTimeline = playState !== 'idle' && playingTimelineRef.current
    ? playingTimelineRef.current
    : timeline

  const stats = useMemo(() => ({
    words: parsed.units.word.filter(u => u.kind === 'text').length,
    phrases: parsed.units.phrase.length,
    sentences: parsed.units.sentence.length,
    paragraphs: parsed.units.paragraph.length,
  }), [parsed])

  useEffect(() => {
    if (playState === 'idle') return
    let raf = 0
    const loop = () => {
      setPosMs(engine.positionMs())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playState])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }, [theme])

  const stop = useCallback(() => {
    engine.stop()
    playingTimelineRef.current = null
    setPlayState('idle')
    setPosMs(0)
  }, [])

  const startFrom = useCallback((tl: Timeline, fromMs: number) => {
    if (!tl.grid.length) return
    playingTimelineRef.current = tl
    engine.play(tl, fromMs, () => {
      playingTimelineRef.current = null
      setPlayState('idle')
      setPosMs(0)
    })
    setPlayState('playing')
  }, [])

  const handlePlayPause = useCallback(() => {
    if (playState === 'playing') {
      engine.pause()
      setPlayState('paused')
    } else if (playState === 'paused') {
      engine.resume()
      setPlayState('playing')
    } else {
      startFrom(timeline, 0)
    }
  }, [playState, startFrom, timeline])

  const handleSeek = useCallback((tMs: number) => {
    const tl = playState !== 'idle' && playingTimelineRef.current ? playingTimelineRef.current : timeline
    startFrom(tl, tMs)
  }, [playState, startFrom, timeline])

  // keyboard transport: space toggles play/pause, escape stops
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return
      if (e.code === 'Space') { e.preventDefault(); handlePlayPause() }
      else if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlePlayPause, stop])

  // live typing: sound the word you just completed
  const previewWord = useCallback((word: string) => {
    const unit = parseAll(word).units.word.find(u => u.kind === 'text')
    if (!unit) return
    const layeredMode = params.mode === 'layered'
    const ctx = layeredMode
      ? {
          level: 'word' as const,
          scaleFreqs: buildScaleFreqs(params.scale),
          pan: params.layered.word.pan,
          defaultCharacterId: params.layered.word.soundCharacterId,
        }
      : {
          level: params.parseLevel === 'letter' ? ('word' as const) : params.parseLevel,
          scaleFreqs: params.scale.quantize ? buildScaleFreqs(params.scale) : null,
          pan: 0,
          defaultCharacterId: null,
        }
    const { sp, characterId } = mapUnit(unit, params, ctx)
    if (layeredMode) sp.gain *= params.layered.word.gain
    engine.playOne(sp, characterId)
  }, [params])

  const handleTextChange = useCallback((value: string) => {
    if (playState !== 'idle') stop()
    if (liveTyping && value.length === text.length + 1) {
      const last = value[value.length - 1]!
      if (/[\s.,!?;:]/.test(last)) {
        const m = value.slice(0, -1).match(/[\p{L}\p{N}'’]+$/u)
        if (m) previewWord(m[0])
      }
    }
    setText(value)
  }, [playState, stop, liveTyping, text, previewWord])

  // ── exports ──
  const handleRec = useCallback(async () => {
    if (!timeline.events.length) return
    setRendering(true)
    try {
      const blob = await renderWavBlob(timeline)
      downloadBlob(blob, `singling-${filenameSlug(text)}.wav`)
    } finally {
      setRendering(false)
    }
  }, [timeline, text])

  const handleMidi = useCallback(() => {
    if (!timeline.events.length) return
    const bytes = buildMidi(timeline, params)
    downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' }), `singling-${filenameSlug(text)}.mid`)
  }, [timeline, params, text])

  const handleTxt = useCallback(() => {
    if (!timeline.grid.length) return
    const report = buildParsedTxt(timeline, params, text)
    downloadBlob(new Blob([report], { type: 'text/plain' }), `singling-${filenameSlug(text)}.txt`)
  }, [timeline, params, text])

  const handleParamsChange = useCallback((p: AppParams) => {
    setParams(p)
    saveToStorage(p)
  }, [])

  const handleReset = useCallback(() => {
    stop()
    setParams(resetToDefaults())
  }, [stop])

  // ── highlight overlay ──
  const displayTokens = useMemo(() => (text ? text.split(/(\s+)/) : []), [text])
  const tokenOffsets = useMemo((): CharRange[] => {
    let pos = 0
    return displayTokens.map(t => {
      const start = pos
      pos += t.length
      return { start, end: pos }
    })
  }, [displayTokens])

  const cellIdx = playState === 'idle' ? -1 : cellIndexAt(activeTimeline.grid, posMs)
  const cell = cellIdx >= 0 ? activeTimeline.grid[cellIdx] ?? null : null

  const layerRanges = useMemo((): Partial<Record<LayeredLevel, CharRange>> => {
    if (!cell || activeTimeline.mode !== 'layered') return {}
    const out: Partial<Record<LayeredLevel, CharRange>> = {}
    for (const level of BACKDROP_LEVELS) {
      const units = activeTimeline.unitsByLevel[level] ?? []
      const hit = units.find(u => u.range.start <= cell.range.start && cell.range.start < u.range.end)
      if (hit) out[level] = hit.range
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell?.range.start, activeTimeline])

  const activity = useMemo(
    () => (activeTimeline.mode === 'layered' && playState === 'playing' ? activityAt(activeTimeline.events, posMs) : {}),
    [activeTimeline, posMs, playState],
  )

  // keep the overlay aligned with the textarea, and auto-follow the playhead
  const syncScroll = useCallback(() => {
    const ta = textareaRef.current
    const ov = overlayRef.current
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop
      ov.scrollLeft = ta.scrollLeft
    }
  }, [])

  useEffect(() => {
    if (playState === 'idle') return
    const ov = overlayRef.current
    const ta = textareaRef.current
    if (!ov || !ta) return
    const cur = ov.querySelector<HTMLElement>('.cur')
    if (!cur) return
    const top = cur.offsetTop
    if (top < ta.scrollTop + 8 || top > ta.scrollTop + ta.clientHeight - 28) {
      ta.scrollTop = Math.max(0, top - ta.clientHeight / 3)
      syncScroll()
    }
  }, [cellIdx, playState, syncScroll])

  const showLegend = params.mode === 'layered'

  return (
    <div className="osc-chassis">
      <div className="osc-titlebar">
        <span className="osc-screw" />
        <span className="osc-screw" />
        <span className="osc-title">
          SINGLING LAB
          <span className="osc-title__sub">// OSC-1S LITERACOUSTIC WORKBENCH</span>
        </span>
        <span className="osc-model">
          <span>pwr</span>
          <span className="osc-led osc-led--pwr" />
          <span>sync</span>
          <span className={`osc-led${playState === 'playing' ? '' : ' osc-led--off'}`} />
          <span className="osc-model__ser">ser. 0421</span>
          <button
            className="osc-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </span>
        <span className="osc-screw" />
        <span className="osc-screw" />
      </div>

      <div className="osc-main">
        <div className="osc-col">
          <CrtScope
            playing={playState === 'playing'}
            paused={playState === 'paused'}
            posMs={posMs}
            totalMs={activeTimeline.totalMs}
            cell={cell}
            activity={activity}
            params={params}
            stats={stats}
            theme={theme}
            getAnalyser={getAnalyser}
          />

          <StructureMap
            timeline={activeTimeline}
            textLength={text.length}
            posMs={posMs}
            playState={playState}
            activeLevel={params.parseLevel}
            onSeek={handleSeek}
            theme={theme}
          />

          <div className={`osc-input-wrap${playState !== 'idle' ? ' osc-input-wrap--live' : ''}`} style={{ flex: 1 }}>
            <div className="osc-input-label">input buffer</div>
            <div className="osc-input-tools">
              <button
                className={`osc-chip${liveTyping ? ' osc-chip--on' : ''}`}
                onClick={() => setLiveTyping(v => !v)}
                aria-pressed={liveTyping}
                aria-label="toggle live typing sounds"
              >
                live
              </button>
              <span className="osc-chip-sep">load:</span>
              {DEMOS.map(d => (
                <button
                  key={d.id}
                  className="osc-chip"
                  onClick={() => { if (playState !== 'idle') stop(); setText(d.text) }}
                  aria-label={`load demo text ${d.label}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {playState !== 'idle' && displayTokens.length > 0 && (
              <div className="osc-input-overlay" ref={overlayRef} aria-hidden="true">
                {displayTokens.map((t, i) => {
                  const tr = tokenOffsets[i]!
                  const isCur = !!cell &&
                    tr.start >= cell.range.start && tr.start < cell.range.end
                  const isPast = !!cell && tr.end <= cell.range.start
                  const inPhrase = !!layerRanges.phrase &&
                    tr.start >= layerRanges.phrase.start && tr.start < layerRanges.phrase.end
                  const inSentence = !!layerRanges.sentence &&
                    tr.start >= layerRanges.sentence.start && tr.start < layerRanges.sentence.end
                  const inParagraph = !!layerRanges.paragraph &&
                    tr.start >= layerRanges.paragraph.start && tr.start < layerRanges.paragraph.end
                  const cls = [
                    isCur ? 'cur' : isPast ? 'past' : '',
                    !isCur && inPhrase ? 'hl-phrase' : '',
                    !isCur && inSentence ? 'hl-sentence' : '',
                    !isCur && inParagraph ? 'hl-paragraph' : '',
                  ].filter(Boolean).join(' ')
                  return <span key={i} className={cls || undefined}>{t}</span>
                })}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="osc-textarea"
              placeholder="enter source text… (or load a demo above)"
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onScroll={syncScroll}
            />
            {showLegend && (
              <div className="osc-legend" aria-hidden="true">
                <span className="osc-legend__item osc-legend__item--phrase">phrase</span>
                <span className="osc-legend__item osc-legend__item--sentence">sentence</span>
                <span className="osc-legend__item osc-legend__item--paragraph">paragraph</span>
              </div>
            )}
          </div>

          <Transport
            playState={playState}
            canPlay={!!text.trim()}
            rendering={rendering}
            onPlayPause={handlePlayPause}
            onStop={stop}
            onReset={handleReset}
            onRec={() => { void handleRec() }}
          />
        </div>

        <Controls
          params={params}
          onChange={handleParamsChange}
          getAnalyser={getAnalyser}
          onExportMidi={handleMidi}
          onExportTxt={handleTxt}
          canExport={!!text.trim()}
        />
      </div>
    </div>
  )
}
