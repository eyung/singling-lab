# Feature Specification: Configuration Persistence & Portability

**Feature Branch**: `004-config-persist`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Create a new branch based on the updated constitution."  
**Constitution reference**: Principle X — Persist & Portability (v2.0.0)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save and Reload a Configuration (Priority: P1)

A researcher finishes tuning a set of parameters (instrument, parse level, semantic overrides,
per-level pitch/duration/filter settings) that produces a specific sonic interpretation of a
text. They export the configuration as a file. In a later session they re-open the app and
import that file to restore the exact same parameter state, ready to run the same analysis on
a different text.

**Why this priority**: Without session persistence, every research session starts from scratch.
This is the core research use case: reproducible interpretation under identical parameters.

**Independent Test**: Can be fully tested by exporting a configuration, reloading the page
(resetting to defaults), importing the exported file, and confirming all parameter values
match exactly what was exported — without playing any audio.

**Acceptance Scenarios**:

1. **Given** the user has set non-default parameter values, **When** they trigger the export
   action, **Then** a file is downloaded to their device containing the full parameter state.
2. **Given** a previously exported configuration file, **When** the user imports it,
   **Then** all parameter values in the app are updated to exactly match the exported state
   within one interaction.
3. **Given** the app has just loaded with default parameters, **When** the user imports a
   configuration file, **Then** the display reflects the imported values immediately and the
   next playback uses those values.

---

### User Story 2 - Share a Configuration with Another User (Priority: P2)

A researcher sends their exported configuration file to a colleague. The colleague imports it
into their own copy of the app and can reproduce the same sonic interpretation of the same
or a different text, enabling side-by-side comparison of analyses.

**Why this priority**: Cross-user configuration sharing is explicitly required by the constitution
for research comparison. A file format that only works for the original user fails this requirement.

**Independent Test**: Can be tested by exporting from one browser session and importing in a
separate browser session (or a fresh incognito window) — the imported state must match exactly.

**Acceptance Scenarios**:

1. **Given** an exported configuration file from any user, **When** a different user imports
   it, **Then** their parameter state matches the original exporter's state at time of export.
2. **Given** two users importing the same configuration and running it on the same text,
   **When** both play back, **Then** both produce audibly identical output.
3. **Given** a configuration file exported from the app, **When** a user opens the file in a
   text editor, **Then** the contents are human-readable and the parameter names are recognisable.

---

### User Story 3 - Persist Configuration Across Page Reloads (Priority: P3)

A user returns to the app after closing or refreshing the browser tab. Their most recently used
parameter state is automatically restored, so they do not need to re-configure from scratch
each session.

**Why this priority**: File-based export/import (US1/US2) satisfies the research requirement.
Automatic within-browser persistence is an important usability improvement for creative and
casual users who may not think to export.

**Independent Test**: Can be tested by setting non-default parameters, reloading the page, and
confirming the parameter values are restored without any user action.

**Acceptance Scenarios**:

1. **Given** a user has set non-default parameters, **When** they reload the page, **Then**
   their parameter values are restored automatically.
2. **Given** a user explicitly resets to defaults and then reloads, **Then** the default
   state is restored (not the previous non-default state).
3. **Given** the user's browser has no stored state (e.g., private/incognito window),
   **When** the app loads, **Then** it starts with the application's built-in defaults.

---

### Edge Cases

- What happens when a user imports a configuration file from an older version of the app
  where some parameters did not exist? Unknown fields should be ignored; missing fields
  should fall back to current defaults.
- What happens when a configuration file is malformed or not a valid configuration format?
  The import fails gracefully with a clear user-facing message; the existing parameter state
  is unchanged.
- What happens when exported and imported configurations include instrument presets that have
  been renamed or removed in a newer version? The import uses the closest matching preset or
  the default, and notifies the user.
- What if the user's browser blocks local storage? File-based export/import (US1/US2) must
  still work; automatic persistence (US3) degrades gracefully with no error on start.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to export the complete current parameter state as a
  downloadable file in a human-readable, diffable format.
- **FR-002**: Users MUST be able to import a previously exported configuration file to
  restore the full parameter state in one interaction.
- **FR-003**: Imported configurations MUST pass validation before being applied; invalid
  or unrecognised files MUST be rejected with a clear message, leaving current state unchanged.
- **FR-004**: The exported file MUST contain all user-configurable parameters: parse level,
  per-level settings (pitch, duration, waveform, filter, envelope, gain, enabled), semantic
  overrides, polyphony, tempo, and instrument selection.
- **FR-005**: The exported file MUST be self-describing — parameter names in the file MUST be
  human-recognisable without reference to source code.
- **FR-006**: Configuration files MUST be portable between users and browser sessions without
  modification; no user-specific identifiers are included.
- **FR-007**: The app MUST automatically save the current parameter state to browser-local
  storage on every parameter change.
- **FR-008**: On page load, the app MUST restore the most recently saved state from
  browser-local storage if one exists; otherwise it MUST use built-in defaults.
- **FR-009**: Users MUST be able to explicitly reset all parameters to the application's
  built-in defaults at any time, clearing any stored state.
- **FR-010**: Export and import controls MUST be accessible via keyboard navigation and
  usable without a mouse.

### Key Entities

- **Configuration**: The complete snapshot of all user-controllable parameter values at a
  point in time. Portable between users and sessions. Versioned for forward compatibility.
- **ConfigVersion**: A version identifier embedded in the configuration file that allows the
  app to detect and handle files produced by older versions of the application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can export their configuration and import it in a separate browser
  session in 3 or fewer interactions total.
- **SC-002**: Importing a configuration restores 100% of exported parameter values with zero
  data loss (verified by programmatic comparison of exported and re-imported state).
- **SC-003**: A configuration file exported from the app can be opened in any plain text
  editor and all parameter names understood without documentation.
- **SC-004**: Page reload restores parameter state automatically within the normal app load
  time (no perceptible extra delay for state restoration).
- **SC-005**: An invalid or unrecognised import file is rejected within 1 second with a
  user-visible message; no parameter state is changed.
- **SC-006**: Two users importing the same configuration file and running it on the same text
  produce audibly identical playback output.

## Assumptions

- The configuration file format will be JSON; this is the only format satisfying FR-005
  (human-readable, diffable) within the existing technology stack. The canonical schema
  definition is a separate open question in the constitution.
- Browser-local storage is the persistence mechanism for automatic within-session
  persistence (US3); it is widely available in the target browsers (Chrome, Firefox,
  Safari, Edge current versions).
- Configuration files do not include the input text — only parameter state. The text is
  always entered fresh by the user.
- Versioning strategy for forward compatibility: the configuration file includes a `version`
  field; unknown fields are ignored on import; missing fields fall back to current defaults.
- Export is triggered by a user action (button/control), not automatically on every change.
  Automatic persistence (FR-007) writes to browser-local storage, not to a file.
- The export/import UI is placed in the Global section of the Controls panel, consistent
  with other global controls.
- No server-side storage, cloud sync, or user accounts are in scope for v1; all persistence
  is either local-browser or file-based.
- The reset-to-defaults action (FR-009) clears both the in-memory state and the
  browser-local storage entry.
