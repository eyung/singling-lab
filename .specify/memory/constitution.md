<!--
SYNC IMPACT REPORT
==================
Version change:   2.0.0 → 2.1.0  [MINOR — amended Principle V to recognise layered mode;
                                   new vocabulary terms; Future Scope item resolved;
                                   Open Question resolved]
Run date:         2026-04-20

Modified principles:
  - V. Structural Levels: amended to recognise `layered` as a supported first-class
    playback mode alongside `single`; the original "one level at a time" rule now
    applies within single mode only

Added vocabulary terms:
  - Layered Mode, Sound Character, Layer Config, Backdrop Level

Resolved Future Scope items:
  - Simultaneous multi-level playback → implemented in 005-audio-layering

Resolved Open Questions:
  - Multi-level simultaneous playback → resolved; layered mode is now live

Template sync status:
  ✅ No template changes required for this amendment.

---

Previous report (2.0.0):
Version change:   1.0.0 → 2.0.0  [MAJOR — new principles, amended principles, new vocabulary,
                                   expanded semantic system, resolved open questions]
Run date:         2026-04-14

Modified principles:
  - I. Non-Phonetic: clarified that phonetic TTS is permitted as an explicit accessibility
    option, separate from the core non-phonetic instrument; the instrument itself remains non-phonetic
  - VIII. No External Audio Dependencies: unchanged; MIDI and WAV export are output formats
    (file writing), not audio synthesis dependencies

Added principles:
  - IX. Reduce Ambiguity — output ambiguity must be minimised for research validity
  - X. Persist & Portability — configuration must be saveable and shareable
  - XI. Accessibility First — must support screen readers and visually disabled users

Added sections:
  - Vision & Mission
  - Users & Audiences
  - Output Formats
  - Live Mode

Modified sections:
  - Semantic System: substantially expanded (WordNet, modals, keywords, word frequency,
    punctuation, function words)
  - Scope & Boundaries: updated to reflect successor relationship to Singling 1.0
  - Open Questions: several resolved; remaining flagged

Removed sections:  none

Template sync status:
  ⚠  .specify/templates/plan-template.md  — Constitution Check gates need updating:
     Add gates for principles IX, X, XI. Flag as requiring manual update.
  ✅ .specify/templates/spec-template.md  — No structural conflicts.
  ✅ .specify/templates/tasks-template.md — No conflicts.
  ⚠  .specify/templates/agent-file-template.md — CLAUDE.md needs sync after next plan.

Deferred TODOs:
  - Phrase parser definition: partially resolved; full definition deferred to dedicated spec
  - Live mode: scoped as future feature; spec pending
  - Browser plugin: deferred; not in scope for current implementation
  - Multilingual support: English first; expansion deferred
  - Bold/italic text as semantic signal: deferred to later stage

Validation:
  ✅ No unexplained bracket tokens remain.
  ✅ All principles use MUST / MUST NOT language.
  ✅ Dates are ISO 8601 (YYYY-MM-DD).
  ✅ Version line matches this report.
-->

# singling-lab Constitution

## Vision & Mission

singling-lab is the web-based successor to Singling 1.0. Its core mission is to enable text
to be "read" as non-phonetic sound, transforming written language into an arbitrary musical
form of expression — one that preserves the temporal nature of language so that context,
implication, ambiguity, and nuance remain present in the output. The goal is to make sound
interpretable: listeners should be able to derive meaning from the audio, a capacity the
project calls **literacoustics**.

Text sonification differs from text visualization because it maintains temporal structure.
Visualization collapses language into a spatial artefact and loses sequence; sonification
preserves the reading order and therefore preserves the relational meaning between units.

singling-lab overcomes the key limitations of Singling 1.0: it runs in a browser without
installation, reduces ambiguous outputs, produces results faster, and supports parsing at
larger granularities (phrase, sentence, paragraph) with configurable semantic analysis.

## Users & Audiences

