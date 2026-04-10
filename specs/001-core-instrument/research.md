# Research: Core Instrument

**Branch**: `001-core-instrument` | **Date**: 2026-04-10
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: Text-to-Norm Hash Function

**Decision**: Character code sum modulo 97, normalised to 0–1.
```
textToNorm(text) = (sum of charCodes) % 97 / 97
```
Two independent calls (forward and reversed string) produce pitch and duration norms.

**Rationale**: Deterministic, zero-dependency, O(n) on text length, produces stable
pseudo-random distribution across the 0–1 range. Mod 97 (prime) minimises collisions
for typical word-length strings.

**Alternatives considered**:
- FNV-1a hash: faster distribution but requires a polyfill or manual implementation
  with BigInt for 32-bit precision. Overkill for this use case.
- `crypto.subtle` (SubtleCrypto): async, overkill, and adds latency to the real-time
  tick loop.
- Simple char sum / text length: too strongly correlated with text length, not uniform.

---

## Decision 2: NLP Library for Semantic Analysis

**Decision**: `compromise` v14 (browser-native, bundled).

**Rationale**: Runs entirely in the browser without a server. Ships a compact (~500KB
minified) self-contained model. Provides POS tagging, sentence segmentation, negation
detection, and question detection — exactly the signals the semantic system needs.
No tokenisation server, no API key, no network request.

**Alternatives considered**:
- `wink-nlp`: More accurate, but larger bundle and more complex API surface.
- `natural`: Node-first; browser bundle requires significant shim work.
- Claude API / server-side NLP: Violates Principle III (Client-Side First). Deferred
  as an optional future enhancement only.
- Custom word lists only (no NLP library): Viable for sentiment, but loses POS tagging
  and negation detection. `compromise` was the minimum viable NLP solution.

---

## Decision 3: Web Audio Architecture

**Decision**: Single `AudioContext` created on first play; closed (and nulled) on stop.
Each voice is an independent `OscillatorNode → BiquadFilterNode → GainNode` chain
connected directly to `AudioContext.destination`. No shared mixer bus in v1.

**Rationale**: Browser limits the number of concurrent `AudioContext` instances.
Creating one per session and closing it on stop avoids the "AudioContext limit reached"
warning in Chrome. The direct-to-destination topology is sufficient for v1 polyphony
levels (max 16 voices) and avoids the complexity of a master gain/compressor bus.

**Alternatives considered**:
- Persistent `AudioContext` (never closed): Risks browser warnings; state becomes
  stale after stop.
- Master gain bus + compressor: Better for volume management under high polyphony.
  Deferred to a future enhancement when polyphony >4 use cases are common.
- AudioWorklet for custom synthesis: Significantly more expressive but requires a
  separate worker script and HTTPS. Out of scope for v1.

---

## Decision 4: State Management

**Decision**: React `useState` + `useRef`. No external state library.

**Rationale**: The app has one primary component tree: `App` → `Controls`. All state
flows downward as props. `useRef` is used for the playback tick loop (mutable, no
re-render needed). The complexity does not justify Redux, Zustand, or Context.

**Alternatives considered**:
- Zustand: Clean API, but adds a dependency for a problem that doesn't require it.
- React Context: Appropriate if Controls were deeply nested. Current depth (one level)
  doesn't warrant it.
- useReducer: Would formalise param transitions. Revisit if validation logic grows.

---

## Decision 5: Deployment Target

**Decision**: Vercel static deployment. No server functions in v1.

**Rationale**: All processing is client-side. The Vite build produces a static `dist/`
folder that Vercel serves directly. Zero cold starts, zero server cost, offline-capable
after load (Principle III).

**Alternatives considered**:
- Vercel Edge Functions: Needed only if server-side NLP is added (future). Not
  needed for v1.
- Cloudflare Pages: Equivalent option; Vercel chosen for familiarity.

---

## Decision 6: Testing Strategy

**Decision**: No automated test suite in v1. Manual listening tests as defined in
spec.md acceptance scenarios. Revisit after v1 ships.

**Rationale**: The primary acceptance criteria for this instrument are perceptual
(SC-001 through SC-006). Automated unit tests can verify determinism (SC-003) and
parameter validation (FR-011), but cannot verify sonic character, timbral shifts, or
"immediately interesting" defaults. The cost of setting up a Web Audio mock test
environment exceeds the value for a v1 instrument.

**Deferred work**: If the codebase grows, `vitest` + `@testing-library/react` is the
natural choice for component tests. Web Audio can be mocked via `AudioContext` stubs.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---|---|
| Hash function for text → norm | Char code sum mod 97, normalised |
| NLP library | `compromise` v14 |
| Audio architecture | Single AudioContext, closed on stop, direct-to-destination |
| State management | useState + useRef, no external library |
| Deployment | Vercel static, no server functions |
| Testing | Manual listening tests in v1; vitest deferred |
