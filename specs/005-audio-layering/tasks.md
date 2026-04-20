# Tasks: Simultaneous Audio Layering

**Input**: Design documents from `specs/005-audio-layering/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not requested — manual functional verification only (quickstart.md scenarios).

**Organization**: Tasks grouped by user story.
- US1 (P1): Enable layered playback mode — the core simultaneous playback loop
- US2 (P2): Backdrop instrument constraints — enforcement in Controls UI
- US3 (P2): Non-traditional sound characters — noise synthesis catalog
- US4 (P3): Per-layer instrument selection — gain sliders and onChange wiring

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

No new project dependencies required. Branch `005-audio-layering` is already checked out.

*(No setup tasks — build system, TypeScript, Vite, and Tailwind are already configured.)*

---

## Phase 2: Foundational — Type System

**Purpose**: Add `SoundCharacter`, `LayeredLevel`, `LayeredLevelConfig` types, extend `AppParams`, and add validation. All user story phases depend on these types being present.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 In `src/types.ts`: add `SoundCharacter` interface with fields `id: string`, `name: string`, `category: 'synthesis'|'nature'|'city'|'environment'`, `percussive: boolean`, `attack: number`, `release: number`, `filterCutoff: number`, `filterQ: number`, `gain: number`, `source: 'oscillator'|'noise'`; add optional oscillator fields `waveform?: OscillatorType`; add optional noise fields `noiseColor?: 'white'|'pink'`, `noiseFilterType?: BiquadFilterType`, `noiseFilterFreq?: number`; add `type LayeredLevel = 'word'|'phrase'|'sentence'|'paragraph'`; add `interface LayeredLevelConfig { soundCharacterId: string; gain: number; enabled: boolean }`
- [x] T002 In `src/types.ts`: add `export const LAYERED_LEVELS: readonly LayeredLevel[] = ['word','phrase','sentence','paragraph']`; add `export const DEFAULT_LAYERED_PARAMS: Record<LayeredLevel, LayeredLevelConfig>` with word→pluck/0.70, phrase→pad/0.42, sentence→strings/0.22, paragraph→ocean/0.10 (all enabled:true); extend `AppParams` with `mode: 'single'|'layered'` and `layered: Record<LayeredLevel, LayeredLevelConfig>`; update `DEFAULT_PARAMS` to include `mode: 'single'` and `layered: DEFAULT_LAYERED_PARAMS`
- [x] T003 In `src/types.ts`: add `export function validateLayeredLevelConfig(llc: LayeredLevelConfig): LayeredLevelConfig` — clamps `gain` to [0,1], falls back to `DEFAULT_LAYERED_PARAMS[level]` if `soundCharacterId` is empty string; extend `validateAppParams()` to call `validateLayeredLevelConfig` on each of the 4 layered level entries and rebuild `p.layered` with validated results

**Checkpoint**: `npm run build` passes before proceeding. All new types are exported and importable.

---

## Phase 3: User Story 1 — Enable Layered Playback Mode (Priority: P1) 🎯 MVP

**Goal**: All four levels (word, phrase, sentence, paragraph) sonify simultaneously when the user selects "layered" mode, with the correct gain hierarchy and pitch quantisation.

**Independent Test**: Enter multi-sentence text → click "layered" mode button → click Play → hear 4 simultaneous audio streams with word layer loudest and paragraph layer quietest. Click "single" → play → confirm unchanged sequential behaviour.

### Implementation for User Story 1

- [x] T004 [US1] Create `src/soundCharacters.ts`: define `SOUND_CHARACTERS: readonly SoundCharacter[]` containing exactly the 12 existing synthesis presets ported from `INSTRUMENT_PRESETS` (same ids: default/piano/organ/strings/brass/flute/bass/pluck/pad/bell/choir/lead) — each with `source:'oscillator'`, `category:'synthesis'`, `percussive:false`, and the same waveform/attack/release/filterCutoff/filterQ/gain values from `src/instruments.ts`; export `getSoundCharacter(id: string): SoundCharacter|undefined`, `getBackdropCharacters(): SoundCharacter[]` (filter to `percussive===false`), `getAllCharacters(): SoundCharacter[]` (return all)
- [x] T005 [P] [US1] In `src/soundEngine.ts`: add `export function quantiseToCMajor(frequency: number): number` — define a constant array of all C major note frequencies across C2–C6 (28 notes: C2=65.41, D2=73.42, E2=82.41, F2=87.31, G2=98.00, A2=110.00, B2=123.47, C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00, A3=220.00, B3=246.94, C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88, C5=523.25, D5=587.33, E5=659.26, F5=698.46, G5=783.99, A5=880.00, B5=987.77); find and return the note minimising `Math.abs(Math.log2(frequency/note))` across all 28 entries; handle edge case where `frequency <= 0` by returning `C4=261.63`
- [x] T006 [US1] In `src/soundEngine.ts`: add a private `compressor: DynamicsCompressorNode|null = null` field to `SoundEngine`; add private `getCompressor(ctx: AudioContext): DynamicsCompressorNode` that creates the compressor once (threshold:-3, knee:6, ratio:4, attack:0.003, release:0.25) and connects it to `ctx.destination` if not already created; add `playLayeredUnit(sp: SoundParams, char: SoundCharacter, layerGain: number): void` method — for `char.source==='oscillator'`: create OscillatorNode+BiquadFilterNode+GainNode chain identical to `playUnit()` but with `sp.gain * layerGain` as peak amplitude, route to compressor instead of `ctx.destination`; always respects `this.maxVoices`; increment/decrement `activeVoices` as normal; extend `stop()` to set `this.compressor = null`
- [x] T007 [US1] In `src/App.tsx`: add import for `quantiseToCMajor` from `./soundEngine` and `getSoundCharacter` from `./soundCharacters`; add `const layeredPlaybackRefs = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({})` for multi-loop timeout tracking; add `playLayered()` function that: (a) parses text at all 4 LayeredLevels using `parseText(text, level)`; (b) filters to enabled levels with `params.layered[level].enabled && units.length > 0`; (c) for each active level starts an independent `tick` closure that builds `SoundParams` via `buildSoundParams(unit, params)`, sets `soundParams.frequency = quantiseToCMajor(soundParams.frequency)`, calls `engine.playLayeredUnit(soundParams, char, params.layered[level].gain)` where `char = getSoundCharacter(params.layered[level].soundCharacterId) ?? getSoundCharacter('default')!`; schedules next tick at `params.tempo`; sets `layeredPlaybackRefs.current[level] = setTimeout(tick, ...)`; (d) sets `isPlaying(true)` when loops start; (e) sets `isPlaying(false)` only when the last active level's loop completes
- [x] T008 [US1] In `src/App.tsx`: add `const [mode, setMode] = useState<'single'|'layered'>(() => params.mode)`; update the `play` callback: `if (mode === 'layered') { playLayered(); return }`; update the `stop` callback to also clear all entries in `layeredPlaybackRefs.current`; add mode toggle buttons below the parse level row in the JSX — two `<button>` elements for 'single' and 'layered' using the same button style pattern as parse level buttons (active: `bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900`, inactive: same inactive style); add `aria-label="Switch to single-level playback mode"` / `aria-label="Switch to layered playback mode"`; propagate mode change to params via `onChange({ ...params, mode: next })` so it persists

**Checkpoint**: User Story 1 fully functional.
- Single mode: unchanged sequential behaviour ✅
- Layered mode: 4 simultaneous streams, word loudest, paragraph quietest ✅
- Mode toggle persists across reload ✅
- `npm run build` passes ✅

---

## Phase 4: User Story 2 — Backdrop Instrument Constraints (Priority: P2)

**Goal**: The Controls panel shows separate instrument selectors for each layer in layered mode; backdrop level selectors (phrase, sentence, paragraph) are filtered to non-percussive sounds only.

**Independent Test**: Open Controls in layered mode → open SoundCharacter selector for paragraph → confirm only non-percussive options shown (all 12 synthesis presets + any environmental sounds already in catalog). Open word selector → confirm all options available.

### Implementation for User Story 2

- [x] T009 [US2] In `src/components/Controls.tsx`: add imports for `LAYERED_LEVELS`, `LayeredLevelConfig`, `validateLayeredLevelConfig` from `../types`; add imports for `getAllCharacters`, `getBackdropCharacters` from `../soundCharacters`; add `LayeredLevelEditor` sub-component that accepts `level: LayeredLevel`, `config: LayeredLevelConfig`, `onChange: (c: LayeredLevelConfig) => void` — renders: enabled checkbox; `<select>` for SoundCharacter using `getAllCharacters()` for word level and `getBackdropCharacters()` for phrase/sentence/paragraph, bound to `config.soundCharacterId`; updates call `onChange(validateLayeredLevelConfig({ ...config, soundCharacterId: id }, level))`; add a new "Layered Levels" `<section>` in `Controls` rendered only when `params.mode === 'layered'`, placed between the Global and Semantic sections, containing one `LayeredLevelEditor` per entry in `LAYERED_LEVELS`; add mode toggle buttons ('single' / 'layered') in the Global section between the instrument `<select>` and the tempo slider, styled to match existing button patterns, calling `onChange({ ...params, mode: id as 'single'|'layered' })`

**Checkpoint**: User Story 2 fully functional.
- Backdrop selectors (phrase/sentence/paragraph) show only `percussive===false` entries ✅
- Word selector shows all entries ✅
- Mode toggle visible and working in Controls Global section ✅

---

## Phase 5: User Story 3 — Non-Traditional Sound Characters (Priority: P2)

**Goal**: 12 environmental sound characters (nature, city, environment categories) are available in the instrument selectors, and the sound engine renders them as shaped noise via Web Audio API.

**Independent Test**: In layered mode, assign Ocean to paragraph → play → hear deep ambient rumble (not an oscillator tone). Assign Rain to sentence → play → hear continuous filtered noise texture.

### Implementation for User Story 3

- [x] T010 [P] [US3] In `src/soundCharacters.ts`: append 12 environmental `SoundCharacter` entries to `SOUND_CHARACTERS` with `source:'noise'`, `percussive:false`, and the following specs — `rain` (name:'Rain', category:'nature', noiseColor:'white', noiseFilterType:'lowpass', noiseFilterFreq:600, attack:0.3, release:1.0, filterCutoff:600, filterQ:0.5, gain:0.3); `wind` (name:'Wind', category:'nature', noiseColor:'pink', noiseFilterType:'bandpass', noiseFilterFreq:250, attack:0.5, release:1.5, filterCutoff:400, filterQ:1.0, gain:0.25); `forest` (name:'Forest', category:'nature', noiseColor:'pink', noiseFilterType:'lowpass', noiseFilterFreq:300, attack:0.4, release:1.2, filterCutoff:300, filterQ:0.5, gain:0.2); `ocean` (name:'Ocean', category:'nature', noiseColor:'pink', noiseFilterType:'lowpass', noiseFilterFreq:200, attack:1.0, release:2.0, filterCutoff:200, filterQ:0.8, gain:0.35); `campfire` (name:'Campfire', category:'nature', noiseColor:'white', noiseFilterType:'lowpass', noiseFilterFreq:500, attack:0.2, release:0.8, filterCutoff:500, filterQ:0.5, gain:0.2); `city-hum` (name:'City Hum', category:'city', noiseColor:'white', noiseFilterType:'bandpass', noiseFilterFreq:600, attack:0.3, release:0.8, filterCutoff:1200, filterQ:1.5, gain:0.25); `traffic` (name:'Traffic', category:'city', noiseColor:'pink', noiseFilterType:'bandpass', noiseFilterFreq:200, attack:0.5, release:1.0, filterCutoff:500, filterQ:1.0, gain:0.3); `cave` (name:'Cave', category:'environment', noiseColor:'pink', noiseFilterType:'bandpass', noiseFilterFreq:150, attack:0.6, release:2.0, filterCutoff:300, filterQ:2.0, gain:0.2); `underwater` (name:'Underwater', category:'environment', noiseColor:'white', noiseFilterType:'lowpass', noiseFilterFreq:200, attack:0.8, release:2.5, filterCutoff:200, filterQ:1.0, gain:0.25); `thunder` (name:'Thunder', category:'environment', noiseColor:'white', noiseFilterType:'lowpass', noiseFilterFreq:150, attack:0.05, release:3.0, filterCutoff:150, filterQ:0.5, gain:0.4); `machinery` (name:'Machinery', category:'environment', noiseColor:'white', noiseFilterType:'bandpass', noiseFilterFreq:600, attack:0.1, release:0.5, filterCutoff:800, filterQ:3.0, gain:0.2); `space` (name:'Space', category:'environment', noiseColor:'pink', noiseFilterType:'lowpass', noiseFilterFreq:100, attack:1.5, release:4.0, filterCutoff:100, filterQ:0.5, gain:0.3)
- [x] T011 [P] [US3] In `src/soundEngine.ts`: add `function generateNoiseBuffer(ctx: AudioContext, duration: number, noiseColor: 'white'|'pink'): AudioBuffer` — creates an `AudioBuffer` with `ctx.sampleRate * duration` samples; for `'white'`: fills each sample with `Math.random() * 2 - 1`; for `'pink'`: implements Voss-McCartney 6-generator approximation — maintain 6 running values `b0`–`b5` initialised to 0; for each sample: update each generator with probability 0.5^n (generator n updates every 2^n samples on average); sum all 6 generators divided by 6 to get pink-ish noise; returns the buffer
- [x] T012 [US3] In `src/soundEngine.ts`: extend `playLayeredUnit()` to handle `char.source === 'noise'` — create `AudioBufferSourceNode` with buffer from `generateNoiseBuffer(ctx, sp.duration, char.noiseColor ?? 'white')`; set `loop: true`; create a `BiquadFilterNode` with `type: char.noiseFilterType ?? 'lowpass'` and `frequency: char.noiseFilterFreq ?? char.filterCutoff`; create the main lowpass `BiquadFilterNode` with `char.filterCutoff` and `char.filterQ`; create `GainNode` with the same ADSR envelope as oscillator rendering (`sp.gain * layerGain`); chain: bufferSource → noiseShapingFilter → lowpassFilter → gainNode → compressor; call `bufferSource.start(now)` and `bufferSource.stop(now + sp.duration)`; track `activeVoices` via `bufferSource.onended`

**Checkpoint**: User Story 3 fully functional.
- Environmental sounds visible in all layer selectors ✅
- Assigning Ocean/Rain/Wind to backdrop levels produces distinctly ambient, non-tonal textures ✅
- No new npm packages added ✅
- `npm run build` passes ✅

---

## Phase 6: User Story 4 — Per-Layer Gain Sliders and Full Wiring (Priority: P3)

**Goal**: Each layer's gain is independently adjustable via a slider in the Controls panel; all onChange handlers are fully wired so changes persist via localStorage.

**Independent Test**: Change phrase layer gain to 0.05 → play → phrase layer becomes nearly inaudible. Change it back to 0.42 → play → phrase layer returns to normal prominence.

### Implementation for User Story 4

- [x] T013 [US4] In `src/components/Controls.tsx`: extend `LayeredLevelEditor` to include a gain `<Slider>` (label: `gain`, min:0, max:1, step:0.01, bound to `config.gain`); wire all changes (enabled, soundCharacterId, gain) so they call the parent `onChange` with the updated `params.layered` record; ensure the onChange cascade reaches `Controls.onChange → App.onChange → saveToStorage` (no additional wiring needed in App.tsx — Controls already calls the top-level `onChange` which saves to storage)

**Checkpoint**: User Story 4 fully functional.
- Gain slider for each layer adjusts perceived volume of that layer in real-time ✅
- Gain changes persist across page reload ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T014 In `src/configStore.ts`: extend `validateConfig()` to read `p['mode']` (validate as `'single'|'layered'`, default `'single'` if absent/invalid); read `p['layered']` object and for each of `LAYERED_LEVELS` read the sub-object fields `soundCharacterId` (string, default from `DEFAULT_LAYERED_PARAMS[level]`), `gain` (number, default), `enabled` (boolean, default true); call `validateLayeredLevelConfig` on each; pre-005 config files missing these fields MUST load without error and use `DEFAULT_LAYERED_PARAMS`
- [x] T015 [P] Run `npm run build` — confirm zero TypeScript errors and clean Vite production bundle
- [ ] T016 [P] Manual verification: run quickstart.md Scenarios 1–10 in order; confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately; BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 (types); independent of US2, US3, US4
- **US2 (Phase 4)**: Depends on Phase 2 (types) and T004 (soundCharacters.ts must exist for imports); no dependency on US3 or US4
- **US3 (Phase 5)**: Depends on Phase 2 (types) and T006 (playLayeredUnit must exist to extend); no dependency on US2 or US4
- **US4 (Phase 6)**: Depends on T009 (LayeredLevelEditor must exist to extend); no dependency on US3
- **Polish (Phase 7)**: Depends on all implementation phases complete

### Within Each Phase

- T001 → T002 → T003 must be sequential (each builds on the previous additions to types.ts)
- T004 and T005 can run in parallel after T003 (different files: soundCharacters.ts vs soundEngine.ts)
- T006 depends on T005 (playLayeredUnit calls quantiseToCMajor)
- T007 depends on T004 and T006 (App.tsx imports from both)
- T008 depends on T007 (adds mode toggle to the same App.tsx, same component)
- T010 and T011 can run in parallel (soundCharacters.ts vs soundEngine.ts)
- T012 depends on T011 (extends playLayeredUnit with noise logic; generateNoiseBuffer must exist)

### Parallel Opportunities

- T004 + T005 (Phase 3): soundCharacters.ts and soundEngine.ts quantisation — independent files
- T010 + T011 (Phase 5): soundCharacters.ts environmental entries and soundEngine.ts noise buffer generator — independent files
- T015 + T016 (Phase 7): build check and manual verification — independent activities

---

## Parallel Execution Examples

```text
# Phase 3: After T003 (types complete), run in parallel:
Task T004: "Create src/soundCharacters.ts with 12 synthesis SoundCharacter entries"
Task T005: "Add quantiseToCMajor() to src/soundEngine.ts"
# Then T006 depends on both → T007 → T008

