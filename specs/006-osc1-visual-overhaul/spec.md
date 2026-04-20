# Feature Specification: OSC-1 Visual Overhaul

**Feature Branch**: `006-osc1-visual-overhaul`  
**Created**: 2026-04-20  
**Status**: Draft  
**Input**: User description: "For this feature, fetch this design file, read its readme, and implement the relevant aspects of the design. Implement: the designs in this project"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retro Oscilloscope Shell (Priority: P1)

A musician opens singling lab and is immediately immersed in a lab-equipment aesthetic — a warm dark chassis with scanline texture, corner screws, amber LEDs, a phosphor-green power indicator, and a CRT oscilloscope display. Before touching any control, the instrument *feels* like a real piece of hardware.

**Why this priority**: The visual identity is the feature. Without the chassis and CRT, nothing else in this spec is meaningful. All other stories layer on top of this shell.

**Independent Test**: Can be tested by loading the app and verifying the chassis frame, scanline background, title bar with screws, LED row, and CRT screen render correctly with no interactions needed.

**Acceptance Scenarios**:

1. **Given** the app loads, **When** the page renders, **Then** the body shows a dark warm-brown chassis (`#1a1614`) with a horizontal scanline repeating pattern, a 1px bezel border, and `6px` border radius.
2. **Given** the title bar renders, **When** the user views it, **Then** it shows four corner screws, the product name `SINGLING LAB // OSC-1 TEXT SONIFIER` in phosphor green with a glow, a power LED (phosphor green, glowing), a sync LED (amber when playing, off otherwise), and a serial label.
3. **Given** the CRT pane renders, **When** the app is idle, **Then** the scope shows a phosphor-green oscilloscope grid, a blinking "awaiting signal" label, and a flat low-amplitude sine trace. **When** playing, the waveform animates at full amplitude.

---

### User Story 2 - LED Bar Sliders (Priority: P2)

A sound designer adjusts pitch min, tempo, and gain. Instead of plain browser range inputs, each slider shows a segmented amber LED bar (24 segments) with the numeric value displayed in amber tabular numerals above-right.

**Why this priority**: The LED bars are the primary control interaction surface. They appear on every parameter across all tabs and are central to the retro-instrument feel.

**Independent Test**: Can be tested by opening any parameter tab (global → timing section) and verifying all sliders render as segmented LED bars and respond to drag interactions.

**Acceptance Scenarios**:

1. **Given** a parameter slider, **When** it renders, **Then** it shows a label in uppercase monospace (tracked wide, muted color), a 24-segment amber bar (lit segments use `#ffb347` with glow; unlit are dark), and the current value in amber with units.
2. **Given** a slider at 50% value, **When** the user drags left, **Then** lit segments decrease proportionally and the numeric value updates live.
3. **Given** a disabled level, **When** its sliders render, **Then** they remain visible but non-interactive (opacity 35%).

---

### User Story 3 - Rocker Switches for Mode/Parse Level (Priority: P3)

The mode selector (`single` / `layered`) and parse-level selector (`letter` / `word` / `phrase` / `sentence` / `paragraph`) render as hardware rocker switches — a row of buttons sharing a single bezel, with the active option filled amber and the others dark.

**Why this priority**: These are high-frequency controls. The rocker aesthetic replaces the existing inverted-pill pattern and reinforces the hardware metaphor.

**Independent Test**: Can be tested in the global tab by clicking mode and parse-level options and verifying amber highlight switches between options.

**Acceptance Scenarios**:

1. **Given** the global tab, **When** the mode rocker renders, **Then** it shows two buttons in a shared bezel; the active one is amber with dark text; inactive ones are dark with muted text.
2. **Given** the rocker, **When** the user clicks an inactive option, **Then** that option becomes amber and the previous one returns to dark.
3. **Given** the parse-level rocker with five options, **When** rendered on narrow viewports, **Then** all five options remain legible and clickable (no overflow).

---

### User Story 4 - Tabbed Right Panel (Priority: P2)

The right control panel organizes parameters into four tabs — `global`, `levels`, `layered`, `semantic` — accessible via a tab bar at the top of the panel. The active tab is indicated by an amber underline and amber text.

**Why this priority**: The current right panel uses sections, not tabs. Tabs reduce visible density and match the OSC-1 design. Required for levels/layered/semantic to be accessible.

