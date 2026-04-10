<!--
SYNC IMPACT REPORT
==================
Version change:   (none) → 1.0.0  [initial ratification — no prior version]
Run date:         2026-04-10

Modified principles:  none
Added sections:       none
Removed sections:     none

Template sync status:
  ✅ .specify/templates/plan-template.md  — Constitution Check gates filled with
     singling-lab-specific principle gates (I, III, IV, V, VII, VIII).
  ✅ .specify/templates/spec-template.md  — No conflicts with constitution. No changes needed.
  ✅ .specify/templates/tasks-template.md — Path conventions are single-project compatible.
     No changes needed.
  ⚠  .specify/templates/agent-file-template.md — All placeholders uninitialised.
     Expected: requires plan.md to be created first via /speckit-plan.

Deferred TODOs:
  - Open Questions section contains 7 unresolved design decisions (see §Open Questions).
    These are intentionally deferred; resolve via /speckit-specify as each becomes in-scope.

Validation:
  ✅ No unexplained bracket tokens remain.
  ✅ All principles use MUST / MUST NOT language.
  ✅ Dates are ISO 8601 (YYYY-MM-DD).
  ✅ Version line matches this report.
-->

# singling-lab Constitution

## Core Principles

### I. Non-Phonetic
The system MUST never attempt to approximate the pronunciation of text. Sound is
structural and semantic, not articulatory. Letter-level parsing does not assign
phoneme-based pitches to letters — letters are hashed, not transliterated.

### II. Deterministic Within a Session
Given the same text and the same parameters, the system MUST produce the same
sequence of Sound Params. The same word always produces the same base sound;
meaning modulates that sound, it does not replace it. (Audio timing may vary with
system load but is not part of the Sound Params contract.)

### III. Client-Side First
All core functionality MUST run in the browser. No server round-trips are required
for parsing, mapping, or sound production. Semantic analysis is client-side only;
no API calls are made for NLP processing. Vercel deployment is static; server
functions are reserved for future optional enhancements only.

### IV. Parameters Over Presets
The instrument rewards exploration. Defaults MUST be immediately interesting, but
the parameter space MUST be wide enough that no two users arrive at the same sound.
Every sonic property that the mapping produces MUST be exposed as a user-adjustable
parameter. Nothing is hardcoded that could reasonably vary.

### V. Structural Levels Are Orthogonal
Only one Parse Level is active at a time. Levels MUST NOT stack or nest during
playback. Multi-level simultaneous layering is deferred and will only be introduced
as an explicitly scoped feature. Disabling a level silences it but preserves its
timing slot in the playback sequence.

### VI. Silence Is Valid
An empty segment, a unit that fails voice-steal, or a disabled level are all
legitimate outcomes. The instrument MUST NOT force sound. Silence is information.

### VII. The Text Is Not Consumed
Playback is a reading, not a transformation. The source text MUST never be modified
by the playback engine. The system operates on a snapshot of the text taken at
play-time.

### VIII. No External Audio Dependencies
All synthesis MUST use the native browser Web Audio API. No external audio libraries
are permitted. The synthesis chain is:
OscillatorNode → BiquadFilterNode (lowpass) → GainNode → AudioContext.destination.

## Technical Specifications

### Vocabulary

| Term | Definition |
|---|---|
| **Text** | The raw written input provided by the user. |
| **Parse** | The act of segmenting text into discrete units at a chosen level of granularity. |
| **Parse Level** | The granularity at which text is divided: `letter`, `word`, `phrase`, `sentence`, `paragraph`. |
| **Unit** | A single segment produced by parsing — the atomic trigger of a sound event. |
| **Event** | The instantiation of a sound in response to a Unit. |
| **Sound Params** | The complete set of audio parameters that define a single Event. |
| **Semantic Signal** | Derived properties of a Unit's meaning: sentiment, energy, part-of-speech tags. |
| **Mapping** | The function that transforms a Unit and its Semantic Signal into Sound Params. |
| **Level Params** | User-controlled parameters that govern the Mapping for a specific Parse Level. |
| **Semantic Override** | A modifier that adjusts Sound Params based on Semantic Signal values. |
| **Voice** | A single active audio chain (oscillator → filter → gain). |
| **Polyphony** | The maximum number of Voices active simultaneously. |
| **Tempo** | The base interval (ms) between successive Event triggers. |

### Parse Levels

Parse Levels are ordered from finest to coarsest granularity. Each has a distinct
structural meaning and default sound character.

| Level | Unit Definition | Default Register |
|---|---|---|
| `letter` | Single character, excluding whitespace | High pitch, very short duration |
| `word` | Contiguous word characters (`\b\w+\b`) | Mid pitch, moderate duration |
| `phrase` | Sub-sentence segment (punctuation or conjunction boundary) | Lower-mid pitch, longer duration |
| `sentence` | Complete grammatical sentence | Low pitch, slow duration, triangle wave |
| `paragraph` | Block separated by double newlines | Very low pitch, very long duration, sawtooth wave |