**Primary users**: The general public, with initial priority given to:
1. People with visual disabilities who rely on auditory channels
2. Language, literacy, and sound researchers
3. Accessibility and inclusion practitioners
4. Composers and sound artists
5. Writers and teachers

**Literacy assumption**: No deep knowledge of music, linguistics, or technology is required
to produce output. Entry-level presets allow any first-time user to sonify text immediately.
Advanced configuration teaches the user about musical, grammatical, and technological
concepts as they explore.

**Successful first session**: The user leaves with:
- A `.wav` file of their sonified text
- A `.txt` file of their parsed text (as a learning resource)
- Optionally, a `.mid` MIDI file for further musical exploration
- Increased understanding of how language is structured and how musical sound is described

## Core Principles

### I. Non-Phonetic
The core instrument MUST never attempt to approximate the pronunciation of text. Sound is
structural and semantic, not articulatory. Letter-level parsing does not assign
phoneme-based pitches to letters — letters are hashed, not transliterated.

**Exception**: A phonetic text-to-voice (TTS) rendering MAY be offered as a separate,
explicit **accessibility feature** for users with visual disabilities. This feature is
distinct from the core instrument and MUST be clearly labelled as TTS rather than
sonification. It does not affect or replace the non-phonetic synthesis chain.

### II. Deterministic Within a Session
Given the same text and the same parameters, the system MUST produce the same
sequence of Sound Params. The same word always produces the same base sound;
meaning modulates that sound, it does not replace it. (Audio timing may vary with
system load but is not part of the Sound Params contract.)

### III. Client-Side First
All core functionality MUST run in the browser. No server round-trips are required
for parsing, mapping, or sound production. Semantic analysis is client-side only.
Vercel deployment is static; server functions are reserved for future optional
enhancements only.

### IV. Parameters Over Presets
The instrument rewards exploration. Defaults MUST be immediately interesting and
accessible to first-time users via presets. The parameter space MUST be wide enough
that no two users arrive at the same sound. Every sonic property that the mapping
produces MUST be exposed as a user-adjustable parameter. Nothing is hardcoded that
could reasonably vary.

Presets are a starting point, not a ceiling.

### V. Structural Levels Are Orthogonal
Two playback modes are supported: **single** and **layered**.

**Single mode** (default): Only one Parse Level is active at a time. Levels MUST
NOT stack or nest. Disabling a level silences it but preserves its timing slot in
the playback sequence. The user MUST be able to switch seamlessly between parse
levels (paragraph → sentence → phrase → word → letter) without restarting the
session.

**Layered mode**: Word, phrase, sentence, and paragraph levels sonify simultaneously
from the same input text, each with an independent instrument, gain, and enabled
state. The letter level does not participate in layered mode. The following
constraints apply in layered mode:

- Gain hierarchy MUST be enforced: word is the most prominent (loudest foreground);
  paragraph is the quietest (deepest backdrop). Default gains: word 0.70,
  phrase 0.42, sentence 0.22, paragraph 0.10.
- **Backdrop levels** (phrase, sentence, paragraph) MUST only use non-percussive
  sound characters. Percussive sounds are restricted to the word level.
- All simultaneous voices MUST be routed through a master limiter to prevent
  clipping.
- Pitch quantisation to a shared musical scale (default: C major) MUST be applied
  across all layers to ensure harmoniousness.
- Any layer with no parsed units for the current input MUST remain silent without
  error.

### VI. Silence Is Valid
An empty segment, a unit that fails voice-steal, or a disabled level are all
legitimate outcomes. The instrument MUST NOT force sound. Silence is information.

### VII. The Text Is Not Consumed
Playback is a reading, not a transformation. The source text MUST never be modified
by the playback engine. The system operates on a snapshot of the text taken at
play-time. The original text is always preserved.

