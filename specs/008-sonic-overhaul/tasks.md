# Tasks: Sonic Overhaul

**Input**: specs/008-sonic-overhaul/plan.md
**Status**: Complete

## Phase 1 — Core data pipeline
- [x] T001 Extend `types.ts`: UnitKind, WordClass, FrequencyTier, SentenceType, CharRange-bearing ParseUnit, SoundParams (pan, glideTo), LevelParams.rate, LayeredLevelConfig.pan, SemanticParams ×9, KeywordRule, ScaleConfig, Timeline/TimelineEvent/GridCell, CONFIG_VERSION 2, validators, defaults (polyphony 12, per-level rates)
- [x] T002 `lexicon.ts`: sentiment/energy/negator/modal/function/common word sets, 7 category lexicons, syllable + tier heuristics (documented strategies)
- [x] T003 `scale.ts`: 8 modes, buildScaleFreqs (MIDI 24–108), binary-search log-distance quantiseFreq
- [x] T004 Rewrite `parser.ts`: offset-exact tokenizer/paragraphs/sentences (abbrev+initial guards)/phrases (forward-attaching conjunctions)/letters; single compromise pass; negation-aware word analysis; span aggregation; sentenceType
- [x] T005 `mapping.ts`: dual-seed FNV-1a hashing, 8 overrides, keyword > category > layer-default character resolution, character-owned envelopes, punctuation voices, scale quantisation + glide
- [x] T006 `timeline.ts`: single+layered builders on a shared beat grid; span transition/hold-coverage events; punct half-beats; deterministic min-heap voice budget; cellIndexAt

## Phase 2 — Audio engine & exports
- [x] T007 Rewrite `soundEngine.ts`: shared scheduleSound graph (sanitised envelopes, pan, glide, seeded noise w/ loop cap), createMasterChain (limiter+analyser), LiveEngine (lookahead scheduler, suspend-pause, seek-by-replay, click-free stop, playOne)
- [x] T008 `export.ts`: encodeWav PCM16, buildMidi (SMF1, GM program map, drum-channel punctuation, VLQ), buildParsedTxt annotated report
- [x] T009 `render.ts`: renderWavBlob via OfflineAudioContext + same graph; downloadBlob; filenameSlug
- [x] T010 `soundCharacters.ts`: percussion category (tick, thud, snap, chime, woodblock), excluded from backdrops
- [x] T011 `configStore.ts`: validate all new fields with per-field fallbacks (old configs import cleanly)

## Phase 3 — UI
- [x] T012 `CrtScope`: canvas analyser trace with phosphor persistence (CRT pinned dark across themes), semantic inspector, layer LEDs, time/scale readout, idle parse stats
- [x] T013 `StructureMap` (new): 4-row canvas structure strip, offscreen static layer, playhead interpolation, click-to-seek, arrow-key seek, ARIA slider
- [x] T014 `VuMeter`: real RMS from master analyser, attack/decay ballistics
- [x] T015 `Transport`: play/pause/resume + stop + reset + rec-wav (busy state)
- [x] T016 `Controls`: global/levels/layers/language tabs; scale group; rate + pan bars; keyword editor; category map; downloads (midi/txt); memoised against 60 fps renders
- [x] T017 `App`: timeline orchestration, posMs rAF, seek, space/esc shortcuts, live-typing preview, demo chips, scroll-synced hidden-text overlay + auto-follow, legend
- [x] T018 `index.css`: structure map/chips/legend/keyword/catmap/transport styles, light-theme hardware corrections, responsive ≤1080px/≤560px
- [x] T019 `index.html`: title, description, theme-color, inline SVG favicon

## Phase 4 — Verification
- [x] T020 vitest suite: parser (13), scale (5), mapping (7), timeline (10), export (5) — 40 tests green
- [x] T021 `npm run build` — zero TypeScript errors, strict mode, no `any`
- [x] T022 Remove superseded `playbackUtils.ts`; no stale references
- [x] T023 Update CLAUDE.md (structure, commands, recent changes); spec/plan/tasks for 008