**Independent Test**: Can be tested by clicking each tab and verifying only that tab's content is shown, with correct amber active indicator.

**Acceptance Scenarios**:

1. **Given** the right panel, **When** it renders, **Then** a tab bar shows four tabs in uppercase monospace; the active tab has amber text and a 1px amber bottom line with glow.
2. **Given** the `global` tab, **When** active, **Then** it shows Transport & Voice (instrument select, mode, parse level), Timing (tempo, polyphony), and Master Out (VU meter) groups.
3. **Given** the `levels` tab, **When** active, **Then** it shows collapsible accordions for each parse level (letter / word / phrase / sentence / paragraph) with LED bar sliders inside.
4. **Given** the `layered` tab, **When** active, **Then** it shows word, phrase, sentence, paragraph accordions each with sound-character selector and gain slider.
5. **Given** the `semantic` tab, **When** active, **Then** it shows three toggle switches: sentiment → pitch, energy → filter cutoff, energy → tempo.

---

### User Story 5 - Tape Transport Controls (Priority: P2)

The play/stop/reset controls render as hardware tape-transport buttons — dark bezel buttons with oversized Unicode glyphs (`▶`, `■`, `◀◀`, `◉`), subtle inset shadows, and a physical press effect on active.

**Why this priority**: The transport is the primary action surface; its retro styling is inseparable from the overall aesthetic.

**Independent Test**: Can be tested by verifying button appearance at idle, on hover, and on press, and verifying play starts playback and stop halts it.

**Acceptance Scenarios**:

1. **Given** idle state, **When** the transport renders, **Then** the play button shows `▶` in phosphor green with a glow; stop shows `■` in rose; reset and export show neutral glyphs in muted ink.
2. **Given** playback active, **When** the play button is pressed, **Then** the glyph changes to `‖` (pause) and the sync LED turns amber.
3. **Given** any transport button, **When** pressed, **Then** it shifts `1px` down (translateY) simulating a physical key press.

---

### User Story 6 - VU Meter (Priority: P3)

A master output VU meter in the global tab shows 20 phosphor-green segments that animate during playback. Segments above 65% level turn amber; above 85% turn rose.

**Why this priority**: Visual feedback that audio is running. Purely ornamental but reinforces the hardware metaphor and confirms playback state.

**Independent Test**: Can be tested by pressing play and watching the VU bar animate with segment color transitions.

**Acceptance Scenarios**:

1. **Given** idle state, **When** the VU renders, **Then** one or two faint segments may be lit; the level readout shows near-zero percent.
2. **Given** playback active, **When** the VU animates, **Then** segments pulse between ~55–90% lit; segments past 65% are amber; past 85% are rose.

---

### User Story 7 - Toggle Switches (Priority: P3)

The semantic tab and level accordions use hardware-style toggle switches — a pill track with a sliding round knob that moves from left (off, dark) to right (on, amber glow) with a 120ms CSS transition.

**Why this priority**: Replaces plain checkboxes with a control that matches the hardware metaphor.

**Independent Test**: Can be tested in the semantic tab by clicking each toggle and verifying the knob slides and the parameter updates.

**Acceptance Scenarios**:

1. **Given** a toggle in off state, **When** it renders, **Then** the pill track is dark with a dark round knob at position left.
2. **Given** a toggle, **When** clicked, **Then** the knob slides right with a 120ms transition; the track turns amber-dim; the knob glows amber.

---

### Edge Cases

