# Feature Specification: Sonic Overhaul — Timeline Architecture, Full Semantic System, Required Exports

**Feature Branch**: `008-sonic-overhaul`
**Created**: 2026-06-12
**Status**: Implemented
**Input**: Whole-app refactor: fix structural playback bugs, implement every constitution-mandated
capability still missing (exports, punctuation, keywords, extended semantics), and elevate the
OSC-1 instrument into a literacoustic workbench that is educational and fun.

## Why

The constitution (v2.1.0) mandates capabilities that were never implemented:

- **Output formats** (§Output Formats): `.wav` (REQUIRED), `.txt` (REQUIRED), `.mid` (OPTIONAL) — none existed.
- **Rule 6**: punctuation MUST be sonified — the parser silently discarded it.
- **Rule 7**: user keywords MUST override mapping — not implemented.
- **Semantic System**: `wordClass`, `frequencyTier`, `wordLength`, `modalStrength`, category
  mapping, and five of the eight semantic overrides were missing.
- **Principle IX (Reduce Ambiguity)**: playback used chained `setTimeout`, so timing (and layer
  sync) was nondeterministic and drifted; noise buffers used `Math.random`, so no two renders
  matched.

And the implementation had real bugs:

1. Layer sync drift — each step re-armed `setTimeout`, accumulating error across layers.
2. Conjunctions leaked out of the phrase splitter as standalone "phrases" (`String.split` with a
   capture group).
3. Unit→text matching used `indexOf` re-search, which broke highlights on repeated words and
   compromise-normalised sentences.
4. The transport "pause" button actually stopped and reset playback.
5. Default settings dropped notes: voice tails kept `activeVoices` high with `polyphony: 4`.
6. Envelope breakpoints could cross (`attack > duration − release`), producing clicks.
7. The scope waveform and VU meter were decorative fakes.
8. The highlight overlay desynced from the textarea on scroll.
9. Sound-character envelopes (e.g. pad's slow attack) were ignored in layered mode.

## What

### 1. Deterministic Timeline core
`buildTimeline(parsed, params)` produces the complete event schedule — a pure function of
(text, params). Live playback, WAV render, MIDI export and the structure map all consume the
same Timeline. Voice stealing (Rule 4) is applied deterministically at build time with a
min-heap sweep. Same text + params → identical schedule, identical WAV bytes (noise is seeded
per event).

### 2. Offset-exact parser
Segmentation is performed directly on the raw string with exact `CharRange`s — for every unit,
`text.slice(range.start, range.end) === unit.text`. Sentence boundaries guard abbreviations and
initials; conjunctions attach forward to the next phrase (no orphan units); punctuation marks
are first-class word-level units (`kind: 'punct'`). compromise runs once per parse for POS tags
keyed by term offset.

### 3. Extended semantic system
Per word: `wordClass` (noun/verb/adjective/adverb/function), `modalStrength` (constitution
scale, could 0.15 → must 0.95), `frequencyTier` (common/uncommon/rare, documented strategy),
`syllables`, `category` (10 curated categories + compromise tags), negation-aware sentiment
(3-word window). Per sentence: `sentenceType` (declarative/question/exclamation).

Overrides (Rule 3, all user-toggleable): sentiment→pitch, energy→filter, energy→tempo,
wordLength→duration, modalStrength→pitch, frequencyTier→gain, category→character (editable
mapping table), punctuation sounds, sentence contour (questions glide up; exclamations accent).
Keyword triggers (Rule 7): word → designated sound character + gain boost, overriding all else.

### 4. Musical scale system
Configurable root (C–B) and mode (major, minor, pentatonic ×2, dorian, mixolydian, whole-tone,
chromatic). Layered mode always quantises (Principle V); single mode by toggle. Replaces the
hard-coded C-major table.

### 5. Required exports
- **WAV**: OfflineAudioContext render through the identical synthesis graph → PCM16 stereo.
- **TXT**: parse report with per-unit semantic annotations (learning resource).
- **MIDI**: format 1; one track per level, GM programs per character, punctuation on the GM
  drum channel; channel-per-layer for musicians.
- Config JSON export/import retained (CONFIG_VERSION 2, fully backward compatible).

### 6. Playback engine
Web Audio lookahead scheduler (sample-accurate layer sync), true pause/resume via
`AudioContext.suspend/resume`, seek to any word, click-free master fade on stop, master
limiter + analyser bus.

### 7. Instrument UI
- CRT scope: real analyser waveform with phosphor persistence (canvas), semantic inspector
  readout for the active unit, layer-activity LEDs, parse stats when idle.
- Structure map: canvas strip of all four structural rows with sweeping playhead; click a word
  to play from it; keyboard seekable (slider semantics).
- Real VU metering (RMS of master bus).
- Transport: play/pause/resume, stop, reset, **rec wav**.
- Input deck: demo text chips (storm / ishmael / rhythm), live-typing mode (words sound as you
  finish typing them), layered underline legend, scroll-synced overlay.
- Controls: global / levels / layers / language tabs — scale group, per-level rate, per-layer
  pan, keyword editor, category→character table.
- Light theme corrections; responsive single-column layout under 1080 px.

## Out of scope

TTS accessibility rendering (constitution-permitted, separate feature), real WordNet corpus,
multilingual parsing, live-mode continuous re-sonification, MIDI input.

## Success criteria

- `npm test`: parser offset invariants, scale, mapping, timeline sync/drop determinism, WAV/MIDI
  encoders — all green.
- `npm run build`: zero TypeScript errors (strict, no `any`).
- A first-time user can load a demo, press play, watch the structure map and inspector, and
  leave with `.wav`, `.txt`, `.mid` and config files from one session (constitution
  "successful first session").
