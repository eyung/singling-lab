# Tasks: OSC-1 Visual Overhaul

**Input**: Design documents from `/specs/006-osc1-visual-overhaul/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-components.md ✓, quickstart.md ✓

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependency in flight)
- **[Story]**: Which user story this task belongs to
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Load the font and define all CSS tokens and chassis class styles before any component work begins.

- [X] T001 Add IBM Plex Mono Google Fonts `<link>` preconnect and stylesheet tags to `index.html` (before `</head>`)
- [X] T002 Append CSS custom property chassis token block (`:root` dark tokens + `:root:not(.dark)` light overrides) to `src/index.css` — tokens: `--chassis-panel`, `--chassis-panel-2`, `--chassis-bezel`, `--chassis-bezel-hi`, `--chassis-bezel-lo`, `--chassis-plate`, `--chassis-screen`, `--phosphor`, `--phosphor-dim`, `--phosphor-glow`, `--amber`, `--amber-dim`, `--rose`, `--rose-dim`, `--ink`, `--ink-dim`, `--ink-lo`, `--font-mono`
- [X] T003 Append all chassis CSS class definitions to `src/index.css` — classes: `.osc-chassis`, `.osc-titlebar`, `.osc-screw`, `.osc-title`, `.osc-led`, `.osc-led--pwr`, `.osc-led--off`, `.osc-main`, `.osc-col`, `.osc-crt-wrap`, `.osc-crt`, `.osc-grid`, `.osc-crt-inner`, `.osc-crt-header`, `.osc-wave`, `.osc-unit`, `.osc-unit.idle`, `.osc-unit__cur`, `.osc-readout`, `.osc-input-wrap`, `.osc-input-label`, `.osc-textarea`, `.osc-input-overlay`, `.osc-transport`, `.osc-tb`, `.osc-tb--big`, `.osc-tb--play`, `.osc-tb--stop`, `.osc-right`, `.osc-tabs`, `.osc-tab`, `.osc-tab--on`, `.osc-tabpane`, `.osc-group`, `.osc-group__h`, `.osc-rocker`, `.osc-rocker__btn`, `.osc-rocker__btn--on`, `.osc-dial`, `.osc-dial__row`, `.osc-dial__val`, `.osc-bar`, `.osc-bar__segs`, `.osc-bar__seg`, `.osc-bar__seg.on`, `.osc-toggle`, `.osc-toggle__sw`, `.osc-acc`, `.osc-acc__tri`, `.osc-acc__body`, `.osc-vu`, `.osc-vu__bar`, `.osc-vu__seg`, `.osc-vu__seg.lit`, `.osc-vu__seg.lit.hot`, `.osc-vu__seg.lit.peak` — source: `specs/006-osc1-visual-overhaul/contracts/ui-components.md` and the OSC-1 UI kit (`singling-lab-design-system/project/ui_kits/web_app/index.html`)

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The rAF animation tick is shared infrastructure consumed by both `CrtScope` (US1) and `VuMeter` (US6). It must exist before either component can be wired up.

**⚠️ CRITICAL**: No user story work involving animated components can begin until this phase is complete.

- [X] T004 Add rAF animation tick to `src/App.tsx`: add `const [tick, setTick] = useState(0)` state, add `const rafRef = useRef<number | null>(null)` ref, add `useEffect` that starts a `requestAnimationFrame` loop calling `setTick(t => t + 1)` each frame with proper cleanup (`cancelAnimationFrame` on unmount). Thread `tick` and `isPlaying` through to `Controls` props interface.

**Checkpoint**: `tick` increments every rAF frame; `isPlaying` + `tick` are available as props in `Controls`.

---

## Phase 3: User Story 1 - Retro Oscilloscope Shell (Priority: P1) 🎯 MVP

**Goal**: Render the full OSC-1 chassis frame with CRT display, scanline background, corner screws, LED row, and animated waveform. All visible before any interaction.

**Independent Test**: Load the app — verify the warm dark chassis background, title bar with screws, phosphor title glyph, power LED glow, CRT screen with oscilloscope grid, blinking "awaiting signal" text, and low-amplitude sine trace all render correctly. Press play — verify waveform animates at full amplitude and sync LED turns amber.

- [X] T005 [P] [US1] Create `src/components/CrtScope.tsx`: props `{ playing: boolean, activeUnit: string | null, params: AppParams, tick: number }` — render the full CRT scope per `specs/006-osc1-visual-overhaul/contracts/ui-components.md#CrtScope` and the OSC-1 UI kit: outer `.osc-crt-wrap`, inner `.osc-crt` with `.osc-grid` overlay, scanline `::before`, vignette `::after`, `.osc-crt-inner` containing header strip, animated SVG waveform (`useMemo` path from tick + waveform type + amplitude), active-unit `.osc-unit` box, footer `.osc-readout` strip. Add `aria-hidden="true"` to wrapper.
- [X] T006 [US1] Restructure `src/App.tsx` outer layout: replace `div.min-h-screen` wrapper and `<header>` with `.osc-chassis` > `.osc-titlebar` + `.osc-main`. Title bar contains: four `.osc-screw` corners, `.osc-title` span with `SINGLING LAB // OSC-1 TEXT SONIFIER` in phosphor, `.osc-model` section with pwr LED (`osc-led--pwr`), sync LED (amber when `isPlaying`, off otherwise), serial label `SER. 0421`, and the existing `toggleTheme` button (☀/☾). Left column `.osc-col` wraps `<CrtScope/>`, the textarea, and the transport area.
- [X] T007 [US1] Add word-highlight text overlay to `src/App.tsx` textarea section: when `isPlaying` and tokens exist, render `div.osc-input-overlay` (absolute, pointer-events none) with token spans — active token gets `.cur` class (phosphor green + underline + glow), past tokens get `.past` class (ink-lo color), future tokens transparent. The textarea itself stays interactive beneath the overlay.

