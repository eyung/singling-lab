# Research: MIDI Instrument Selector

**Branch**: `003-midi-instrument-select` | **Date**: 2026-04-13
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: Instrument Model — Oscillator Presets, Not General MIDI

**Decision**: Instruments are named oscillator-based timbre presets defined in a static
`instruments.ts` module. Each preset specifies `waveform`, `filterCutoff`, `filterQ`,
`attack`, and `release`. There are no audio sample banks, no SF2 files, and no real
General MIDI playback.

**Rationale**: Constitution Principle VIII restricts the synthesis chain to
`OscillatorNode → BiquadFilterNode → GainNode → AudioContext.destination`. General MIDI
playback requires `AudioBufferSourceNode` with sample data, which violates this constraint.
The spec assumption ("MIDI instrument = in-browser GM timbre synthesis via oscillators")
is honoured; the "MIDI" naming is cosmetic — these are oscillator characters inspired by
GM instrument families, not faithful reconstructions.

**Alternatives considered**:
- **Web Audio API + Tone.js PolySynth**: Tone.js provides GM-like instrument models but
  is an external audio library. Violates Principle VIII.
- **AudioBufferSourceNode with embedded samples**: Technically Web Audio, but the samples
  themselves (SF2, WAV) are external audio dependencies. Principle VIII prohibits this.
- **True 128-preset catalog**: 128 oscillator presets mapped to GM program numbers.
  Feasible, but most presets would be indistinguishable (oscillators cannot produce the
  timbral richness of real GM). Rejected in favour of ~12 curated, meaningfully distinct
  presets that maximise perceived variety within oscillator synthesis constraints.

---

## Decision 2: Preset Application Strategy — Write Into LevelParams

**Decision**: Selecting an instrument writes its preset values (`waveform`, `filterCutoff`,
`filterQ`, `attack`, `release`, `gain`) into ALL five `LevelParams` entries in `AppParams`.
A new `instrument: string` field in `AppParams` stores the active preset ID. `buildSoundParams()`
requires no changes.

**Rationale**: The existing `buildSoundParams()` function already reads from `LevelParams`.
Writing preset values directly into level params means:
- No changes to the synthesis path
- Individual sliders remain live and override instrument values immediately (Principle IV)
- The instrument field is a pure label — it tracks what was last applied; individual slider
  changes do not reset it (satisfying FR-006: instrument selection persists through
  other parameter changes)
- Pitch ranges and duration ranges per level are preserved — instruments only override
  timbre-shaping fields, not pitch or duration

**Alternatives considered**:
- **Instrument as a modifier in `buildSoundParams()`**: Would require adding `instrument`
  to `buildSoundParams()`'s signature and adding instrument-specific blending logic inside
  a function that currently has zero branches. Adds complexity to the hot path for no gain.
- **Instrument as a separate AppParams branch**: A parallel `instrumentOverrides` structure
  merged in `buildSoundParams()`. Over-engineered for 12 presets.
- **Waveform-only instrument**: Simplest possible implementation (map instrument to OscillatorType).
  Rejected because waveform alone cannot differentiate piano from strings from organ — envelope
  and filter shape are equally important timbral dimensions.

---

## Decision 3: Preset Catalog — 12 Named Characters

**Decision**: 12 named instrument characters, each with a distinct oscillator + envelope +
filter signature. Names are evocative rather than GM-literal.

| ID | Name | Waveform | Attack (s) | Release (s) | FilterCutoff (Hz) | FilterQ |
|---|---|---|---|---|---|---|
| `default` | Default | sine | 0.010 | 0.100 | 2000 | 1.0 |
| `piano` | Piano | triangle | 0.002 | 0.080 | 3500 | 0.8 |
| `organ` | Organ | square | 0.005 | 0.010 | 1800 | 0.5 |
| `strings` | Strings | sawtooth | 0.120 | 0.400 | 1200 | 2.0 |
| `brass` | Brass | sawtooth | 0.030 | 0.150 | 4000 | 3.0 |
| `flute` | Flute | sine | 0.060 | 0.200 | 6000 | 0.3 |
| `bass` | Bass | sawtooth | 0.008 | 0.060 | 500 | 1.5 |
| `pluck` | Pluck | triangle | 0.001 | 0.040 | 5000 | 4.0 |
| `pad` | Pad | sine | 0.300 | 0.800 | 1000 | 0.5 |
| `bell` | Bell | sine | 0.001 | 1.200 | 8000 | 6.0 |
| `choir` | Choir | triangle | 0.150 | 0.600 | 900 | 1.5 |
| `lead` | Synth Lead | square | 0.005 | 0.080 | 5000 | 2.0 |

`gain` is fixed at 0.4 for all presets (matches the existing default; prevents volume
jumps when switching instruments).

**Rationale**: 12 presets provide meaningful timbral variety (percussive, sustained, bright,
dark, fast-attack, slow-attack) without overwhelming the UI with scrolling. The catalog covers
the major GM instrument families (keyboard, woodwind, brass, strings, bass, synthesizer, bell)
in a meaningful way. All 12 are audibly distinct under the oscillator synthesis model.

**Alternatives considered**:
- 128 presets (GM-exact): Most would be identical or nearly identical under oscillator constraints.
  Creates an unusable scrolling list. Rejected.
- 4 presets (one per waveform): Too few; ignores envelope and filter differentiation. Rejected.
- User-defined presets: Out of scope for v1.

---

## Decision 4: UI Control — `<select>` Dropdown in Global Section

**Decision**: A `<select>` dropdown placed in the "Global" section of `Controls.tsx`,
above the existing `tempo` and `polyphony` sliders. Styled consistently with the existing
waveform selector pattern (same CSS classes).

**Rationale**: `<select>` is the lowest-friction mechanism for choosing from a fixed list
of 12 named options. It fits in one line, is accessible by default, and matches the existing
waveform selector in `LevelEditor`. Placement in the Global section (not inside a
per-level `<details>`) reflects that the instrument applies to all levels simultaneously.

**Alternatives considered**:
- Radio buttons: Take more vertical space; no advantage for 12 options.
- Button group: Good for 4-6 options, but 12 creates visual clutter.
- Searchable combobox: Overkill for 12 items.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---|---|
| What "MIDI instrument" means within this system | Oscillator-based timbre preset (not GM sample playback) |
| Number of presets | 12 curated characters |
| How presets are applied | Written into all LevelParams entries; `instrument` field is label only |
| Changes to synthesis path | None — `buildSoundParams()` unchanged |
| UI control type | `<select>` dropdown in Global section of Controls panel |
| Preset persistence | Session-scoped (in-memory); resets on page reload — matches existing behaviour |
