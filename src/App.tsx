import { useRef, useState, useCallback } from 'react'
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

const engine = new SoundEngine()

export default function App() {
  const [text, setText] = useState('')
  const [params, setParams] = useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeUnit, setActiveUnit] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const layeredPlaybackRefs = useRef<Partial<Record<LayeredLevel, ReturnType<typeof setTimeout>>>>({})

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
  }, [])

  const play = useCallback(() => {
    if (isPlaying) { stop(); return }

    const units = parseText(text, params.parseLevel)
    if (!units.length) return

    engine.updateMaxVoices(params.polyphony)
    setIsPlaying(true)

    let i = 0
    const tick = () => {
      if (i >= units.length) { setIsPlaying(false); setActiveUnit(null); return }
      const unit = units[i]!
      i++
      if (params.levels[unit.level].enabled) {
        const sp = buildSoundParams(unit, params)
        engine.playUnit(sp)
        setActiveUnit(unit.text)
      }
      const interval = params.tempo * (params.semantic.energyToTempo
        ? Math.max(0.4, 1 - unit.semantic.energy * 0.5)
        : 1)
      playbackRef.current = setTimeout(tick, interval)
    }
    tick()
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
      const tick = () => {
        if (i >= units.length) {
          completedLoops++
          if (completedLoops >= activeLevels.length) {
            setIsPlaying(false)
            setActiveUnit(null)
          }
          return
        }
        const unit = units[i]!
        i++
        const sp = buildSoundParams(unit, params)
        sp.frequency = quantiseToCMajor(sp.frequency)
        engine.playLayeredUnit(sp, char, levelConfig.gain)
        // Only the word layer updates the active unit display
        if (level === 'word') setActiveUnit(unit.text)
        const interval = params.tempo * (params.semantic.energyToTempo
          ? Math.max(0.4, 1 - unit.semantic.energy * 0.5)
          : 1)
        layeredPlaybackRefs.current[level] = setTimeout(tick, interval)
      }
      tick()
    }
  }, [text, params, isPlaying, stop])

  const handlePlay = useCallback(() => {
    if (params.mode === 'layered') {
      playLayered()
    } else {
      play()
    }
  }, [params.mode, play, playLayered])

  const LEVELS: ParseLevel[] = ['letter', 'word', 'phrase', 'sentence', 'paragraph']

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-100 dark:bg-zinc-950">
        <h1 className="text-lg font-mono tracking-widest text-zinc-500 dark:text-zinc-400">singling lab</h1>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="text-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 rounded"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main className="flex flex-1 gap-0 overflow-hidden">
        {/* Left: input + controls */}
        <div className="flex flex-col w-1/2 border-r border-zinc-200 dark:border-zinc-800">
          <div className="p-4 flex-1 flex flex-col gap-4">
            <textarea
              className="flex-1 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded p-3 font-mono text-sm text-zinc-900 dark:text-zinc-200 resize-none focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              placeholder="Enter text to sonify..."
              value={text}
              onChange={e => setText(e.target.value)}
            />

            {/* Parse level selector (single mode) */}
            {params.mode === 'single' && (
              <div className="flex gap-2">
                {LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setParams(p => { const next = { ...p, parseLevel: level }; saveToStorage(next); return next })}
                    className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                      params.parseLevel === level
                        ? 'bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 border-zinc-800 dark:border-zinc-200'
                        : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2">
              {(['single', 'layered'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    if (isPlaying) stop()
                    setParams(p => {
                      const next = { ...p, mode: m }
                      saveToStorage(next)
                      return next
                    })
                  }}
                  aria-label={m === 'single' ? 'Switch to single-level playback mode' : 'Switch to layered playback mode'}
                  className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                    params.mode === m
                      ? 'bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 border-zinc-800 dark:border-zinc-200'
                      : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Play / Stop */}
            <button
              onClick={handlePlay}
              disabled={!text.trim()}
              className={`py-2 rounded font-mono text-sm border transition-colors ${
                isPlaying
                  ? 'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
                  : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {isPlaying ? 'stop' : 'play'}
            </button>

            {/* Active unit display */}
            <div className="h-8 flex items-center">
              {activeUnit && (
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  ▶ <span className="text-zinc-800 dark:text-zinc-200">{activeUnit}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: parameter controls */}
        <Controls params={params} onChange={p => { setParams(p); saveToStorage(p) }} />
      </main>
    </div>
  )
}
