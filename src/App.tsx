import { useRef, useState, useCallback } from 'react'
import { parseText } from './parser'
import { buildSoundParams, SoundEngine } from './soundEngine'
import { DEFAULT_PARAMS } from './types'
import type { AppParams, ParseLevel } from './types'
import { loadFromStorage, saveToStorage } from './configStore'
import Controls from './components/Controls'

const engine = new SoundEngine()

export default function App() {
  const [text, setText] = useState('')
  const [params, setParams] = useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeUnit, setActiveUnit] = useState<string | null>(null)
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (playbackRef.current) clearTimeout(playbackRef.current)
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

  const LEVELS: ParseLevel[] = ['letter', 'word', 'phrase', 'sentence', 'paragraph']

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-mono tracking-widest text-zinc-400">singling lab</h1>
      </header>

      <main className="flex flex-1 gap-0 overflow-hidden">
        {/* Left: input + controls */}
        <div className="flex flex-col w-1/2 border-r border-zinc-800">
          <div className="p-4 flex-1 flex flex-col gap-4">
            <textarea
              className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded p-3 font-mono text-sm text-zinc-200 resize-none focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
              placeholder="Enter text to sonify..."
              value={text}
              onChange={e => setText(e.target.value)}
            />

            {/* Parse level selector */}
            <div className="flex gap-2">
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setParams(p => ({ ...p, parseLevel: level }))}
                  className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                    params.parseLevel === level
                      ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Play / Stop */}
            <button
              onClick={play}
              disabled={!text.trim()}
              className={`py-2 rounded font-mono text-sm border transition-colors ${
                isPlaying
                  ? 'bg-red-900/40 border-red-700 text-red-300 hover:bg-red-900/60'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-200 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {isPlaying ? 'stop' : 'play'}
            </button>

            {/* Active unit display */}
            <div className="h-8 flex items-center">
              {activeUnit && (
                <span className="font-mono text-xs text-zinc-400 truncate">
                  ▶ <span className="text-zinc-200">{activeUnit}</span>
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
