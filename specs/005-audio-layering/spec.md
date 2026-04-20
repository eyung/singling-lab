# Feature Specification: Simultaneous Audio Layering

**Feature Branch**: `005-audio-layering`
**Created**: 2026-04-20
**Status**: Draft
**Input**: User description: "For this feature, I want to implement an experimental audio layering logic where different levels (specifically, word, phrase, sentence, and paragraph for now) will sonify simultaneously, in a harmonious, pleasing manner. The less granular (or higher) levels (paragraph, then sentence, then phrase, lastly word, in this order) will function more as a backdrop and in that case, cannot use percussion instruments for example. Otherwise, you can assume that it's ok to use random instruments for each layer to create a harmonious output (which can be changed by the user in the ui). You can also implement 'instruments' that are not traditional, such as nature, city, environment...etc. sounds to make it interesting. The more granular the level, the louder and more prominent the sound."

---

## User Scenarios & Testing

### User Story 1 — Enable Layered Playback Mode (Priority: P1)

A researcher pastes a paragraph of text into singling lab and switches into layered mode. The app simultaneously sonifies all four active parse levels — word, phrase, sentence, and paragraph — each with its own timbre and volume. The word layer is the most audible foreground voice; the paragraph layer is the quietest, ambient backdrop. The result sounds cohesive rather than cacophonous.

**Why this priority**: This is the core differentiating capability. Without simultaneous playback across levels, all other layering features have no foundation. A researcher can immediately hear how a text "sounds" at multiple resolutions at once.

**Independent Test**: Enter any multi-sentence text → click Play in Layered mode → confirm four distinct audio streams are audible simultaneously, with the word layer clearly louder than the paragraph layer.

**Acceptance Scenarios**:

1. **Given** text containing at least one paragraph, sentence, phrase, and word, **When** the user plays in layered mode, **Then** all four levels produce sound simultaneously without the user needing to switch levels manually.
2. **Given** layered playback is active, **When** the user listens, **Then** the word layer is perceptibly louder and more prominent than the phrase layer, which is louder than the sentence layer, which is louder than the paragraph layer.
3. **Given** layered mode is active, **When** the user disables a specific level (e.g., sentence) in the controls, **Then** only that level falls silent while the other three continue playing.

---

### User Story 2 — Backdrop Instrument Constraints (Priority: P2)

A researcher wants the paragraph and sentence layers to function as a calm, continuous ambient texture — like a drone or environmental soundscape — without rhythmic percussion that would compete with the foreground word layer. The system enforces that backdrop levels (paragraph, sentence, phrase) only use sustained, non-percussive sound characters.

**Why this priority**: Without this constraint, the multi-layer output risks sounding chaotic. The backdrop rule is what makes layering pleasant rather than jarring. It directly addresses the "harmonious" quality stated in the description.

**Independent Test**: Assign a percussion-type sound character to the paragraph level → play → confirm the paragraph layer does not produce percussive attacks; it produces a sustained or ambient sound instead.

**Acceptance Scenarios**:

1. **Given** a backdrop level (paragraph, sentence, or phrase) is configured, **When** the user browses available sound characters for that level, **Then** percussion-type options are either absent or visually marked as unavailable.
2. **Given** layered playback is active, **When** the paragraph level plays, **Then** it produces a continuous, sustained or slowly evolving sound rather than rhythmic hits.
3. **Given** a default instrument is auto-assigned to a backdrop level, **Then** the assigned instrument is always non-percussive (e.g., a pad, drone, or ambient environment sound).

---

### User Story 3 — Non-Traditional Sound Characters (Priority: P2)

A researcher wants to assign nature, city, or other environmental textures to one or more layers to create an unconventional sonic portrait of the text. These are available alongside the existing oscillator-based timbres in each layer's instrument selector.

**Why this priority**: Non-traditional sounds are the "interesting" element called out explicitly in the description. They expand the palette beyond synthesis into soundscape territory. Rated P2 alongside backdrop constraints because both define the character of layered output.

**Independent Test**: Open the instrument selector for the sentence level → confirm at least one environmental or nature category is available → assign it → play → confirm the sentence layer produces a recognisably environmental texture.

**Acceptance Scenarios**:

1. **Given** the instrument selector is open for any layer, **When** the user browses options, **Then** at least one non-traditional category (e.g., nature, city, environment) is visible.
2. **Given** a nature sound is assigned to the sentence layer, **When** layered playback runs, **Then** the sentence layer produces a continuous ambient texture fitting its source category.
3. **Given** an environmental sound is assigned to a backdrop level, **Then** it behaves as a valid non-percussive backdrop sound (satisfying the constraint from US2).

---

### User Story 4 — Per-Layer Instrument Selection in UI (Priority: P3)

A researcher wants to manually choose which sound character each layer uses, rather than relying on the auto-assigned default. Each layer has its own instrument selector in the controls panel, and the researcher can mix and match freely within the constraints applicable to that layer.

