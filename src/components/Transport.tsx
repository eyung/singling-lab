interface Props {
  isPlaying: boolean
  canPlay: boolean
  onPlay: () => void
  onStop: () => void
  onReset: () => void
  onExport: () => void
}

export default function Transport({ isPlaying, canPlay, onPlay, onStop, onReset, onExport }: Props) {
  return (
    <div className="osc-transport">
      <button className="osc-tb" onClick={onReset} aria-label="reset to defaults">
        <span className="osc-tb__glyph">◀◀</span>
        reset
      </button>
      <button
        className="osc-tb osc-tb--big osc-tb--play"
        disabled={!canPlay}
        onClick={onPlay}
        aria-label={isPlaying ? 'pause' : 'play'}
      >
        <span className="osc-tb__glyph">{isPlaying ? '‖' : '▶'}</span>
        {isPlaying ? 'pause' : 'play'}
      </button>
      <button className="osc-tb osc-tb--stop" onClick={onStop} aria-label="stop">
        <span className="osc-tb__glyph">■</span>
        stop
      </button>
      <button className="osc-tb" onClick={onExport} aria-label="export configuration">
        <span className="osc-tb__glyph">◉</span>
        export
      </button>
    </div>
  )
}