# Phase 5: After T009 (Controls shell complete), run in parallel:
Task T010: "Add 12 environmental SoundCharacter entries to src/soundCharacters.ts"
Task T011: "Add generateNoiseBuffer() to src/soundEngine.ts"
# Then T012 depends on T011 → noise rendering complete
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 2: Types (T001–T003) — blocking, ~20 min
2. Phase 3: US1 (T004–T008) — layered playback with synthesis instruments, ~40 min
3. **STOP and VALIDATE**: Quickstart Scenarios 1–2; confirm 4 simultaneous layers, gain hierarchy
4. **MVP done** — researchers can use layered mode with 12 synthesis timbres

### Incremental Delivery

1. Phase 2 + 3 → Layered playback live (US1 ✅)
2. Phase 4 (T009) → Controls panel with backdrop filtering (US2 ✅)
3. Phase 5 (T010–T012) → Environmental sounds in catalog and audible (US3 ✅)
4. Phase 6 (T013) → Per-layer gain control (US4 ✅)
5. Phase 7 → Config persistence + build sign-off

### Notes

- Total implementation tasks: 13 (T001–T013)
- Total polish tasks: 3 (T014–T016)
- No new npm packages
- Backward compatible: pre-005 config files load without error
- Constitution amendment for Principle V required after implementation (separate `/speckit-constitution` run)
- `generateNoiseBuffer` is intentionally simple (pure `Math.random()` + Voss-McCartney) — no external library
