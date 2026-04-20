import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { parseText } from './parser'
import { buildSoundParams, SoundEngine, quantiseToCMajor } from './soundEngine'
import { DEFAULT_PARAMS } from './types'
import type { AppParams, ParseLevel, LayeredLevel } from './types'
import { LAYERED_LEVELS } from './types'
import { loadFromStorage, saveToStorage } from './configStore'
import { getInitialTheme, applyTheme } from './themeStore'
import type { Theme } from './themeStore'
import { getSoundCharacter } from './soundCharacters'
import Controls from './components/Controls'
import CrtScope from './components/CrtScope'
import Transport from './components/Transport'
import { exportConfig } from './configStore'

const engine = new SoundEngine()

export default function App() {
  const [text, setText] = useState('')
  const [params, setParams] = useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeUnit, setActiveUnit] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  const [tick, setTick] = useState(0)
  const [activeDisplayIdx, setActiveDisplayIdx] = useState(-1)
  const rafRef = useRef<number | null>(null)
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const layeredPlaybackRefs = useRef<Partial<Record<LayeredLevel, ReturnType<typeof setTimeout>>>>({})

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
    for (const level of LAYERED_LEVELS) {
      const ref = layeredPlaybackRefs.current[level]
      if (ref != null) clearTimeout(ref)
    }
    layeredPlaybackRefs.current = {}
    engine.stop()
    setIsPlaying(false)
    setActiveUnit(null)
    setActiveDisplayIdx(-1)
  }, [])

  const play = useCallback(() => {
    if (isPlaying) { stop(); return }

    const units = parseText(text, params.parseLevel)
    if (!units.length) return

    engine.updateMaxVoices(params.polyphony)
    setIsPlaying(true)

    let i = 0
    const step = () => {
      if (i >= units.length) { setIsPlaying(false); setActiveUnit(null); setActiveDisplayIdx(-1); return }
      const unit = units[i]!
      i++
      if (params.levels[unit.level].enabled) {
        const sp = buildSoundParams(unit, params)
        engine.playUnit(sp)
        setActiveUnit(unit.text)
        setActiveDisplayIdx(unit.index * 2)
      }
      const interval = params.tempo * (params.semantic.energyToTempo
        ? Math.max(0.4, 1 - unit.semantic.energy * 0.5)
        : 1)
      playbackRef.current = setTimeout(step, interval)
    }
    step()
  }, [text, params, isPlaying, stop])

  const playLayered = useCallback(() => {
    if (isPlaying) { stop(); return }

    engine.updateMaxVoices(params.polyphony)

    // Parse text at all 4 layered levels simultaneously
    const allUnits: Partial<Record<LayeredLevel, ReturnType<typeof parseText>>> = {}
    for (const level of LAYERED_LEVELS) {
      allUnits[level] = parseText(text, level as ParseLevel)
    }

    const activeLevels = LAYERED_LEVELS.filter(
      level => params.layered[level].enabled && (allUnits[level]?.length ?? 0) > 0
    )
    if (!activeLevels.length) return

    setIsPlaying(true)
    let completedLoops = 0

    for (const level of activeLevels) {
      const units = allUnits[level]!
      const levelConfig = params.layered[level]
      const char = getSoundCharacter(levelConfig.soundCharacterId) ?? getSoundCharacter('default')!

      let i = 0
      const step = () => {
        if (i >= units.length) {
          completedLoops++
          if (completedLoops >= activeLevels.length) {
            setIsPlaying(false)
            setActiveUnit(null)
            setActiveDisplayIdx(-1)
          }
          return
        }
        const unit = units[i]!
        i++
        const sp = buildSoundParams(unit, params)
        sp.frequency = quantiseToCMajor(sp.frequency)
        engine.playLayeredUnit(sp, char, levelConfig.gain)
        if (level === 'word') {
          setActiveUnit(unit.text)
          setActiveDisplayIdx(unit.index * 2)
        }
        const interval = params.tempo * (params.semantic.energyToTempo
          ? Math.max(0.4, 1 - unit.semantic.energy * 0.5)
          : 1)
        layeredPlaybackRefs.current[level] = setTimeout(step, interval)
      }
      step()
    }
  }, [text, params, isPlaying, stop])

  const handlePlay = useCallback(() => {
    if (params.mode === 'layered') {
      playLayered()
    } else {
      play()
    }
  }, [params.mode, play, playLayered])

  const displayTokens = useMemo(() => text ? text.split(/(\s+)/) : [], [text])

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
                {displayTokens.map((t, i) => (
                  <span
                    key={i}
                    className={i === activeDisplayIdx ? 'cur' : i < activeDisplayIdx ? 'past' : ''}
                  >{t}</span>
                ))}
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