### VIII. No External Audio Dependencies
All synthesis MUST use the native browser Web Audio API. No external audio libraries
are permitted. The synthesis chain is:
OscillatorNode → BiquadFilterNode (lowpass) → GainNode → AudioContext.destination.

WAV and MIDI export are output formats (file writing operations) and are not audio
synthesis dependencies. External libraries for file encoding (e.g., WAV encoding
utilities) are permitted for export only, not for synthesis.

### IX. Reduce Ambiguity
The primary purpose of singling-lab is to be useful for **research and analysis**.
This means output MUST be as deterministic and unambiguous as possible. Unlike
Singling 1.0, which embraced linguistic ambiguity as an aesthetic, singling-lab
MUST resolve ambiguity in the output wherever possible. When a word is ambiguous
(e.g., noun/verb), a resolution strategy MUST be applied and documented — not left
to produce inconsistent sonic output. Aesthetic ambiguity is deferred to user-level
configuration, not baked into the mapping.

### X. Persist & Portability
Configuration MUST be saveable and shareable between sessions and between users.
This is non-negotiable for research use, where different researchers MUST be able
to compare interpretations of the same or different texts using identical parameter
configurations.

- MUST support exporting the full parameter state as a file (canonical format TBD)
- MUST support importing a saved configuration file to restore state
- Saved configurations MUST be human-readable and diffable
- Session persistence within a single browser session is a minimum; cross-session
  persistence (localStorage or file-based) is required for v1

### XI. Accessibility First
singling-lab MUST be usable by people with visual disabilities as a primary use case,
not an afterthought.

- MUST support screen readers (semantic HTML, ARIA labels)
- MUST be operable without a mouse (keyboard navigation for all controls)
- No login MUST be required to use core functionality (login is optional)
- Use MUST be free of charge (open access)
- Language: English at launch; additional language support deferred

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
| **Semantic Signal** | Derived properties of a Unit's meaning: sentiment, energy, POS tags, word class, frequency tier. |
| **Mapping** | The function that transforms a Unit and its Semantic Signal into Sound Params. |
| **Level Params** | User-controlled parameters that govern the Mapping for a specific Parse Level. |
| **Semantic Override** | A modifier that adjusts Sound Params based on Semantic Signal values. |
| **Voice** | A single active audio chain (oscillator → filter → gain). |
| **Polyphony** | The maximum number of Voices active simultaneously. |
| **Tempo** | The base interval (ms) between successive Event triggers. |
| **Keyword** | A user-specified word or phrase that triggers a designated sound when encountered. |
| **Configuration** | The complete saved parameter state for a session, shareable between users. |
| **Literacoustics** | The capacity to interpret a text's meaning, structure, and nuance by listening to its sonification. |
| **Live Mode** | A mode in which text is sonified in real time as the user types. |
| **Preset** | A named, pre-configured parameter set that produces a specific sonic character without requiring manual setup. |
| **Layered Mode** | A playback mode in which word, phrase, sentence, and paragraph levels sonify simultaneously from the same input text. |
| **Sound Character** | An abstraction representing any playable timbre — covers both oscillator-based synthesis presets and noise-based environmental textures. Has a `percussive` flag and a category (synthesis, nature, city, environment). |
| **Layer Config** | The per-level settings in layered mode: sound character selection, gain, and enabled state. |
| **Backdrop Level** | A parse level in layered mode (phrase, sentence, or paragraph) that functions as sustained ambient texture; restricted to non-percussive sound characters. |

### Parse Levels

Parse Levels are ordered from finest to coarsest granularity. All five are available at launch.

| Level | Unit Definition | Default Register |
|---|---|---|
| `letter` | Single non-whitespace character | High pitch, very short duration |
| `word` | Contiguous word characters (`\b\w+\b`) | Mid pitch, moderate duration |
| `phrase` | Sub-sentence segment bounded by punctuation (`, ; : — –`) or subordinating/coordinating conjunction | Lower-mid pitch, longer duration |
| `sentence` | Complete grammatical sentence | Low pitch, slow duration, triangle wave |
| `paragraph` | Block separated by double newlines | Very low pitch, very long duration, sawtooth wave |