**Checkpoint**: Chassis shell and CRT display render correctly. Waveform animates on play. Active unit highlights in the text.

---

## Phase 4: User Story 2 - LED Bar Sliders (Priority: P2)

**Goal**: Provide the `LedBar` component that will replace all `Slider` instances throughout the Controls panel.

**Independent Test**: Import `LedBar` into `Controls.tsx` for one parameter (e.g., tempo). Verify 24-segment amber bar renders, segment count changes on drag, numeric value updates live, and Tab key focuses the hidden range input with a visible focus ring.

- [X] T008 [US2] Create `src/components/LedBar.tsx`: props per `specs/006-osc1-visual-overhaul/data-model.md#LedBar` — render `.osc-dial` > `.osc-dial__row` (label left, amber value+unit right) + `.osc-bar` containing `.osc-bar__segs` (24 `div.osc-bar__seg`, lit count = `round((value-min)/(max-min)*24)`) and hidden `<input type="range">` (position absolute, opacity 0, full coverage). Apply `aria-label={label}` to the input. Add `focus-within` outline on `.osc-bar` container (Tailwind `focus-within:ring-1 focus-within:ring-amber-400/60` or equivalent CSS).

**Checkpoint**: `LedBar` renders and functions correctly for a single parameter.

---

## Phase 5: User Story 5 - Tape Transport Controls (Priority: P2)

**Goal**: Replace the plain play/stop button with hardware-style transport buttons.

**Independent Test**: Verify transport row renders with `▶`/`‖` (phosphor), `■` (rose), `◀◀`, `◉` glyphs; press play and verify playback starts; press stop and verify it halts; press reset and verify params reset; verify translateY press animation works.

