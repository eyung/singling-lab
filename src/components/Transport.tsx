import type { EngineState } from '../soundEngine'

interface Props {
  playState: EngineState
  canPlay: boolean
  rendering: boolean
  onPlayPause: () => void
  onStop: () => void
  onReset: () => void
  onRec: () => void
}

export default function Transport({ playState, canPlay, rendering, onPlayPause, onStop, onReset, onRec }: Props) {
  return (
    <div className="osc-transport">
      <button className="osc-tb" onClick={onReset} aria-label="reset all parameters to defaults">
        <span className="osc-tb__glyph">◀◀</span>
        reset
      </button>
      <button
        className="osc-tb osc-tb--big osc-tb--play"
        disabled={!canPlay}
        onClick={onPlayPause}
        aria-label={playState === 'playing' ? 'pause' : 'play'}
      >
        <span className="osc-tb__glyph">{playState === 'playing' ? '‖' : '▶'}</span>
        {playState === 'playing' ? 'pause' : playState === 'paused' ? 'resume' : 'play'}
      </button>
      <button className="osc-tb osc-tb--stop" onClick={onStop} aria-label="stop playback">
        <span className="osc-tb__glyph">■</span>
        stop
      </button>
      <button
        className={`osc-tb osc-tb--rec${rendering ? ' osc-tb--busy' : ''}`}
        disabled={!canPlay || rendering}
        onClick={onRec}
        aria-label="render and download WAV file"
      >
        <span className="osc-tb__glyph">◉</span>
        {rendering ? 'rendering' : 'rec wav'}
      </button>
    </div>
  )
}
