# Implementation Plan: Sonic Overhaul

**Branch**: `008-sonic-overhaul` | **Date**: 2026-06-12 | **Spec**: specs/008-sonic-overhaul/spec.md

## Architecture

One-way data flow; every stage pure until the engine:

```
text ──parseAll()──▶ ParsedText (offset-exact units, all 5 levels, rich signals)
        parser.ts        │
                         ▼
params ──────────▶ buildTimeline() ──▶ Timeline { events[], grid[], totalMs }
                     timeline.ts            │
              (mapUnit() per unit;          ├─▶ LiveEngine.play()        — lookahead scheduler
               scale quantise;              │     soundEngine.ts            suspend/resume pause
               deterministic voice budget)  ├─▶ renderWavBlob()          — OfflineAudioContext
                                            │     render.ts → export.ts     identical graph
                                            ├─▶ buildMidi(), buildParsedTxt()
                                            │     export.ts (pure, tested)
                                            └─▶ StructureMap / overlay / inspector (UI reads grid)
```

## Module layout

| Module | Role |
|---|---|
| `types.ts` | All shared types, validation, defaults (ScaleConfig, KeywordRule, Timeline, …) |
| `lexicon.ts` | Sentiment/energy/negators/modals/function/common words, category lexicons, syllables |
| `parser.ts` | Offset-exact segmentation ×5 levels; one compromise pass for POS; signal extraction |
| `scale.ts` | Scale interval tables, member generation (MIDI 24–108), log-distance quantiser |
| `mapping.ts` | `mapUnit()` — hashes (FNV-1a ×2 seeds), 8 semantic overrides, keywords, categories, punctuation voices |
| `timeline.ts` | `buildTimeline()` single+layered; beat grid; span transitions/hold coverage; min-heap voice budget |
| `soundEngine.ts` | `scheduleSound()` shared graph (osc/noise, sanitized envelopes, pan, glide); `LiveEngine`; seeded noise |
| `export.ts` | `encodeWav` (PCM16), `buildMidi` (SMF format 1 + GM/drum maps), `buildParsedTxt` — DOM-free |
| `render.ts` | `renderWavBlob` (OfflineAudioContext), `downloadBlob`, `filenameSlug` |
| `configStore.ts` | Schema-tolerant validation incl. all new fields; localStorage + file I/O |
| `components/` | CrtScope (canvas), StructureMap (canvas, new), Controls (4 tabs), Transport, VuMeter, LedBar, Rocker, Toggle |

## Key decisions

1. **Schedule-ahead audio, not setTimeout chains.** Events are placed on the AudioContext clock
   inside a 350 ms lookahead window (100 ms timer). Layer sync is sample-accurate; pause maps to
   `ctx.suspend()` (the clock freezes, so position and pending events stay aligned); seek is
   "re-play from offset".
2. **Deterministic voice stealing at build time** (not at play time). Reproducible under
   Principles II/IX and identical in the WAV render.
3. **Characters own their envelope.** When a sound character drives an event (layered layers,
   keywords, categories), attack/release/filter/Q/waveform come from the character; frequency,
   duration, mix gain and pan come from the mapping. Fixes pad-attack-ignored bug.
4. **Punctuation as percussion.** `, ; :` tick · `.` thud · `!` accented thud · `?` chime with
   upward glide · dashes/quotes quiet ticks — half a beat each (a breath, not a full slot).
   New percussive characters are excluded from backdrop selectors automatically.
5. **compromise for tags only.** Segmentation is hand-rolled with exact offsets (deterministic,
   documented; abbreviation/initial guards). One `nlp(text).json({offset:true})` pass per parse.
6. **Snapshot semantics for live edits.** The engine plays the Timeline captured at play();
   parameter edits apply on next play. Highlights/structure map read the playing snapshot.
7. **Hidden-text overlay.** While playing, the textarea text goes transparent and the
   scroll-synced overlay owns the glyphs (cur/past/layer-underline classes) — no double paint.

## Constitution check

- I non-phonetic ✓ (hashes, not phonemes) · II deterministic ✓ (pure timeline, seeded noise)
- III client-side ✓ · IV parameters over presets ✓ (rate, pan, scale, boosts all exposed)
- V layered rules ✓ (gain hierarchy defaults kept; backdrops non-percussive; master limiter;
  always-quantised) · VI silence valid ✓ (disabled levels keep slots) · VII text unconsumed ✓
- VIII Web Audio only ✓ (encoders are file-writers, permitted) · IX ambiguity reduced ✓
- X persist/portability ✓ (CONFIG_VERSION 2, backward compatible) · XI accessibility ✓
  (ARIA slider structure map, labels, keyboard transport)

## Testing

vitest (node, pure modules only): parser invariants (40 assertions across 5 files), scale
membership/quantisation, mapping overrides/keywords/punct, timeline grid alignment + hold
coverage + drop determinism, WAV header/clipping, MIDI chunk structure. Audio/UI verified
manually per quickstart.