**Letter level**: No semantic variables apply at letter level. Configurable: instrument,
overtone series/waveform, octave range, envelope, tempo.

**Word level**: The most semantically complex level. All semantic signals, keyword matching,
WordNet category assignment, modal weighting, word frequency tier, and function-word
handling apply at this level.

**Phrase level**: Punctuation sonification and conjunction boundaries define phrase units.
The full phrase definition is: a sub-sentence segment bounded by `, ; : — –` or
by coordinating/subordinating conjunctions (`and, but, or, nor, yet, so, because,
although, while, since, if`). Semantic signals apply at phrase level.

**Sentence and paragraph levels**: Sentiment, energy, and genre/topic category signals
apply. Readability and complexity metrics may be used as additional signals.

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

**Rule 5: Function words are never silent.**
All words — including articles, prepositions, conjunctions, and other function words —
MUST trigger a sound event. Function words receive neutral semantic signal values
(sentiment = 0, energy = baseline) rather than being skipped.

**Rule 6: Punctuation is sonified.**
Punctuation marks (`.`, `,`, `!`, `?`, `;`, `:`, `—`, `–`, `(`, `)`) MUST produce
a sound event. Their sonic character is configurable but they MUST NOT be silently
discarded. Spaces and paragraph breaks are treated as structurally significant.

**Rule 7: Keywords override.**
When a unit matches a user-specified Keyword, the designated keyword sound MUST
override the default mapping. Keyword sounds take precedence over all other overrides.

### Semantic System

Signals extracted per unit depend on the active Parse Level.

#### Core Signals (all levels except letter)

| Signal | Range | Source |
|---|---|---|
| `sentiment` | –1 to 1 | Word-level positive/negative lexicon + negation detection |
| `energy` | 0 to 1 | High-energy word lexicon + text length heuristic |
| `tags` | string[] | Part-of-speech tags via `compromise` |

#### Extended Word-Level Signals

| Signal | Range / Values | Source |
|---|---|---|
| `wordClass` | noun, verb, adjective, adverb, function | POS via `compromise` |
| `wordnetCategory` | string (e.g., `animal.domestic`) | WordNet category lookup |
| `frequencyTier` | common \| uncommon \| rare | Word frequency corpus |
| `wordLength` | integer ≥ 1 | Character count |
| `modalStrength` | 0–1 | Modal verb scale (see below) |
| `isKeyword` | boolean | User-specified keyword match |

#### Modal Verb Weighting Scale

Modal verbs are arranged on a 0–1 strength scale:

| Strength | Modals |
|---|---|
| 0.1–0.2 | could, might |
| 0.3–0.4 | can, may |
| 0.5–0.6 | would, should |
| 0.7–0.8 | will, shall |
| 0.9–1.0 | must, ought |

#### Semantic Overrides

| Override | Scope | Effect |
|---|---|---|
| `sentimentToPitch` | Sound Params | Blends pitch toward range top (positive) or bottom (negative) |
| `energyToFilterCutoff` | Sound Params | Opens filter for high-energy; closes for calm |
| `energyToTempo` | Playback timing only | Shortens inter-event interval for high-energy; stretches for calm |
| `wordnetToInstrument` | Sound Params | Maps WordNet category to instrument preset |
| `frequencyTierToGain` | Sound Params | Uncommon/rare words → higher gain (perceptual salience) |
| `wordLengthToDuration` | Sound Params | Longer words → longer duration |
| `modalStrengthToPitch` | Sound Params | Stronger modals → higher pitch within range |
| `keywordTrigger` | Sound Params | Keyword match → designated sound override |

#### Configuration Scope

