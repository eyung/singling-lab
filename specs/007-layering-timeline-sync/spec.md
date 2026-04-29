# Feature Specification: Layering Timeline Sync & Highlighting Fix

**Feature Branch**: `007-layering-timeline-sync`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "There appears to be some bugs related to the layering mechanism. The playback of the multiple layers are not in sync with one another in regards to the timeline. For example, the sentence layer would finish playing its output, while the words layer is still sonifying the words in the first sentence. A requirement to add is that all the layers need to align to the same timeline and play together accordingly. Higher level layers such as phrase, sentence, and paragraph should repeat their chords until the next token/output. In relation to this, the highlighting mechanism is also not highlighting properly when I test the sentence/phrase/paragraph layers in isolation. When playing multiple layers, the highlighting logic might need to be reprogrammed so that users can observe easily which word, sentence, phrase, paragraph the app is currently playing."

## Clarifications

### Session 2026-04-29

- Q: How should the text overlay distinguish active higher-level spans in layered and single modes? → A: Underline style per level — solid amber underline for phrase, dashed amber underline for sentence, dotted amber underline for paragraph; word highlight retains the existing phosphor-green fill.
- Q: How should higher-level layer chord sustain work — re-trigger on every word beat, or hold a single long note? → A: Per-layer user choice — each higher-level layer (phrase, sentence, paragraph) exposes a sustain mode control allowing the user to select between re-trigger (chord fires on every word beat within the span) and hold (one note sustained for the full span duration).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Playback Timeline (Priority: P1)

A composer enables word, phrase, sentence, and paragraph layers simultaneously and presses play. All four layers start together and advance in lockstep — the sentence layer fires once when the first word of each sentence begins, the paragraph layer fires once when the first word of each paragraph begins, and so on. No layer finishes ahead of any other; playback ends when the last token across all active layers has sounded.

**Why this priority**: This is the core bug. Without a shared timeline, the layered mode produces incoherent stacking rather than the intended orchestral behaviour where slower-changing layers underpin faster-changing ones.

**Independent Test**: Load a two-sentence paragraph (e.g. "The cat sat. The dog ran."). Enable word and sentence layers only. Press play. Observe that the sentence-layer note for "The cat sat." fires at the same moment the first word "The" fires — and that the sentence-layer note for "The dog ran." fires at the same moment "The" (word 4) fires. Both layers should finish simultaneously.

**Acceptance Scenarios**:

1. **Given** word and sentence layers enabled with a two-sentence text, **When** the user presses play, **Then** the first sentence-layer note fires at the exact same moment as the first word-layer note (t=0).
2. **Given** word and sentence layers, **When** the second sentence begins, **Then** the second sentence-layer note fires at the same moment as the first word of the second sentence, not before it.
3. **Given** all four layers enabled, **When** playback is running, **Then** all layers finish at the same time (the final word-layer note is the last event across all layers).
4. **Given** only the paragraph layer enabled, **When** the user presses play, **Then** each paragraph-layer note fires once per paragraph and playback duration matches the word-level beat count of that text.

---

### User Story 2 - Higher-Level Layer Chord Sustain (Priority: P1)

While playing a multi-layer sonification, a user listens and hears the sentence-level chord hold steadily beneath the rapid word-level plucks — sustaining for as long as that sentence spans — before transitioning to the next chord when the next sentence begins. Phrase and paragraph layers behave the same way: each chord lasts exactly as long as its span of text.

**Why this priority**: Without sustain, higher-level layers are inaudible flashes that offer no sense of structure. The sustain/repeat behaviour is what makes them feel like "harmony layers" underpinning the melody.

**Independent Test**: Enable sentence layer only on a two-sentence text. Set sustain mode to re-trigger. Press play and observe that the chord fires on every word beat through the first sentence, then transitions to a new chord on the first word of the second sentence. Switch sustain mode to hold and repeat: the first note should play continuously until the second sentence begins.

**Acceptance Scenarios**:

1. **Given** the sentence layer with sustain mode set to re-trigger and a two-sentence text, **When** the first sentence is sonifying, **Then** the sentence-layer chord fires on each word beat within the first sentence's span.
2. **Given** a paragraph containing three sentences, **When** playback runs with paragraph and word layers active, **Then** the paragraph-layer chord sounds continuously through all three sentences and only changes when the next paragraph begins.
3. **Given** the phrase layer active, **When** playback runs, **Then** each phrase-layer chord sustains for as many word beats as are in that phrase, then transitions to the next phrase chord.
4. **Given** the last sentence in the text, **When** the final word of that sentence sounds, **Then** the sentence-layer chord ends at the same time.

