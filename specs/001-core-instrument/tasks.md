# Tasks: Core Instrument

**Input**: Design documents from `specs/001-core-instrument/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: No automated tests in v1 per research.md decision. Manual listening tests
are included in the Polish phase as verification tasks.

**Organization**: Tasks are grouped by user story. Tasks already completed during
scaffolding are marked `[x]`.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US4)
- All paths relative to project root

---

## Phase 1: Setup

**Purpose**: Project initialization, build toolchain, deployment config.

- [x] T001 Initialize Vite + React + TypeScript project in `singling-lab/`
- [x] T002 [P] Install runtime dependencies: `react`, `react-dom`, `compromise` in `package.json`
- [x] T003 [P] Install dev dependencies: `vite`, `@vitejs/plugin-react-swc`, `typescript`, `tailwindcss`, `@tailwindcss/vite` in `package.json`
- [x] T004 Configure Vite build pipeline with React SWC + Tailwind plugins in `vite.config.ts`
- [x] T005 [P] Configure TypeScript strict mode in `tsconfig.app.json` and `tsconfig.node.json`
- [x] T006 [P] Configure Vercel static deployment in `vercel.json`
- [x] T007 Create HTML entry point at `index.html`
- [x] T008 Create CSS entry point with Tailwind import at `src/index.css`
- [ ] T009 Initialize git repository with `git init` at project root
- [ ] T010 Create initial commit with all scaffolded files

---

## Phase 2: Foundational

**Purpose**: Core type system and validation — required by all user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T011 Define `ParseLevel`, `SemanticSignal`, `ParseUnit`, `SoundParams` types in `src/types.ts`
- [x] T012 [P] Define `LevelParams`, `SemanticParams`, `AppParams` types in `src/types.ts`
- [x] T013 [P] Define `DEFAULT_LEVEL_PARAMS` and `DEFAULT_PARAMS` constants in `src/types.ts`
- [x] T014 Implement `validateLevelParams()` with all VI.c validation rules in `src/types.ts`
- [x] T015 Implement `validateAppParams()` clamping polyphony [1,16] and tempo [50,5000] in `src/types.ts`

**Checkpoint**: Type system complete — all user story phases can now proceed.

---

## Phase 3: User Story 1 — Text Sonification Playback (Priority: P1) 🎯 MVP

**Goal**: User pastes text, selects a parse level, presses play, and hears each unit
as a distinct sound event in sequence. Stop halts playback immediately.

**Independent Test**: Paste "The quick brown fox jumps over the lazy dog", select
"word" level, press play. Nine words each produce a distinct sound. Pressing stop
halts immediately. Playing again produces the same sounds in the same order.

### Implementation for User Story 1

- [x] T016 Implement `analyzeSentiment()` with lexicon-based sentiment and energy scoring in `src/parser.ts`
- [x] T017 Implement `parseText()` for `letter` level (non-whitespace chars) in `src/parser.ts`
- [x] T018 [P] Implement `parseText()` for `word` level (`\b\w+\b` matches) in `src/parser.ts`
- [x] T019 [P] Implement `parseText()` for `sentence` level (via `compromise`) in `src/parser.ts`
- [x] T020 [P] Implement `parseText()` for `paragraph` level (`\n{2,}` split) in `src/parser.ts`
- [x] T021 Implement `buildSoundParams()` with `textToNorm` hash, pitch/duration lerp in `src/soundEngine.ts`
- [x] T022 Implement `SoundEngine` class with `AudioContext` lifecycle management in `src/soundEngine.ts`
- [x] T023 Implement `SoundEngine.playUnit()` with oscillator → filter → gain chain in `src/soundEngine.ts`
- [x] T024 Implement `SoundEngine.stop()` closing `AudioContext` and resetting voice count in `src/soundEngine.ts`
- [x] T025 Implement playback tick loop in `src/App.tsx` (parse → iterate → schedule)
- [x] T026 Implement play/stop button with disabled state when input empty in `src/App.tsx`
- [x] T027 Implement active unit display (`▶ <unit text>`) in `src/App.tsx`
- [x] T028 Implement text input `<textarea>` bound to state in `src/App.tsx`

**Checkpoint**: US1 complete — text sonification playback is fully functional and
independently testable.

---

## Phase 4: User Story 2 — Parse Level Selection (Priority: P2)

**Goal**: User switches between all five parse levels. Each level produces a
perceptibly different sonic character from the same text.

**Independent Test**: Enter a multi-sentence paragraph. Cycle through letter →
word → phrase → sentence → paragraph. Letter level: rapid, high-pitched. Paragraph
level: slow, deep. Each switch takes effect on the next play with one click.

### Implementation for User Story 2

- [x] T029 Implement `parseText()` for `phrase` level (punctuation + conjunction split) in `src/parser.ts`
- [x] T030 Implement parse level selector button row (letter/word/phrase/sentence/paragraph) in `src/App.tsx`
- [x] T031 Wire `parseLevel` state to `parseText()` call at play-time in `src/App.tsx`
- [x] T032 Apply level-specific `DEFAULT_PARAMS` registers (pitch ranges, durations, waveforms) in `src/types.ts`

**Checkpoint**: US2 complete — all five parse levels functional and perceptibly
distinct.

---

## Phase 5: User Story 3 — Per-Level Sound Parameter Control (Priority: P3)

**Goal**: User adjusts pitch range, duration, waveform, filter, and gain per level.
Changes take effect on the next playback. Disabled levels produce no sound.

**Independent Test**: Open "word" level controls. Set waveform to "square", pitchMax
to 2000 Hz. Play. Sound is noticeably harsher and higher. Disable "word" level.
Play. Word-level text passes silently. Re-enable. Sound returns.

### Implementation for User Story 3

- [x] T033 Implement `Slider` component with label, value display, and range input in `src/components/Controls.tsx`
- [x] T034 Implement `LevelEditor` collapsible panel with all parameter sliders and waveform select in `src/components/Controls.tsx`
- [x] T035 Implement enabled/disabled toggle in `LevelEditor` in `src/components/Controls.tsx`
- [x] T036 Apply `validateLevelParams()` on every `LevelEditor` field change in `src/components/Controls.tsx`
- [x] T037 Implement `Controls` component with Global section (tempo, polyphony) in `src/components/Controls.tsx`
- [x] T038 Wire `Controls` `onChange` to `setParams` in `src/App.tsx`
- [x] T039 Apply `validateAppParams()` on global param changes (tempo, polyphony sliders) in `src/components/Controls.tsx`
- [x] T040 Enforce `params.levels[unit.level].enabled` check before `playUnit()` in `src/App.tsx`

**Checkpoint**: US3 complete — all per-level parameters user-adjustable, validation
enforced, enabled/disabled toggle functional.

---

## Phase 6: User Story 4 — Semantic Sound Shaping (Priority: P4)

**Goal**: Enabling semantic overrides produces perceptibly different sounds for
emotionally charged text vs. neutral text. Each override is independently toggleable.

**Independent Test**: Enter "wonderful joyful radiant" vs "dark cruel bitter". With
sentiment-to-pitch enabled, the positive phrase sounds higher. With all overrides
disabled, both phrases sound indistinguishable in register.

### Implementation for User Story 4

- [x] T041 Implement `sentimentToPitch` blend in `buildSoundParams()` in `src/soundEngine.ts`
- [x] T042 Implement `energyToFilterCutoff` mapping in `buildSoundParams()` in `src/soundEngine.ts`
- [x] T043 Implement `energyToTempo` interval scaling in tick loop in `src/App.tsx`
- [x] T044 Add Semantic section with three override checkboxes to `Controls` in `src/components/Controls.tsx`

**Checkpoint**: US4 complete — all three semantic overrides functional and
independently toggleable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, git setup, and deployment readiness.

- [x] T045 [P] Generate `CLAUDE.md` agent context file at project root
- [x] T046 Verify `npm run build` passes with zero TypeScript errors
- [ ] T047 Run `git init` at project root
- [ ] T048 Create `.gitignore` (already exists — verify `node_modules`, `dist`, `.env`, `.vercel` are excluded)
- [ ] T049 Stage and commit all project files: `git add -A && git commit -m "feat: initial singling-lab implementation"`
- [ ] T050 Manual listening test — US1: paste a paragraph, play at word level, verify each word triggers a sound
- [ ] T051 [P] Manual listening test — US2: cycle through all five parse levels on the same text, verify distinct sonic character per level
- [ ] T052 [P] Manual listening test — US3: set word level to square wave + pitchMax 2000Hz, verify harsher/higher sound; disable word level, verify silence
- [ ] T053 [P] Manual listening test — US4: "wonderful joyful radiant" vs "dark cruel bitter" with sentiment-to-pitch on, verify pitch difference is perceptible
- [ ] T054 Deploy to Vercel via `npx vercel` and verify live URL plays correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — no dependency on US2/3/4
- **US2 (Phase 4)**: Depends on Foundational + US1 (uses `parseText` and playback loop)
- **US3 (Phase 5)**: Depends on Foundational — uses types and validation only; can start after Phase 2
- **US4 (Phase 6)**: Depends on US1 (needs `buildSoundParams` and tick loop) + US3 (needs SemanticParams in AppParams)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P2)**: After US1 — phrase parser depends on sentence parser being in place
- **US3 (P3)**: After Foundational — independent of US1/US2 (Controls is a separate subtree)
- **US4 (P4)**: After US1 + US3 — needs the playback loop and SemanticParams wired into AppParams

### Parallel Opportunities

- T002, T003, T005, T006 — all independent setup tasks
- T011, T012, T013 — type definitions (different type groups)
- T017, T018, T019, T020 — parse level implementations (different cases, same function)
- T033, T034, T037 — Controls component pieces (separate subcomponents)
- T050, T051, T052, T053 — manual listening tests (independent scenarios)

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1
4. **STOP and VALIDATE**: play word-level text, verify sound sequence
5. Deploy minimal version to Vercel

### Incremental Delivery

1. Setup + Foundational → type system ready
2. US1 → playback works (MVP)
3. US2 → all 5 levels functional
4. US3 → full parameter control (instrument usable)
5. US4 → semantic shaping (full feature)
6. Polish → git, deploy, verify

---

## Notes

- `[x]` = already implemented during scaffolding; verify but do not re-implement
- `[ ]` = not yet done; execute in order
- `[P]` = parallelizable (no file conflicts, no incomplete dependencies)
- `[USn]` = maps to user story n from spec.md
- Every story phase ends with an independent listening test checkpoint
