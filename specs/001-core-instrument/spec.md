# Feature Specification: Core Instrument

**Feature Branch**: `001-core-instrument`
**Created**: 2026-04-10
**Status**: Draft
**Input**: singling-lab baseline product spec — derived from project constitution

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Text Sonification Playback (Priority: P1)

A user pastes or types any text into the instrument, selects a parse level (letter,
word, phrase, sentence, or paragraph), and presses play. The system parses the text
into a sequence of units at that level and plays each unit as a distinct non-phonetic
sound event in order, one after another. The user hears a sonic rendering of the
text's structure.

**Why this priority**: This is the core value of the instrument. Without it, nothing
else functions. It is the minimum viable product.

**Independent Test**: Paste a paragraph, select "word" level, press play. Each word
triggers an audible sound event in sequence. Pressing stop halts playback immediately.
The same text played twice produces the same sequence of sounds.

**Acceptance Scenarios**:

1. **Given** text is in the input and a parse level is selected, **When** the user
   presses play, **Then** the system begins producing sound events in sequence, one
   per parsed unit, at the configured tempo.

2. **Given** playback is in progress, **When** the user presses stop, **Then**
   playback halts immediately and the current unit indicator clears.

3. **Given** the same text and the same parse level and parameters, **When** the
   user plays the text twice, **Then** the sequence of sounds is identical both times.

4. **Given** the input is empty, **When** the user attempts to press play, **Then**
   the play button is disabled and no sound is produced.

5. **Given** a parse level produces no units (e.g., paragraph level on single-line
   text with no double newlines), **When** the user presses play, **Then** playback
   completes silently without error.

---

### User Story 2 - Parse Level Selection (Priority: P2)

A user switches between parse levels — letter, word, phrase, sentence, paragraph —
and immediately hears how the sonic character of the same text changes at each level
of granularity. Finer levels produce denser, faster sound events; coarser levels
produce sparser, longer events.

**Why this priority**: Parse level selection is the primary expressive dimension of
the instrument. It transforms the same text into radically different sonic experiences
and is the most accessible form of user control.

**Independent Test**: Enter a multi-sentence paragraph. Play at "letter" level: hear
rapid, high-pitched events. Switch to "sentence" level: hear slow, lower-pitched
events. The shift is immediately perceptible.

**Acceptance Scenarios**:

1. **Given** text is loaded, **When** the user selects "letter" level and plays,
   **Then** each non-whitespace character produces a brief, high-register sound event.

2. **Given** text is loaded, **When** the user selects "paragraph" level and plays,
   **Then** each double-newline-separated block produces one long, low-register event.

3. **Given** playback is stopped, **When** the user switches parse level, **Then**
   the next playback uses the newly selected level without requiring any other action.

---

### User Story 3 - Per-Level Sound Parameter Control (Priority: P3)

A user opens the parameter controls for a specific parse level and adjusts pitch
range, duration, waveform, filter cutoff, and gain. Changes take effect on the next
playback. The user can shape the sonic character of each level independently, so
that word-level events sound different from sentence-level events in a controlled,
intentional way.

**Why this priority**: Parameter control is what transforms singling-lab from a
demonstration into an instrument. Without it, the sound palette is fixed and
unexplorable.

**Independent Test**: Open the "word" level controls. Set waveform to "square" and
pitch max to 2000 Hz. Play text at word level. The resulting sound is noticeably
harsher and higher than default. Reset to defaults; sound returns to original character.

**Acceptance Scenarios**:

1. **Given** level controls are visible, **When** the user adjusts the pitch range
   sliders for a level, **Then** the next playback of that level produces sounds
   within the new range.

2. **Given** level controls are visible, **When** the user disables a level via its
   toggle, **Then** playback at that level produces no sound (silent timing slot).

3. **Given** level controls are visible, **When** the user changes the waveform for
   a level, **Then** the timbral character of that level's events changes accordingly
   on the next playback.

4. **Given** the user sets pitch min higher than pitch max, **Then** the system
   automatically corrects to maintain a valid range (pitch min < pitch max).

---

### User Story 4 - Semantic Sound Shaping (Priority: P4)

A user enables semantic overrides and observes that emotionally charged or energetic
passages produce noticeably different sounds from neutral or calm passages — higher
pitch for positive sentiment, brighter timbre for high-energy text, faster pacing
for urgent language. The user can toggle each override independently to understand
its contribution.

**Why this priority**: Semantic responsiveness is what distinguishes singling-lab
from a mechanical text scanner. It adds a layer of expressive depth that rewards
users who bring meaningful text to the instrument.

