# Feature Specification: MIDI Instrument Selector

**Feature Branch**: `003-midi-instrument-select`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Create a parameter where users can select the MIDI instrument to output sounds with"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select MIDI Instrument Before Playback (Priority: P1)

A user opens the application and, before starting playback, chooses a MIDI instrument from a selector control. When they begin playback, all synthesized output uses the selected instrument's sound characteristics.

**Why this priority**: This is the core use case — allowing users to hear their text rendered as different instrument timbres is the primary value of this feature.

**Independent Test**: Can be fully tested by selecting any instrument from the selector and pressing play — confirms the chosen instrument's sound plays back instead of the default.

**Acceptance Scenarios**:

1. **Given** the application is loaded and playback is stopped, **When** the user opens the instrument selector and chooses a different instrument, **Then** the selector displays the chosen instrument name and subsequent playback uses that instrument's sound.
2. **Given** an instrument is selected, **When** the user starts playback, **Then** all sound output reflects the characteristics of the selected instrument throughout the session.
3. **Given** the application is loaded, **When** no instrument has been explicitly selected, **Then** a sensible default instrument is pre-selected and playback works immediately.

---

### User Story 2 - Change Instrument During or Between Playback Sessions (Priority: P2)

A user switches the instrument after having already heard playback once. The next playback session uses the newly selected instrument without requiring a page reload.

**Why this priority**: Users will iterate — audition one instrument, then try another. Seamless switching without state loss is essential for a usable experience.

**Independent Test**: Can be tested by playing once, switching instrument, playing again — confirms the second playback uses the new instrument.

**Acceptance Scenarios**:

1. **Given** playback has completed with Instrument A, **When** the user selects Instrument B and starts playback again, **Then** sound output uses Instrument B's characteristics.
2. **Given** playback is in progress, **When** the user selects a different instrument, **Then** the change takes effect on the next playback start (current session is not interrupted).

---

### User Story 3 - Instrument Selection Persists Within Session (Priority: P3)

A user selects an instrument and navigates or adjusts other parameters. The instrument selection is retained and does not reset unexpectedly within the same browser session.

**Why this priority**: Users should not need to re-select their instrument after adjusting other controls — avoids frustrating re-work.

**Independent Test**: Can be tested by selecting an instrument, adjusting other parameters (e.g., speed, pitch), and verifying the instrument selector still shows the originally chosen instrument.

**Acceptance Scenarios**:

1. **Given** a user has selected an instrument, **When** they modify other playback parameters, **Then** the instrument selection remains unchanged.

---

### Edge Cases

- What happens when the instrument list is empty or fails to load? The selector should remain visible with a fallback default, and playback continues.
- How does the system handle an instrument that is no longer available after selection? It falls back gracefully to the default instrument and informs the user.
- What if a user rapidly switches between instruments? Each selection is registered independently; no queuing or skipping occurs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST display an instrument selector control that lists all available MIDI General MIDI instruments (128 standard instruments).
- **FR-002**: The selector MUST have a pre-selected default instrument that produces sound immediately on first playback without any user action.
- **FR-003**: Users MUST be able to select any instrument from the list via a single interaction (click/tap).
- **FR-004**: The application MUST apply the selected instrument to all sound output generated during playback.
- **FR-005**: Instrument selection changes MUST take effect on the next playback start without requiring a page reload.
- **FR-006**: The currently selected instrument MUST remain selected when the user modifies other playback parameters.
- **FR-007**: The instrument selector MUST be accessible via the existing Controls parameter panel alongside other playback parameters.
- **FR-008**: The instrument name MUST be displayed clearly in the selector so users can identify their selection without numeric codes.

### Key Entities

- **MIDI Instrument**: A named sound preset identified by a program number (0–127) within the General MIDI standard; has a name (e.g., "Acoustic Grand Piano") and a category (e.g., "Piano", "Strings").
- **Instrument Selection**: The user's currently active choice of MIDI instrument; persists in application state for the duration of the session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select any available instrument in 3 or fewer interactions from the main interface.
- **SC-002**: Switching instruments and restarting playback takes under 1 second from selection to first audible sound.
- **SC-003**: The instrument selector is visible and usable without scrolling on common screen sizes (desktop and tablet).
- **SC-004**: 100% of the 128 General MIDI instruments are selectable and produce distinct, audible output.
- **SC-005**: The selected instrument remains active across at least 10 consecutive parameter adjustments without resetting.

## Assumptions

- The application currently synthesizes sound via the Web Audio API without MIDI output to external devices; the "MIDI instrument" refers to General MIDI program numbers that map to timbres/waveforms synthesized in-browser, not hardware MIDI.
- All 128 General MIDI standard instruments will be made available in the selector; no subset filtering is required for v1.
- The default pre-selected instrument will be "Acoustic Grand Piano" (GM program 0) as it is the universally recognized GM default.
- Instrument selection is session-scoped (in-memory); persistent storage across page reloads is out of scope for v1.
- The selector is placed within the existing Controls panel; no new UI surface or modal is required.
- Mobile support is secondary; the primary target is desktop and tablet browsers.