**Why this priority**: User control over instrument assignment is secondary to the default layered experience. The auto-assigned harmonious defaults should work well on first use; this story adds tuning capability for experienced users.

**Independent Test**: Change the instrument for the phrase level to a specific non-percussive option → play → confirm the phrase layer sounds change to reflect the new selection.

**Acceptance Scenarios**:

1. **Given** the controls panel is open, **When** the user views the settings for a specific level, **Then** an instrument selector is visible that lists all sounds valid for that level's role.
2. **Given** a user selects a new instrument for the word level, **When** playback begins, **Then** the word layer uses the newly selected instrument.
3. **Given** a user selects an instrument for the paragraph level, **Then** only non-percussive options are selectable (percussive options are disabled or absent).

---

### Edge Cases

- What happens when the input text is a single word (no phrase, sentence, or paragraph parse units)? → Only the word layer sounds; other layers remain silent.
- What happens when all four layers produce sound at maximum gain simultaneously? → The system must not clip or distort audio output; gain is normalised across the layer mix.
- What happens when a user toggles from single-level mode to layered mode mid-playback? → Playback restarts in the new mode.
- What if the text has no recognisable sentences or paragraphs (e.g., a stream of words with no punctuation)? → Layers with no parsed units are silent; no error is shown.
- What if a non-traditional sound would exceed the polyphony limit? → The layer with the lowest priority (paragraph) is silenced first to remain within the voice limit.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST support a "layered" playback mode where word, phrase, sentence, and paragraph levels sonify simultaneously from the same input text.
- **FR-002**: Each layer MUST have an independent volume (gain) level, with word being loudest and paragraph being quietest; the default gain hierarchy MUST be enforced automatically.
- **FR-003**: Backdrop levels (paragraph, sentence, phrase) MUST only be assignable non-percussive sound characters; percussion options MUST be excluded or disabled for these levels in layered mode.
- **FR-004**: The word layer MAY use any sound character, including percussive ones, in layered mode.
- **FR-005**: Each level MUST have its own instrument selector in the controls panel showing only the sound characters valid for that level's role in the current mode.
- **FR-006**: The sound character catalog MUST include at least three non-traditional categories (e.g., nature, city, environment) in addition to the existing oscillator-based presets.
- **FR-007**: Non-traditional sound characters assigned to backdrop levels MUST be inherently sustained or slowly evolving (not rhythmically percussive).
- **FR-008**: When no input units exist at a given parse level (e.g., text has no identifiable paragraphs), that layer MUST remain silent without producing an error.
- **FR-009**: The total audio output of all simultaneous layers MUST NOT exceed unity gain (0 dBFS) to prevent clipping.
- **FR-010**: The user MUST be able to enable or disable any individual layer from contributing to layered playback.
- **FR-011**: The existing single-level playback mode MUST remain fully functional and unaffected by layered mode changes.

### Key Entities

- **LayerConfig**: The settings for one parse level in layered mode — includes instrument selection, gain, enabled/disabled state, and whether the level is designated as backdrop or foreground.
- **SoundCharacter**: An abstraction representing any playable timbre — covers both oscillator-based presets and non-traditional environmental textures. Has a category (e.g., synthesis, nature, city) and a `percussive: boolean` attribute.
- **LayeredPlaybackSession**: The runtime state of a simultaneous multi-layer playback — tracks which layers are active, their current position in the parse sequence, and the aggregate gain.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All four layers begin sounding within 200 ms of each other when layered playback starts, so the onset feels simultaneous to the listener.
- **SC-002**: The word layer is at least 6 dB louder than the paragraph layer by default, producing a perceptible foreground/background distinction.
- **SC-003**: No audio clipping or distortion occurs when all four layers play simultaneously at their default gain settings.
- **SC-004**: At least 10 non-traditional sound characters (across nature, city, and environment categories) are available in the instrument selector.
- **SC-005**: A first-time user can locate and change the instrument for any layer within 60 seconds without documentation.
- **SC-006**: Switching between single-level and layered modes takes effect within one playback cycle (i.e., the next time the user presses Play).

---

## Assumptions

- Layered mode operates on the same text input and parse engine as the existing single-level mode; no new text analysis is required.
- Non-traditional sounds will be synthesised using available browser audio primitives (e.g., filtered noise, modulated oscillators) to avoid external audio file dependencies, consistent with existing architecture.
- The "letter" parse level is excluded from layered mode for now — the description lists word, phrase, sentence, and paragraph only.
- Auto-assignment of instruments to layers on first use will follow a curated default mapping (e.g., word → pluck, phrase → pad, sentence → drone/strings, paragraph → nature/environment) designed for harmoniousness.
- Harmoniousness is achieved through pitch quantisation to a common musical key (defaulting to C major) across all layers, so simultaneous notes do not clash.
- The polyphony limit (currently 1–16 voices) applies to the total voice count across all active layers combined.
- The existing `LevelParams` per-level configuration will be extended or wrapped to support layer-specific instrument and gain settings for layered mode without breaking single-level mode.