---

### User Story 3 - Per-Level Highlighting in Layered Mode (Priority: P2)

A researcher watches the text input area during layered playback and can see at a glance which word, which phrase, which sentence, and which paragraph is currently sounding — each indicated by a distinct visual treatment. This allows them to follow the structural decomposition of the text in real time.

**Why this priority**: Highlighting is the primary visual confirmation that the timeline is correct and that the layering is working as intended. Without it, users cannot verify which layer is doing what.

**Independent Test**: Enable all four layers and press play on a multi-sentence text. Observe the input overlay: the current word is highlighted, and the current sentence (or phrase/paragraph) is also visually distinguished from surrounding text.

**Acceptance Scenarios**:

1. **Given** layered playback running with all four levels active, **When** the cursor is at word N, **Then** the word token is highlighted in the active (phosphor green) style.
2. **Given** layered playback running, **When** the cursor is within sentence S, **Then** all tokens belonging to sentence S display a dashed amber underline, distinguishing them from tokens outside the current sentence.
3. **Given** layered playback running, **When** the active sentence changes, **Then** the sentence-level highlight transitions to the new sentence simultaneously with the sentence-layer audio event.
4. **Given** layered playback with only word and paragraph layers active (phrase and sentence disabled), **Then** only word-level and paragraph-level highlights are shown — disabled layer spans are not highlighted.

---

### User Story 4 - Single-Level Highlighting Fix (Priority: P2)

A user selects the sentence parse level in single mode and presses play. Each sentence is highlighted as it is sonified, and the highlight advances sentence by sentence. The same works correctly for phrase and paragraph levels: the currently sonifying unit is always visually identified in the text.

**Why this priority**: This is a pre-existing highlighting bug that affects single-mode playback for all parse levels except word. It undermines trust in the display and makes the app feel broken when exploring non-word parse levels.

**Independent Test**: Switch to single mode, set parse level to `sentence`, and press play on a three-sentence text. Observe that each sentence highlights in turn as it sounds — not a blank or stale highlight.

**Acceptance Scenarios**:

1. **Given** single mode with parse level set to `sentence`, **When** the second sentence is sonifying, **Then** the second sentence's tokens are highlighted and the first sentence's tokens are shown as past (dimmed).
2. **Given** single mode with parse level set to `phrase`, **When** phrase N is sonifying, **Then** phrase N's tokens are highlighted; all earlier phrases are dimmed.
3. **Given** single mode with parse level set to `paragraph`, **When** the first paragraph sounds, **Then** all tokens in that paragraph are highlighted; tokens in subsequent paragraphs are shown in default (future) style.
4. **Given** single mode with parse level set to `word` (existing behaviour), **When** a word is sonifying, **Then** behaviour is unchanged from the current implementation.

---

### Edge Cases

