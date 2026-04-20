# UI Component Contracts: OSC-1 Visual Overhaul

**Branch**: `006-osc1-visual-overhaul`  
**Date**: 2026-04-20

These contracts define the behavioral and accessibility requirements for each new component. Implementors must satisfy all contracts. Visual styling follows the OSC-1 design tokens in `src/index.css`.

---

## LedBar

**Purpose**: Segmented LED bar slider — replaces the plain `<input type="range">` + label used in `Slider`.

### Visual Contract
- 24 segments arranged in a horizontal row
- Lit segments: amber (`#ffb347`) with a soft glow (`box-shadow: 0 0 3px rgba(255,179,71,.5)`)
- Unlit segments: dark (`#1a1410`)
- Label: uppercase monospace, tracked wide, muted color — left-aligned above bar
- Value + unit: amber tabular numerals — right-aligned above bar, same row as label

### Behavioral Contract
- `value` prop controls the number of lit segments: `lit = round((value - min) / (max - min) * 24)`
- Dragging the (invisible) range input updates `value` live → triggers `onChange(number)`
- Keyboard: left/right arrows adjust by `step`; browser-native range behavior

### Accessibility Contract
- `<input type="range">` MUST be present in the DOM (not removed by CSS)
- Input MUST have `aria-label` equal to the `label` prop value
- Input MUST have `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (native to `type="range"`)
- Containing element MUST have `focus-within` visible ring so keyboard focus is visible
- Segments are `aria-hidden="true"` (decorative only)

### State Transitions
```
idle → hover: cursor changes to ew-resize over bar area
idle → focus: focus ring appears on bar container
dragging → release: onChange fires with final value
disabled (parent opacity-30): input gets disabled attribute
```

---

## Rocker

**Purpose**: Shared-bezel button group for exclusive-select controls — replaces pill buttons.

### Visual Contract
- Buttons share a single outer bezel (`border: 1px solid --bezel; border-radius: 3px; overflow: hidden`)
- Active button: amber fill (`background: var(--amber); color: #1a1208`), inset highlight
- Inactive button: dark background, muted text
- Buttons divided by 1px bezel-colored separators

### Behavioral Contract
- Only one option active at a time
- Clicking an inactive option fires `onChange(option)` immediately
- No double-click or toggle-off behavior

### Accessibility Contract
- Container: `role="group"`
- Each button: `role="radio"` or standard `<button>` with `aria-pressed` indicating active state
- Keyboard: Tab focuses the group; arrow keys navigate within (or Tab cycles through buttons)
- Focus ring visible on focused button

---

## Toggle

**Purpose**: Hardware-style boolean switch — replaces `<input type="checkbox">`.

### Visual Contract
- Pill track: 28×14px, dark background when off, amber-dim when on
- Knob: 10×10px circle, positioned left (2px from edge) when off, right (15px from edge) when on
- Transition: `left 120ms ease-out, background 120ms` on knob; `background 120ms` on track
- Label text: right of switch, monospace, body color

### Behavioral Contract
- Clicking anywhere on the label element (track, knob, or text) toggles state
- `onChange(boolean)` fires on every toggle

### Accessibility Contract
- `<input type="checkbox">` MUST be present in the DOM (visually hidden via `display:none` is **NOT** acceptable — use CSS positioning/opacity to hide while keeping in tab order, OR use `position:absolute; opacity:0; width:1px; height:1px`)
- Input MUST have `id` matching a `<label htmlFor>` OR be wrapped in `<label>`
- Visible focus ring MUST appear on the track when the hidden input receives focus (`focus-within` on wrapper)

---

## CrtScope

**Purpose**: Oscilloscope CRT display panel — decorative waveform + active-unit readout.

### Visual Contract
- Outer wrap: dark bezel with inset shadow, rounded corners, 14px padding
- Inner CRT: near-black radial gradient background, subtle green ambient glow, scanline overlay (CSS repeat-linear-gradient), vignette overlay
- Grid: phosphor-dim hairlines at 10%×12.5% intervals, 15% opacity
- Waveform: SVG `<path>`, phosphor green stroke, drop-shadow filter glow, `viewBox="0 0 100 100"`
- Active unit: centered phosphor text, 34px, 1px phosphor border box with glow when playing; "awaiting signal" blinking when idle
- Header strip: channel label + waveform type + instrument; rec/standby state with blinking cursor
- Footer strip: freq / gain / tempo / polyphony readouts in amber