- [X] T009 [P] [US5] Create `src/components/Transport.tsx`: props per `specs/006-osc1-visual-overhaul/data-model.md#Transport` — render `.osc-transport` row of four `.osc-tb` buttons. Play button: `.osc-tb--big .osc-tb--play`, glyph `▶`/`‖` in phosphor (idle/playing), label `play`/`pause`. Stop button: `.osc-tb--stop`, glyph `■` in rose, `aria-label="stop"`. Reset button: glyph `◀◀`, `aria-label="reset to defaults"`. Export button: glyph `◉`, `aria-label="export configuration"`. Apply `disabled` attr + opacity 35% when `!canPlay` on play button. Apply CSS `:active { transform: translateY(1px) }` + flattened shadow per UI kit.
- [X] T010 [US5] Replace play/stop button block in `src/App.tsx` with `<Transport isPlaying={isPlaying} canPlay={!!text.trim()} onPlay={handlePlay} onStop={stop} onReset={() => { stop(); setParams(DEFAULT_PARAMS); saveToStorage(DEFAULT_PARAMS) }} onExport={() => exportConfig(params)}/>`. Import `Transport` and `exportConfig`. Remove the old play/stop `<button>` and active-unit `<div>` (active unit moves to CrtScope).

**Checkpoint**: Transport bar renders and all four buttons function correctly. No active-unit display in left pane (moved to CrtScope).

---

## Phase 6: US7 + US3 — Atomic Controls (P3, needed to unblock US4)

**Goal**: Build `Toggle` and `Rocker` as pure stateless components before Controls.tsx is refactored (US4 depends on both).

**Independent Test (US7)**: Import `Toggle` into Controls.tsx for the `sentimentToPitch` parameter. Verify knob slides right on click with amber glow, slides left on uncheck, and hidden checkbox is keyboard-focusable.

**Independent Test (US3)**: Import `Rocker` into Controls.tsx for the mode selector. Verify amber active fill switches between `single` and `layered` on click.

- [X] T011 [P] [US7] Create `src/components/Toggle.tsx`: props `{ label: string; checked: boolean; onChange: (v: boolean) => void }` — render `<label className="osc-toggle">` wrapping hidden `<input type="checkbox">` (CSS: `position:absolute; opacity:0; width:1px; height:1px`) + `.osc-toggle__sw` pill + label text. Apply `focus-within` outline on wrapper. Knob transitions via CSS `left 120ms ease-out`. Checked state: track `background: var(--amber-dim); border-color: var(--amber)`, knob `left:15px; background: var(--amber); box-shadow: 0 0 4px var(--phosphor-glow)`.
- [X] T012 [P] [US3] Create `src/components/Rocker.tsx`: props `{ value: string; options: readonly string[]; onChange: (v: string) => void }` — render `.osc-rocker` containing one `.osc-rocker__btn` per option. Active option gets `.osc-rocker__btn--on` (amber fill, dark text). Each button: `role="radio"`, `aria-checked={value === option}`. Container: `role="radiogroup"`.

**Checkpoint**: Both atomic components render and respond to interactions. Ready for Controls.tsx refactor.

---

## Phase 7: User Story 4 - Tabbed Right Panel (Priority: P2)

**Goal**: Restructure the right panel into global/levels/layered/semantic tabs. Requires T008 (LedBar), T011 (Toggle), T012 (Rocker).

**Independent Test**: Click each tab — verify only that tab's content renders. Verify global tab shows instrument selector, mode/parse-level rockers, tempo/polyphony LED bars, export/import/reset buttons. Verify levels tab shows all 5 level accordions with LED bar sliders. Verify layered tab shows 4 layered level accordions. Verify semantic tab shows 3 toggle switches.

