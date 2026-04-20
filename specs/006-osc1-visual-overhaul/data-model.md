# Data Model: OSC-1 Visual Overhaul

**Branch**: `006-osc1-visual-overhaul`  
**Date**: 2026-04-20

This feature is entirely visual. **No changes to `AppParams`, `LevelParams`, `LayeredLevelConfig`, `SoundParams`, `ConfigFile`, or any other type in `types.ts`.** The data model is the existing React component prop interface layer only.

---

## New Component Prop Interfaces

These are TypeScript prop interfaces for the new visual components. They are not stored in `types.ts` — each interface is co-located in its component file.

### `CrtScope`

```typescript
interface CrtScopeProps {
  playing: boolean
  activeUnit: string | null
  params: AppParams          // read: levels.word.waveform, levels.word.pitchMin/Max, levels.word.gain, tempo, polyphony, instrument
  tick: number               // rAF frame counter — used for waveform animation phase
}
```

**Derived values** (computed inside component, not stored):
- `freq`: midpoint of `levels.word.pitchMin + pitchMax` — shown in readout strip
- `path`: SVG path string — computed from `tick`, `playing`, `levels.word.waveform`

---

### `LedBar`

```typescript
interface LedBarProps {
  label: string              // displayed as uppercase monospace above-left
  min: number
  max: number
  step?: number              // default: 1
  value: number
  unit?: string              // e.g. "hz", "ms", "s" — appended to value display
  onChange: (v: number) => void
}
```

**Derived values**:
- `frac`: `(value - min) / (max - min)` — fraction of bar lit
- `litCount`: `Math.round(frac * SEGMENT_COUNT)` — segments lit (SEGMENT_COUNT = 24)

---

### `Rocker`

```typescript
interface RockerProps<T extends string = string> {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}
```

No label — caller renders label above if needed (matches UI kit pattern where `<span className="osc-sel-label">` is rendered by the parent).

---

### `Toggle`

```typescript
interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}
```

---

### `VuMeter`

```typescript
interface VuMeterProps {
  playing: boolean
  tick: number               // rAF frame counter
}
```

**Derived values**:
- `level`: `playing ? 0.55 + 0.35*sin(tick/4) + 0.1*sin(tick/1.3) : 0.04`
- `litCount`: `Math.round(level * SEGMENT_COUNT)` — (SEGMENT_COUNT = 20)
- Segment color zones: phosphor (0–65%), amber (65–85%), rose (85–100%)

---

### `Transport`

```typescript
interface TransportProps {
  isPlaying: boolean
  canPlay: boolean           // true when text is non-empty
  onPlay: () => void         // toggles play/pause
  onStop: () => void
  onReset: () => void
  onExport: () => void       // delegates to exportConfig()
}
```

---

## Component Dependency Tree

```
App.tsx
├── CrtScope.tsx           (playing, activeUnit, params, tick)
├── TextPad [inline]       (text, tokens, activeIndex, onText, isPlaying)
├── Transport.tsx          (isPlaying, canPlay, onPlay, onStop, onReset, onExport)
└── Controls.tsx           (params, onChange)
    ├── LedBar.tsx         (label, min, max, step, value, unit, onChange)
    ├── Rocker.tsx         (value, options, onChange)
    ├── Toggle.tsx         (label, checked, onChange)
    ├── VuMeter.tsx        (playing, tick)
    └── [LevelEditor]      (level, lp, onChange) — existing, restyled to use LedBar + Toggle
        └── LedBar.tsx
        └── Toggle.tsx
```

---

## State Additions to App.tsx

One new piece of state and one new ref:

```typescript
const [tick, setTick] = useState(0)           // rAF frame counter
const rafRef = useRef<number | null>(null)    // rAF handle for cleanup
```

No other state changes. `params`, `isPlaying`, `activeUnit`, `text` are unchanged.

---

## Existing Types: No Changes

| Type | Status |
|---|---|
| `AppParams` | Unchanged |
| `LevelParams` | Unchanged |
| `LayeredLevelConfig` | Unchanged |
| `SemanticParams` | Unchanged |
| `SoundParams` | Unchanged |
| `ConfigFile` | Unchanged |
| `CONFIG_VERSION` | Unchanged |
| `ParseUnit` | Unchanged |
| `SemanticSignal` | Unchanged |