- What happens when only one layer is active in layered mode and it is a higher-level layer (e.g., only paragraph enabled)? — Playback should still work: the paragraph layer fires once per paragraph and sustains for the corresponding word-beat count even though no word layer is ticking.
- What happens when the text contains a single sentence with no paragraph breaks? — The paragraph layer fires once at t=0 and sustains for the entire playback duration.
- What happens when two parse levels produce the same token boundaries (e.g., a single-word phrase)? — Both layers fire at the same moment; no crash or double-trigger issue.
- What happens when the user stops playback mid-sentence? — All layer timers are cleared immediately; no orphan audio events fire after stop.
- What happens when the text is changed mid-playback? — Existing behaviour (stop playback on text edit) is preserved.
- What happens when `energyToTempo` is enabled — does the variable tempo affect layer synchronisation? — The tempo modifier must be applied uniformly across all layers so the shared timeline remains coherent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST compute a single shared timeline for layered playback, where time is measured in word-level beat steps (each step = `params.tempo` ms, adjusted by semantic energy if enabled).
- **FR-002**: In layered mode, each higher-level token (phrase, sentence, paragraph) MUST fire its audio event at the beat step corresponding to the first word of that token's span.
- **FR-003**: In layered mode, each higher-level layer (phrase, sentence, paragraph) MUST remain audible for the full duration of its token's span using a sustain mode selected by the user per layer: **re-trigger** (the chord fires again on every word beat within the span) or **hold** (a single note is sustained for the full span duration, ending when the span ends).
- **FR-003a**: The layered tab MUST expose a sustain mode control for each of the phrase, sentence, and paragraph layers, allowing the user to switch between re-trigger and hold. The word layer does not require this control (it fires once per token by definition).
- **FR-004**: All active layers MUST start at t=0 and finish together when the final word-level beat step is reached.
- **FR-005**: In layered mode, the text overlay MUST highlight the current word using the active (phosphor green) style, identical to existing single-mode word highlighting.
- **FR-006**: In layered mode, the text overlay MUST additionally highlight the span of the current token at each enabled higher-level layer using underline styles: solid amber underline for the active phrase span, dashed amber underline for the active sentence span, dotted amber underline for the active paragraph span. These underlines must not conflict with the word-level phosphor-green fill highlight.
- **FR-007**: Higher-level span highlights MUST update at the same time as their corresponding audio events on the shared timeline.
- **FR-008**: In single mode, the text overlay highlight MUST correctly track the currently sonifying token regardless of parse level (letter, word, phrase, sentence, or paragraph).
- **FR-009**: The stop action MUST cancel all pending timeline events across all layers without audio artefacts.
- **FR-010**: When `energyToTempo` semantic mapping is active, the tempo modifier MUST be applied identically to all layers so the shared timeline remains coherent.

### Key Entities

- **Shared Timeline**: A single sequence of timed beat steps, one per word token, each carrying the scheduled time offset from playback start. All layers reference this timeline rather than maintaining independent timers.
- **Layer Event Schedule**: For a given layer and its parsed tokens, a mapping from each token to the beat step(s) on the shared timeline at which that token fires and sustains. The schedule differs by sustain mode: re-trigger schedules an event on every word beat within the span; hold schedules a single open-duration event at the span's start beat.
- **Sustain Mode**: A per-layer setting (`retrigger` | `hold`) stored in `LayeredLevelConfig`, controlling whether a higher-level layer chord pulses on every word beat or holds for the full span. Applies to phrase, sentence, and paragraph layers only.
- **Highlight State**: A per-level record of which token index is currently active, used to drive the text overlay for each enabled layer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In layered mode with all four layers enabled, all layers complete playback within one word-beat step of each other (no layer finishes more than `params.tempo` ms before or after any other).
- **SC-002**: In layered mode, each higher-level layer note is audible for at least the duration of one word beat; no higher-level note fires and ends in under 50 ms.
- **SC-003**: In single mode, the text highlight correctly identifies the active token for all five parse levels across 100% of tested parse-level/text combinations without remaining blank or pointing to the wrong token.
- **SC-004**: In layered mode, the text overlay shows a visually distinguishable active span for each enabled layer simultaneously, confirmed by visual inspection across at least three parse-level combinations.
- **SC-005**: Stopping playback at any point during layered sonification results in no further audio events or highlight updates within 100 ms of the stop action.

## Assumptions

- The shared timeline is computed at play-start time from the word-level token list; re-computing it mid-playback (e.g., to react to text edits) is out of scope — stopping and restarting covers that case.
- Each higher-level layer (phrase, sentence, paragraph) exposes a `sustainMode` field (`retrigger` | `hold`) in `LayeredLevelConfig`. This is a minimal data model addition. Default values: phrase → `retrigger`, sentence → `retrigger`, paragraph → `hold` (paragraph spans are typically long enough that pulsing is undesirable by default).
- Highlighting for higher-level spans in layered mode uses a CSS class or inline style applied to a character range derived from the existing whitespace-split token array; no new token-boundary data structures are required.
- The `energyToTempo` modifier is evaluated once per word beat using the word token's semantic signal, keeping all layers in lockstep even when the tempo is variable.
- Mobile layout and accessibility (ARIA live regions for audio output) remain out of scope for this feature, consistent with earlier feature decisions.
- `LayeredLevelConfig` requires one new field (`sustainMode: 'retrigger' | 'hold'`) for phrase, sentence, and paragraph layers. All other data model types (`AppParams`, `ParseUnit`) remain unchanged.