- [X] T013 [US4] Add tab state to `src/components/Controls.tsx`: `const [tab, setTab] = useState<'global'|'levels'|'layered'|'semantic'>('global')`. Render `.osc-tabs` tab bar above the panel content: four `<button role="tab" aria-selected>` tabs with `aria-controls` pointing to panel ids. Active tab gets `.osc-tab--on`. Content area: `<div role="tabpanel" id="panel-{tab}" tabIndex={0}>` wrapping tab content.
- [X] T014 [US4] Replace all `<Slider .../>` instances in `src/components/Controls.tsx` with `<LedBar .../>` — parameters: tempo (ms), polyphony, pitch min/max (hz), dur min/max (s), attack (s), release (s), filter cutoff (hz), filter Q, gain. Include `unit` prop for each (e.g., `unit="ms"`, `unit="hz"`, `unit="s"`). Remove the `Slider` function definition from the file.
- [X] T015 [P] [US4] Replace all `<input type="checkbox">` boolean controls in `src/components/Controls.tsx` with `<Toggle .../>` — affects `LevelEditor` (enabled), `LayeredLevelEditor` (enabled), and the semantic overrides section.
- [X] T016 [P] [US4] Replace mode and parse-level pill button groups in `src/components/Controls.tsx` with `<Rocker value={...} options={...} onChange={...}/>` — mode rocker: `options={['single','layered'] as const}`, parse-level rocker: `options={['letter','word','phrase','sentence','paragraph'] as const}`.
- [X] T017 [US4] Reorganize `src/components/Controls.tsx` content into the four tab panels: **global** — instrument `<select>`, mode Rocker, parse-level Rocker, tempo LedBar, polyphony LedBar, export/import/reset buttons, VuMeter placeholder; **levels** — all five `LevelEditor` accordions; **layered** — all four `LayeredLevelEditor` accordions (always visible regardless of mode); **semantic** — three Toggle switches. Thread `tick` and `isPlaying` props through `Controls` to VuMeter's tab panel.

**Checkpoint**: All four tabs render correct content. All controls update `params` and trigger `onChange`. Functional behaviors (playback, export, import) unchanged.

---

## Phase 8: User Story 6 - VU Meter (Priority: P3)

**Goal**: Animated output level meter in the global tab.

**Independent Test**: Press play — verify VU meter segments pulse between ~11–18 lit (55–90%), phosphor green up to segment 13, amber 13–17, rose 17–20. Press stop — verify meter drops to near-zero.

- [X] T018 [P] [US6] Create `src/components/VuMeter.tsx`: props `{ playing: boolean; tick: number }` — render `.osc-vu` with label row (`output` left, `${(level*100).toFixed(0)}%` right) and `.osc-vu__bar` with 20 segments. Level formula: `playing ? 0.55 + 0.35*Math.sin(tick/4) + 0.1*Math.sin(tick/1.3) : 0.04`. Segment classes: base `.osc-vu__seg`; add `.lit` when `i < litCount`; add `.hot` when `lit && i > 13`; add `.peak` when `lit && i > 17`. Add `aria-hidden="true"` to wrapper.
- [X] T019 [US6] Add `<VuMeter playing={isPlaying} tick={tick}/>` to the global tab panel in `src/components/Controls.tsx` inside a `.osc-group` labelled "master out". Ensure `isPlaying` and `tick` are threaded through from `App.tsx` via Controls props.

**Checkpoint**: VuMeter animates on play and idles on stop.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, light-mode, and end-to-end regression verification.

- [X] T020 [P] Audit all new components against `specs/006-osc1-visual-overhaul/contracts/ui-components.md`: verify `LedBar` has `aria-label` on range input, `Toggle` hidden checkbox is keyboard-reachable, tab bar has `role="tablist"` + `role="tab"` + `aria-selected`, `Transport` buttons have `aria-label` values, `CrtScope` wrapper has `aria-hidden="true"`, `VuMeter` wrapper has `aria-hidden="true"`. Fix any gaps in their respective component files.
- [X] T021 [P] Verify light-mode CSS: toggle theme via ☀ button, confirm chassis background uses zinc semantic token fallbacks (not warm browns), all text remains legible, borders remain visible, and LED bars/toggles/rockers are visually coherent. Fix any light-mode token gaps in `src/index.css`.
- [ ] T022 End-to-end manual verification per FR-014 in `specs/006-osc1-visual-overhaul/spec.md`: (a) type text and press play — confirm audio plays and waveform/VU animate; (b) change parse level via Rocker — confirm retokenization; (c) switch to layered mode — confirm layered tab content accessible; (d) export config — confirm JSON file download; (e) import config — confirm state restores; (f) reset — confirm defaults restore; (g) open each level accordion — confirm all LED bar sliders respond; (h) toggle semantic switches — confirm state updates persist in localStorage.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS animated components (CrtScope, VuMeter)
- **Phase 3 (US1)**: Depends on Phase 2 — `CrtScope` needs `tick`; chassis shell uses CSS tokens from Phase 1
- **Phase 4 (US2)**: Depends on Phase 1 (tokens) only — can start in parallel with Phase 3
- **Phase 5 (US5)**: Depends on Phase 1 only — can start in parallel with Phase 3 and 4
- **Phase 6 (US7+US3)**: Depends on Phase 1 only — can start in parallel with Phase 3, 4, 5
- **Phase 7 (US4)**: Depends on Phase 4 (LedBar), Phase 6 (Toggle + Rocker) — MUST complete before refactoring Controls
- **Phase 8 (US6)**: Depends on Phase 2 (tick) and Phase 7 (Controls tab structure) — VuMeter needs its tab slot
- **Phase 9 (Polish)**: Depends on all phases complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|---|---|---|
| US1 (P1) Chassis + CRT | Phase 2 (rAF tick) | US2, US5, US7, US3 |
| US2 (P2) LED Bars | Phase 1 (tokens) | US1, US5, US7, US3 |
| US5 (P2) Transport | Phase 1 (tokens) | US1, US2, US7, US3 |
| US4 (P2) Tabs | US2 + US7 + US3 | US1, US5, US6 |
| US7 (P3) Toggles | Phase 1 (tokens) | US1, US2, US5, US3 |
| US3 (P3) Rockers | Phase 1 (tokens) | US1, US2, US5, US7 |
| US6 (P3) VU Meter | Phase 2 (tick) + US4 (Controls tabs) | US1, US5 |