### Sound Parameters

Every Event is fully described by these parameters:

| Parameter | Type | Range | Description |
|---|---|---|---|
| `frequency` | Hz | 20–20000 | Fundamental pitch of the oscillator |
| `waveform` | OscillatorType | sine, triangle, sawtooth, square | Spectral character |
| `duration` | s | 0.01–∞ | Total lifespan of the voice |
| `attack` | s | 0.001–∞ | Time to reach peak gain |
| `release` | s | 0.01–∞ | Time to decay from peak to silence |
| `filterCutoff` | Hz | 20–20000 | Lowpass filter corner frequency |
| `filterQ` | — | 0.1–20 | Filter resonance |
| `gain` | 0–1 | 0–1 | Peak amplitude |
| `detune` | cents | ±∞ | Fine-tuning offset from `frequency` |

### Mapping Rules

**Rule 1: Text determines position, not content.**
A Unit's text is hashed to a normalized 0–1 value that positions Sound Params
within Level Params ranges.

**Rule 2: Pitch and duration are mapped independently.**
Two separate hash functions operate on each Unit's text so pitch and duration vary
without correlation.

**Rule 3: Semantic Overrides blend, not replace.**
Overrides apply a weighted blend between the text-derived value and the semantic
target. Multiple enabled overrides compose additively.

**Rule 4: Voice stealing drops, never queues.**
If active Voice count reaches `polyphony`, new Events are dropped. Timing integrity
takes precedence over completeness.

### Semantic System

Three signals are extracted per Unit:

| Signal | Range | Source |
|---|---|---|
| `sentiment` | –1 to 1 | Word-level positive/negative lexicon + negation detection |
| `energy` | 0 to 1 | High-energy word lexicon + text length heuristic |
| `tags` | string[] | Part-of-speech tags via `compromise` |

Overrides:

| Override | Scope | Effect |
|---|---|---|
| `sentimentToPitch` | Sound Params | Blends pitch toward range top (positive) or bottom (negative) |
| `energyToFilterCutoff` | Sound Params | Opens filter for high-energy; closes for calm |
| `energyToTempo` | Playback timing only | Shortens inter-event interval for high-energy; stretches for calm |

### Parameter Validation Rules

- `pitchMin` MUST be < `pitchMax`
- `durationMin` MUST be < `durationMax`
- `attack + release` MUST be ≤ `durationMin` (clamped silently on change)
- `polyphony` is clamped to [1, 16]
- `tempo` is clamped to [50, 5000] ms

## Scope & Boundaries

### Identity

**singling-lab** is a text-to-sound transduction instrument. It converts written
language into non-phonetic audio events triggered by the structural and semantic
properties of text — not by pronunciation. It reads text as a scored performance
and renders that performance in sound.

### What This System Is Not

- Not a text-to-speech engine
- Not a music notation system
- Not a random noise generator (all sound is causally derived from text)
- Not a phoneme synthesizer
- Not a MIDI sequencer (MIDI export is a candidate future feature)
- Not a generative AI system

### Open Questions (to be resolved)

- [ ] Multi-level simultaneous playback: can letter and sentence events coexist?
- [ ] Visualization: how should active units be highlighted in the input text?
- [ ] Pitch quantization: should frequencies snap to musical scales, or stay continuous?
- [ ] Semantic expansion: clause depth, tense, named entities?
- [ ] Preset format: canonical JSON schema for saved parameter state?
- [ ] MIDI export: can the event stream be captured and exported?
- [ ] Phrase parser: what is the correct definition of a phrase for this instrument?

## Governance

This constitution supersedes all other project documents on matters of system
identity, design principles, and technical rules. In cases of conflict between
this document and implementation, this document is authoritative and the
implementation MUST be updated.

**Amendment procedure:**
1. Identify the change type (MAJOR / MINOR / PATCH per semver).
2. Update `.specify/memory/constitution.md` via `/speckit-constitution`.
3. Propagate changes to `.specify/templates/` as flagged in the Sync Impact Report.

**Versioning policy:**
- MAJOR: removal or redefinition of a Core Principle; breaking change to a
  Technical Specification rule.
- MINOR: new principle, new vocabulary term, new validation rule, expanded section.
- PATCH: clarifications, wording, typo fixes, non-semantic refinements.

**Compliance:** All implementation decisions MUST be checked against Core Principles
before merging. Spec check SHOULD be run after any significant implementation session.

**Version**: 1.0.0 | **Ratified**: 2026-04-10 | **Last Amended**: 2026-04-10