**Independent Test**: Enter a strongly positive sentence ("wonderful, joyful, radiant
day") and a strongly negative sentence ("dark, cruel, bitter misery"). Play both at
word level with sentiment-to-pitch enabled. The positive sentence sounds noticeably
higher in pitch than the negative one.

**Acceptance Scenarios**:

1. **Given** sentiment-to-pitch is enabled, **When** the user plays text containing
   strongly positive words, **Then** those words' sounds trend toward the upper end
   of the configured pitch range.

2. **Given** energy-to-tempo is enabled, **When** the user plays text containing
   high-energy words (e.g., "burst", "crash", "race"), **Then** the inter-event
   interval shortens for those words.

3. **Given** all semantic overrides are disabled, **When** the user plays any text,
   **Then** sound variation is determined solely by text hashing, with no
   sentiment or energy influence.

4. **Given** semantic overrides are enabled, **When** the user plays the same text
   twice, **Then** the sequence of sounds is identical both times (semantic analysis
   is deterministic).

---

### Edge Cases

- Empty input: play button is disabled; no sound or error is produced.
- Single-character input at sentence or paragraph level: produces one brief event
  or completes silently if no valid unit is found.
- Text with only whitespace at letter level: produces no units; playback completes
  silently.
- Very long text (thousands of words): playback runs to completion; the user can
  stop at any point. No crash, freeze, or memory error.
- Polyphony limit reached: new sound events are dropped (not queued); timing
  continues uninterrupted.
- Attack + release configured to exceed duration: system silently clamps release to
  maintain a valid envelope.
- Browser tab in background: Web Audio playback continues uninterrupted (browser
  permitting); no error is thrown.
- User changes parameters mid-playback: changes apply from the next event onward;
  in-progress events are not interrupted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to enter or paste any text into the input area.
- **FR-002**: Users MUST be able to select one of five parse levels: letter, word,
  phrase, sentence, paragraph.
- **FR-003**: Users MUST be able to start and stop playback at any time.
- **FR-004**: The system MUST parse text into an ordered sequence of units at the
  selected parse level and play each unit as a distinct sound event.
- **FR-005**: The system MUST display the currently playing unit during playback.
- **FR-006**: The system MUST produce the same sound sequence for the same text and
  parameters on every playback (deterministic).
- **FR-007**: Users MUST be able to adjust the following parameters per parse level:
  pitch range (min/max), duration range (min/max), attack, release, waveform type,
  filter cutoff, filter resonance, and gain.
- **FR-008**: Users MUST be able to enable or disable each parse level independently.
  Disabled levels produce no sound but preserve timing in the playback sequence.
- **FR-009**: Users MUST be able to adjust global playback parameters: tempo
  (inter-event interval) and polyphony (maximum simultaneous sound events).
- **FR-010**: Users MUST be able to enable or disable each semantic override
  independently: sentiment-to-pitch, energy-to-filter-cutoff, energy-to-tempo.
- **FR-011**: The system MUST enforce parameter validation: pitch min < pitch max,
  duration min < duration max, attack + release ≤ duration min, polyphony in [1,16],
  tempo in [50, 5000] ms.
- **FR-012**: The system MUST drop new sound events (not queue them) when the active
  voice count reaches the polyphony limit.
- **FR-013**: All processing (parsing, semantic analysis, sound synthesis) MUST occur
  in the browser without server requests.

### Key Entities

- **Text**: The raw written input. Immutable during playback; captured as a snapshot
  at play-time.
- **Parse Unit**: A single segment produced by parsing text at a given level. Has
  text content, level, position index, and derived semantic signals.
- **Sound Event**: The audio manifestation of a Parse Unit. Fully defined by Sound
  Params computed from the unit and the active Level Params.
- **Level Params**: The user-configurable sound parameters for a specific parse level.
  Includes pitch range, duration range, envelope, waveform, filter, and gain.
- **Semantic Signal**: Derived properties of a Parse Unit's text — sentiment (–1 to 1),
  energy (0 to 1), and part-of-speech tags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from opening the app to hearing their first text sonified
  in under 30 seconds without instruction.
- **SC-002**: Playback of a 500-word text at word level completes without any dropped
  frames, audio glitches, or UI freezes on a standard laptop.
- **SC-003**: The same text played twice at the same settings produces a perceptibly
  identical sound sequence 100% of the time.
- **SC-004**: Switching parse levels requires no more than one click and takes effect
  on the next playback without any additional steps.
- **SC-005**: A user adjusting parameters can hear the result of their change within
  one playback cycle (i.e., on the next press of play after adjustment).
- **SC-006**: Enabling or disabling a semantic override produces a perceptibly
  different sound result on emotionally charged text (verifiable by listening test).
- **SC-007**: The instrument operates fully offline — no network request is required
  after the initial page load.

## Assumptions

- Users have a modern browser with Web Audio API support (Chrome, Firefox, Safari,
  Edge — current versions).
- Users have audio output enabled on their device; the instrument does not manage
  system audio permissions beyond the browser's AudioContext unlock.
- The primary use case is desktop/laptop; mobile layout is not a v1 requirement.
- No user accounts, persistence of parameter state between sessions, or sharing
  features are in scope for v1. Parameters reset on page reload.
- Text input is plain text only; rich text, HTML, or markdown formatting is not
  parsed or rendered.
- The instrument is a single-page application with no navigation or routing.
- Phrase-level parsing is defined as: sub-sentence segments delimited by commas,
  semicolons, colons, em-dashes, or coordinating/subordinating conjunctions.
  This definition may be revised (see Open Questions in constitution).