- What happens when the viewport is narrower than the chassis minimum width (720px)? — The chassis remains functional; the layout may scroll horizontally.
- What happens when text is very long and the CRT's "active unit" display area receives a very long word? — The word is clipped or shrunk to fit within the bordered display box without breaking layout.
- How does the system handle the playback sync LED when playback ends naturally (not stopped by user)? — The sync LED turns off (unlit state) when playback finishes.
- What happens if `layered` mode is selected but no levels are enabled in the layered tab? — Playback proceeds with silence; no crash or error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app shell MUST render with a warm dark chassis aesthetic including scanline texture background, 1px bezel border, and corner-screw ornaments in the title bar.
- **FR-002**: The left pane MUST display a CRT oscilloscope panel showing: an animated waveform trace (phosphor green), a live "active unit" display with a bordered phosphor box, header/footer readout strips (channel, waveform type, freq, gain, tempo, polyphony), and a scanline overlay.
- **FR-003**: The waveform in the CRT MUST animate using a frame-loop — low amplitude at idle, full amplitude during playback, shape determined by the word-level waveform parameter.
- **FR-004**: All parameter sliders MUST render as segmented LED bar controls (24 segments, amber color) with a label (uppercase monospace, tracked wide) and a live numeric value display (amber tabular numerals with units).
- **FR-005**: Mode and parse-level selectors MUST render as rocker-switch button groups (shared bezel, amber active fill, dark inactive).
- **FR-006**: The right panel MUST be organized into four tabs — `global`, `levels`, `layered`, `semantic` — with an amber active-tab indicator (amber text + 1px amber bottom line).
- **FR-007**: Transport controls (play/pause, stop, reset, export) MUST render as hardware-style buttons with large Unicode glyphs, inset shadow styling, and a 1px translateY press effect on active.
- **FR-008**: The global tab MUST include a VU meter (20 segments, phosphor → amber → rose color zones) that animates during playback.
- **FR-009**: Boolean parameter controls (level enabled, semantic mappings) MUST render as animated toggle switches (pill track + sliding round knob, 120ms transition, amber-on state).
- **FR-010**: Instrument and sound-character selectors MUST render as styled `<select>` elements matching the chassis dark palette.
- **FR-011**: Level accordions MUST use the `<details>/<summary>` pattern with a rotating amber `▶` triangle and a phosphor LED dot indicating enabled state.
- **FR-012**: The text input area MUST preserve the word-highlight overlay during playback: past tokens dimmed (ink-lo color), current token highlighted in phosphor green with a bottom underline/glow.
- **FR-013**: IBM Plex Mono MUST be loaded (via CDN font link) as the primary monospace typeface with system monospace fallbacks.
- **FR-014**: All existing functional behavior (Web Audio playback, config export/import, parse levels, layered mode, semantic mappings, localStorage persistence) MUST remain intact after the visual changes.

### Key Entities

- **Chassis**: The outer wrapper element carrying the scanline + bezel aesthetic; contains all other regions.
- **CRT Panel**: The oscilloscope display in the left pane — waveform SVG, active-unit display box, readout strips.
- **LedBar**: Reusable slider component — 24-segment amber bar, label, numeric value readout.
- **Rocker**: Reusable button-group component — shared bezel, amber active state.
- **Toggle**: Reusable boolean control — pill track + round knob, amber-on state.
- **VU Meter**: Output-level indicator — 20-segment bar with phosphor/amber/rose color zones.
- **Transport**: Tape-transport button row — play/pause, stop, reset, export with hardware styling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All visual elements from the OSC-1 design (chassis, CRT, LED bars, rocker switches, toggle switches, VU meter, transport, tabs) are present and correctly styled when the app is loaded in a browser.
- **SC-002**: All existing functional behaviors pass manual verification — playback works, config export/import works, parse levels switch correctly, layered mode activates the extra tab content, semantic toggles persist.
- **SC-003**: The CRT waveform animates smoothly during playback with no visible jank on modern hardware at standard desktop resolutions.
- **SC-004**: Every LED bar slider responds to drag interaction and updates segment count and numeric value in real time with no perceptible lag.
- **SC-005**: The app remains usable and all controls are reachable at 1280×800 viewport without unintended content overflow.
- **SC-006**: The IBM Plex Mono font renders correctly in the browser (confirmed by visual inspection — not the system monospace fallback).

## Assumptions

- IBM Plex Mono is loaded via a CDN `<link>` tag (Google Fonts) rather than bundled as a local asset — simplest approach consistent with the UI kit prototype.
- Light-mode support for the chassis is a secondary concern; the dark chassis is the primary deliverable. Light mode will use approximate zinc token overrides rather than a fully warmed-bezel variant.
- The transport "export" button retains its existing `configStore` wiring from `004-config-persist`; this feature only changes its visual appearance.
- The CRT waveform animation uses a `requestAnimationFrame` loop driven by a React `useState` tick — no new audio-analysis infrastructure is needed.
- The design targets desktop viewports (≥1024px wide); mobile layout is explicitly out of scope.
- The `LAYERED LEVELS` section (shown in the layered tab) and the existing `005-audio-layering` layered parameters are surfaced in the new `layered` tab without changing the underlying data model.
