import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { parseText } from './parser'
import { buildSoundParams, SoundEngine, quantiseToCMajor } from './soundEngine'
import { DEFAULT_PARAMS } from './types'
import type { AppParams, ParseLevel, LayeredLevel, CharRange } from './types'
import { loadFromStorage, saveToStorage } from './configStore'
import { getInitialTheme, applyTheme } from './themeStore'
import type { Theme } from './themeStore'
import { getSoundCharacter } from './soundCharacters'
import { findTextOffsets, buildWordToSpanMap, computeBeatMs } from './playbackUtils'
import Controls from './components/Controls'
import CrtScope from './components/CrtScope'
import Transport from './components/Transport'
import { exportConfig } from './configStore'

const engine = new SoundEngine()

type NonWordLevel = 'phrase' | 'sentence' | 'paragraph'
const NON_WORD_LEVELS: NonWordLevel[] = ['phrase', 'sentence', 'paragraph']

export default function App() {
  const [text, setText] = useState('')
  const [params, setParams] = useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeUnit, setActiveUnit] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  const [tick, setTick] = useState(0)
  const [activeHighlight, setActiveHighlight] = useState<CharRange | null>(null)
  const [layeredHighlights, setLayeredHighlights] = useState<Partial<Record<LayeredLevel, CharRange | null>>>({})
  const rafRef = useRef<number | null>(null)
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      setTick(t => t + 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }, [theme])

  const stop = useCallback(() => {
    if (playbackRef.current) clearTimeout(playbackRef.current)
    playbackRef.current = null
    engine.stop()
    setIsPlaying(false)
    setActiveUnit(null)
    setActiveHighlight(null)
    setLayeredHighlights({})
  }, [])

  const play = useCallback(() => {
    if (isPlaying) { stop(); return }

    const units = parseText(text, params.parseLevel)
    if (!units.length) return

    const unitOffsets = findTextOffsets(text, units)

    engine.updateMaxVoices(params.polyphony)
    setIsPlaying(true)

    let i = 0
    const step = () => {
      if (i >= units.length) {
        setIsPlaying(false)
        setActiveUnit(null)
        setActiveHighlight(null)
        return
      }
      const unit = units[i]!
      i++
      if (params.levels[unit.level].enabled) {
        const sp = buildSoundParams(unit, params)
        engine.playUnit(sp)
        setActiveUnit(unit.text)
        setActiveHighlight(unitOffsets[i - 1] ?? null)
      }
      const interval = computeBeatMs(unit, params)
      playbackRef.current = setTimeout(step, interval)
    }
    step()
  }, [text, params, isPlaying, stop])

  const playLayered = useCallback(() => {
    if (isPlaying) { stop(); return }

    const wordUnits = parseText(text, 'word')
    if (!wordUnits.length) return

    engine.updateMaxVoices(params.polyphony)
    setIsPlaying(true)

    const wordOffsets = findTextOffsets(text, wordUnits)

    // Build per-layer data for each active non-word layer
    const layerData: Partial<Record<NonWordLevel, {
      units: ReturnType<typeof parseText>
      wordToSpan: number[]
      spanOffsets: CharRange[]
      spanWordCounts: number[]
    }>> = {}

    for (const level of NON_WORD_LEVELS) {
      if (!params.layered[level].enabled) continue
      const units = parseText(text, level as ParseLevel)
      if (!units.length) continue
      const spanOffsets = findTextOffsets(text, units)
      const wordToSpan = buildWordToSpanMap(wordOffsets, spanOffsets)
      const spanWordCounts = new Array<number>(units.length).fill(0)
      for (const spanIdx of wordToSpan) {
        if (spanIdx >= 0 && spanIdx < units.length) spanWordCounts[spanIdx]++
      }
      layerData[level] = { units, wordToSpan, spanOffsets, spanWordCounts }
    }

    const wordLayerEnabled = params.layered['word'].enabled
    const wordChar = getSoundCharacter(params.layered['word'].soundCharacterId) ?? getSoundCharacter('default')!

    // Track which span each non-word layer is currently in (undefined = not yet started)
    const activeSpanIdx: Partial<Record<NonWordLevel, number>> = {}

    let wordIdx = 0

    const step = () => {
      if (wordIdx >= wordUnits.length) {
        setIsPlaying(false)
        setActiveUnit(null)
        setActiveHighlight(null)
        setLayeredHighlights({})
        return
      }

      const wordUnit = wordUnits[wordIdx]!
      const beatMs = computeBeatMs(wordUnit, params)

      // Always track word position for highlight (regardless of word layer audio state)
      const wordRange = wordOffsets[wordIdx]
      if (wordRange) setActiveHighlight(wordRange)
      setActiveUnit(wordUnit.text)

      // Fire word layer audio if enabled
      if (wordLayerEnabled) {
        const sp = buildSoundParams(wordUnit, params)
        sp.frequency = quantiseToCMajor(sp.frequency)
        sp.duration = beatMs / 1000
        engine.playLayeredUnit(sp, wordChar, params.layered['word'].gain)
      }

      // Fire non-word layers and collect their span highlights
      const newLayeredHighlights: Partial<Record<LayeredLevel, CharRange | null>> = {}

      for (const level of NON_WORD_LEVELS) {
        const ld = layerData[level]
        if (!ld) continue

        const newSpanIdx = ld.wordToSpan[wordIdx] ?? 0
        const prevSpanIdx = activeSpanIdx[level]
        const spanUnit = ld.units[newSpanIdx]
        if (!spanUnit) continue

        const levelConfig = params.layered[level]
        const char = getSoundCharacter(levelConfig.soundCharacterId) ?? getSoundCharacter('default')!

        if (prevSpanIdx !== newSpanIdx) {
          // Span transition: fire audio
          activeSpanIdx[level] = newSpanIdx
          const sp = buildSoundParams(spanUnit, params)
          sp.frequency = quantiseToCMajor(sp.frequency)
          if (levelConfig.sustainMode === 'hold') {
            const count = ld.spanWordCounts[newSpanIdx] ?? 1
            sp.duration = (count * beatMs) / 1000
          } else {
            sp.duration = beatMs / 1000
          }
          engine.playLayeredUnit(sp, char, levelConfig.gain)
        } else if (levelConfig.sustainMode === 'retrigger') {
          // Same span, retrigger: fire again
          const sp = buildSoundParams(spanUnit, params)
          sp.frequency = quantiseToCMajor(sp.frequency)
          sp.duration = beatMs / 1000
          engine.playLayeredUnit(sp, char, levelConfig.gain)
        }
        // Same span + hold: no-op — audio node is already sustaining

        const spanRange = ld.spanOffsets[newSpanIdx]
        if (spanRange) newLayeredHighlights[level] = spanRange
      }

      setLayeredHighlights(newLayeredHighlights)

      wordIdx++
      playbackRef.current = setTimeout(step, beatMs)
    }

    step()
  }, [text, params, isPlaying, stop])

  const handlePlay = useCallback(() => {
    if (params.mode === 'layered') {
      playLayered()
    } else {
      play()
    }
  }, [params.mode, play, playLayered])

  const displayTokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text])

  const tokenOffsets = useMemo((): CharRange[] => {
    let pos = 0
    return displayTokens.map(t => {
      const start = pos
      pos += t.length
      return { start, end: pos }
    })
  }, [displayTokens])

  return (
    <div className="osc-chassis">
      <div className="osc-titlebar">
        <span className="osc-screw" />
        <span className="osc-screw" />
        <span className="osc-title">
          SINGLING LAB
          <span className="osc-title__sub">// OSC-1 TEXT SONIFIER</span>
        </span>
        <span className="osc-model">
          <span>pwr</span>
          <span className="osc-led osc-led--pwr" />
          <span>sync</span>
          <span className={`osc-led${isPlaying ? '' : ' osc-led--off'}`} />
          <span>ser. 0421</span>
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
          <CrtScope playing={isPlaying} activeUnit={activeUnit} params={params} tick={tick} />

          <div className="osc-input-wrap" style={{ flex: 1 }}>
            <div className="osc-input-label">input buffer</div>
            {isPlaying && displayTokens.length > 0 && (
              <div className="osc-input-overlay" aria-hidden="true">
                {displayTokens.map((t, i) => {
                  const tr = tokenOffsets[i]!
                  const isCur = !!activeHighlight &&
                    tr.start >= activeHighlight.start && tr.start < activeHighlight.end
                  const isPast = !!activeHighlight && tr.end <= activeHighlight.start
                  const inPhrase = !!layeredHighlights.phrase &&
                    tr.start >= layeredHighlights.phrase.start && tr.start < layeredHighlights.phrase.end
                  const inSentence = !!layeredHighlights.sentence &&
                    tr.start >= layeredHighlights.sentence.start && tr.start < layeredHighlights.sentence.end
                  const inParagraph = !!layeredHighlights.paragraph &&
                    tr.start >= layeredHighlights.paragraph.start && tr.start < layeredHighlights.paragraph.end
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
              className="osc-textarea"
              placeholder="enter source text…"
              value={text}
              onChange={e => { if (isPlaying) stop(); setText(e.target.value) }}
            />
          </div>

          <Transport
            isPlaying={isPlaying}
            canPlay={!!text.trim()}
            onPlay={handlePlay}
            onStop={stop}
            onReset={() => {
              stop()
              const d = DEFAULT_PARAMS
              setParams(d)
              saveToStorage(d)
            }}
            onExport={() => exportConfig(params)}
          />
        </div>

        <Controls
          params={params}
          onChange={p => { setParams(p); saveToStorage(p) }}
          isPlaying={isPlaying}
          tick={tick}
        />
      </div>
    </div>
  )
}