### Within Each Phase

- Tasks on different files: can execute in parallel (marked `[P]`)
- Tasks on the same file (e.g., T006 and T007 both touch `App.tsx`): execute sequentially
- T014, T015, T016 all modify `Controls.tsx` — execute in order after T013

### Parallel Opportunities

- **Phase 1**: T001 (index.html) can be done while T002+T003 are being written (different files)
- **Phase 3**: T005 (`CrtScope.tsx` new file) is parallel with T006 (`App.tsx`) — different files
- **Phase 5 + Phase 6**: T009 (`Transport.tsx`), T011 (`Toggle.tsx`), T012 (`Rocker.tsx`) are three new files — all can be authored in parallel
- **Phase 8**: T018 (`VuMeter.tsx`) is parallel with T019 if VuMeter file is created first
- **Phase 9**: T020 and T021 are independent and can run in parallel

---

## Parallel Example: Phases 3–6 (after foundational T004 complete)

```
# These can all run in parallel (all different files):
Task T005: "Create src/components/CrtScope.tsx"
Task T008: "Create src/components/LedBar.tsx"
Task T009: "Create src/components/Transport.tsx"
Task T011: "Create src/components/Toggle.tsx"
Task T012: "Create src/components/Rocker.tsx"

# Then in sequence (same file, App.tsx):
Task T006: "Restructure App.tsx outer layout to chassis shell"
Task T007: "Add word-highlight text overlay in App.tsx"
Task T010: "Replace play/stop buttons in App.tsx with <Transport/>"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004)
3. Complete Phase 3: US1 (T005–T007)
4. **STOP and VALIDATE**: Load app — verify full chassis + CRT visual renders and waveform animates
5. Demo-able: the OSC-1 aesthetic is visible even with original Controls panel still in place

### Incremental Delivery

1. Phase 1+2 → Foundation ready (tokens + font + tick)
2. Phase 3 → Chassis + CRT visual (MVP — the core aesthetic is done)
3. Phase 4+5 → LED bars + transport (controls feel like hardware)
4. Phase 6+7 → Atomic controls + tabs (full right panel remodel)
5. Phase 8 → VU meter (final animation feature)
6. Phase 9 → Polish (accessibility + light mode + regression check)

---

## Notes

- `[P]` tasks operate on different files — no file conflicts
- Each user story phase delivers something visible and testable before the next begins
- The Phase 9 regression check (T022) is the most important quality gate — FR-014 requires no functional regression
- `src/index.css` is the only file modified in Phase 1; all component files in Phases 3–8 are new files except `App.tsx` and `Controls.tsx`
- The OSC-1 design does not add new TypeScript types — `types.ts` is untouched