Each semantic override is independently toggled per parse level. Users MUST be able to
configure which WordNet categories map to which sonic properties (e.g., "domestic animals →
instrument preset: Strings; pitch range: 200–400 Hz"). The mapping table MUST be editable.

### Output Formats

| Format | Priority | Description |
|---|---|---|
| `.wav` | Primary — REQUIRED | Full audio render of the sonified text |
| `.txt` | Secondary — REQUIRED | Parsed text segmented by active parse level (learning resource) |
| `.mid` | Tertiary — OPTIONAL | MIDI event stream; for musicians to extend the sonification |

All three formats MUST be exportable from the same session without re-processing.

### Parameter Validation Rules

- `pitchMin` MUST be < `pitchMax`
- `durationMin` MUST be < `durationMax`
- `attack + release` MUST be ≤ `durationMin` (clamped silently on change)
- `polyphony` is clamped to [1, 16]
- `tempo` is clamped to [50, 5000] ms
- `modalStrength` is clamped to [0, 1]
- `frequencyTier` assignment MUST reference the same corpus across sessions for determinism

## Scope & Boundaries

### Identity

**singling-lab** is the web-based successor to Singling 1.0. It is a text-to-sound
transduction instrument that converts written language into non-phonetic audio events
triggered by the structural and semantic properties of text — not by pronunciation.
It reads text as a scored performance and renders that performance in sound,
targeting literacoustics: the interpretive capacity of the listener.

### What This System Is Not

- Not a text-to-speech engine (though TTS is an optional accessibility feature)
- Not a music notation system
- Not a random noise generator (all sound is causally derived from text)
- Not a phoneme synthesizer in its core instrument
- Not a generative AI system
- Not a replacement for human musical or analytical judgment

### What This System Is

- A research tool for language and sound analysis
- A creative/artistic instrument for composers and writers
- An educational tool for exploring linguistic and musical concepts
- An accessibility tool for people with visual disabilities
- All of the above simultaneously — these uses are complementary, not competing

### Future Scope (not in current implementation)

The following are acknowledged as intended future capabilities but are explicitly out
of scope until a dedicated feature spec is ratified:

- **Live Mode**: Sonification of text as the user types (real-time)
- **Browser Plugin**: Sonify text on any web page without copy-paste
- **Multilingual support**: Languages other than English
- **Bold/italic semantic signal**: Formatting as a semantic modifier
- ~~**Simultaneous multi-level playback**~~: ✅ Implemented in `005-audio-layering` — layered mode (word/phrase/sentence/paragraph simultaneously) is now a supported first-class playback mode (see Principle V)
- **Data-sensitive / offline mode**: For users with sensitive research data
- **Collaborative live sessions**: Real-time shared parameter editing
- **Phonetic TTS accessibility feature**: Separate from the core instrument

### Open Questions (to be resolved)

- [x] ~~Multi-level simultaneous playback~~ → Resolved; implemented in `005-audio-layering` as `layered` mode (word/phrase/sentence/paragraph simultaneously, with gain hierarchy, C major quantisation, and backdrop constraints)
- [ ] Visualization: how should active units be highlighted in the input text?
- [x] ~~Pitch quantization~~ → Resolved; continuous in single mode; C major quantisation applied in layered mode for harmoniousness
- [x] ~~Semantic expansion~~ → Resolved: WordNet, modals, keywords, frequency tiers (see Semantic System)
- [x] ~~Preset format~~ → Resolved: configuration must be exportable/importable (format TBD)
- [x] ~~MIDI export~~ → Resolved: MIDI is a tertiary output format, optional
- [x] ~~Phrase parser definition~~ → Partially resolved: punctuation + conjunction boundary (full spec pending)
- [ ] WordNet category → sonic property mapping: what is the canonical default table?
- [ ] Word frequency corpus: which corpus to use for `frequencyTier` assignment?
- [ ] Configuration file format: JSON schema definition (pending Persist & Portability spec)

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

**Version**: 2.1.0 | **Ratified**: 2026-04-10 | **Last Amended**: 2026-04-20