### Behavioral Contract
- When `playing=false`: waveform amplitude ≈ 18% of range; "○ standby" in header
- When `playing=true`: waveform amplitude ≈ 82% of range; "● rec" in header
- `tick` drives waveform phase: `phase = (tick / 8) + t * Math.PI * 6` per sample
- Waveform shape determined by `params.levels.word.waveform` (sine/triangle/sawtooth/square)
- `activeUnit` displayed in bordered phosphor box; null state shows "awaiting signal" (blinking)

### Accessibility Contract
- Entire CRT panel: `aria-hidden="true"` (it is purely decorative — information is conveyed elsewhere)
- No interactive elements inside the CRT

---

## VuMeter

**Purpose**: Output level indicator — animates during playback.

### Visual Contract
- 20 segments, horizontal row
- Lit segments color zones:
  - Segments 0–12 (0–65%): phosphor green (`#7fff9a`)
  - Segments 13–16 (65–85%): amber (`#ffb347`)
  - Segments 17–20 (85–100%): rose
- Unlit: dark (`#2a201a`)
- Label "output" left, level percentage right (both uppercase monospace 9px)

### Behavioral Contract
- Level formula: `playing ? 0.55 + 0.35*sin(tick/4) + 0.1*sin(tick/1.3) : 0.04`
- Segment transitions: `background 60ms linear`

### Accessibility Contract
- `aria-hidden="true"` — decorative. Audio level information is not critical for accessibility.

---

## Transport

**Purpose**: Tape-transport button row — play/pause, stop, reset, export config.

### Visual Contract
- Buttons in a shared horizontal row with bezel background
- Each button: flex column with glyph (22px) above label (10px uppercase), dark gradient, inset box shadows
- Play button: wider (`flex:1.6`); glyph is phosphor green `▶` (idle) or neutral `‖` (playing)
- Stop button: glyph is rose `■`
- Reset button: glyph `◀◀`, neutral ink
- Export button: glyph `◉`, neutral ink
- Active press: `transform: translateY(1px)` + flattened shadow

### Behavioral Contract
- Play button: fires `onPlay()` whether playing or not (caller handles toggle logic)
- Stop button: fires `onStop()` always; disabled state not applied (stop is always safe)
- Reset button: fires `onReset()`
- Export button: fires `onExport()` (delegates to `exportConfig()` in configStore)
- Play button: `disabled` when `!canPlay`

### Accessibility Contract
- Play button: `aria-label="play"` (idle) / `aria-label="pause"` (playing) — switches dynamically
- Stop button: `aria-label="stop"`
- Reset button: `aria-label="reset to defaults"`
- Export button: `aria-label="export configuration"`
- All buttons: keyboard-activatable via Enter/Space (standard `<button>` behavior)
- Disabled play button: `disabled` attribute + `cursor:not-allowed` + `opacity:0.35`

---

## Tab Bar (in Controls.tsx)

**Purpose**: Four-tab navigation for the right panel.

### Visual Contract
- Tab bar: full-width row, `panel-2` background, 1px bezel bottom border
- Each tab: equal-width flex columns, uppercase monospace 10px, muted ink color
- Active tab: amber text + 1px amber bottom line (`::after` pseudo-element with glow)
- Tabs divided by 1px bezel-colored vertical separators

### Behavioral Contract
- Clicking a tab sets that tab as active; content below updates immediately
- Tab state is local UI state in `Controls.tsx` — not persisted

### Accessibility Contract
- Container: `role="tablist"`
- Each tab button: `role="tab"`, `aria-selected="true/false"`, `aria-controls="[tabpanel-id]"`
- Tab panels: `role="tabpanel"`, `id` matching tab's `aria-controls`, `tabIndex={0}`
- Keyboard: Arrow keys navigate between tabs; Tab moves focus to panel content
