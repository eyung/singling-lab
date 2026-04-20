# Quickstart & Verification: Simultaneous Audio Layering

**Feature**: 005-audio-layering
**Date**: 2026-04-20

---

## Setup

```bash
git checkout 005-audio-layering
npm install     # no new packages required
npm run dev     # http://localhost:5173
```

---

## Scenario 1: Layered Mode Basics (US1)

**Goal**: Confirm all four levels sonify simultaneously with correct gain hierarchy.

1. Open `http://localhost:5173` in browser
2. Paste the following text into the textarea:
   > "The old man sat quietly by the window. Outside, rain fell through the empty streets. He thought about her. Time passed."
3. Click the **"layered"** mode button (should appear near the parse level row)
4. Click **Play**
5. **Listen for**:
   - ✓ Multiple simultaneous audio streams (not sequential)
   - ✓ A prominent foreground voice (word level — most audible)
   - ✓ A sustained background texture (paragraph level — quietest)
   - ✓ Middle layers (phrase, sentence) at intermediate volumes
6. Click **Stop**

**Pass criteria**: Four perceptibly distinct simultaneous layers; word layer is clearly louder than paragraph layer.

---

## Scenario 2: Gain Hierarchy Verification (FR-002 / SC-002)

**Goal**: Confirm the ≥6 dB foreground/background distinction.

1. Open the Controls panel → Layered Levels section
2. **Disable** phrase and sentence levels (uncheck "enabled")
3. Play the same text — you should hear only word (loud) and paragraph (quiet)
4. Confirm the word layer is perceptibly much louder than the paragraph layer
5. Re-enable phrase and sentence
6. **Pass criteria**: With only word + paragraph active, the volume difference is obvious and non-subtle.

---

## Scenario 3: Backdrop Constraint (US2 / FR-003)

**Goal**: Confirm percussive sounds cannot be assigned to backdrop levels.

1. Open Controls → Layered Levels → click the SoundCharacter selector for **paragraph**
2. Verify that the dropdown contains only non-percussive options (all 12 synthesis + all 12 environmental)
3. Assign **Ocean** to paragraph → play → confirm a deep, sustained ambient texture (not a rhythmic hit)
4. Assign **Rain** to sentence → play → confirm a continuous rainfall texture
5. **Pass criteria**: No percussive option is selectable for phrase, sentence, or paragraph levels. All assigned environmental sounds produce sustained, non-rhythmic audio.

---

## Scenario 4: Non-Traditional Sound Characters (US3 / FR-006)

**Goal**: Confirm environmental sounds are available and audible.

1. Open Controls → Layered Levels → paragraph → select **Ocean**
2. Open Controls → Layered Levels → sentence → select **Wind**
3. Open Controls → Layered Levels → phrase → select **Forest**
4. Play the text
5. **Listen for**: A layered soundscape with oscillator-based word events over rain/wind/forest texture
6. Open Controls → Layered Levels → word → select **City Hum** (valid for word level)
7. Play — confirm the word layer now uses the city hum character
8. **Pass criteria**: At least Nature, City, and Environment categories are visible in selector. Environmental sounds produce recognisably different textures from oscillator presets.

---

## Scenario 5: Per-Layer Instrument Selection (US4 / FR-005)

**Goal**: Confirm users can change each layer's instrument and the change takes effect.

1. Note the current instrument for the **phrase** layer (default: Pad)
2. Change it to **Choir**
3. Click Play → listen → the phrase layer should sound noticeably different (choir-like texture vs. pure sine pad)
4. Change word to **Brass** → play → confirm word layer has a brighter, more aggressive timbre
5. **Pass criteria**: Changing the instrument for any layer produces an audible change in that layer's timbre. The change persists across play/stop cycles.

---

## Scenario 6: Single-Mode Unaffected (FR-011)

**Goal**: Confirm existing single-level mode is unchanged.

1. Click the **"single"** mode button
2. Select parse level **word**
3. Play the text
4. Confirm sequential (not simultaneous) word-by-word playback as before
5. Switch to **sentence** level → play → confirm sentence-level sequential playback
6. **Pass criteria**: Single mode behaves identically to pre-005 behaviour.

---

## Scenario 7: No Audio Clipping (FR-009 / SC-003)

**Goal**: Confirm the master compressor prevents distortion.

1. Enable all 4 layers
2. Set all layer gains to 0.9 (maximum stress test)
3. Play the text
4. **Listen for**: No audible distortion, clipping pops, or crackling
5. **Pass criteria**: Audio sounds compressed but not distorted. No clipping artifacts.

---

## Scenario 8: Sparse Input Edge Cases

**Goal**: Confirm graceful handling of text with missing parse levels.

1. Enter just a single word: "Hello"
2. Switch to layered mode → Play
3. **Expected**: Word layer plays; phrase/sentence/paragraph layers are silent (no errors)
4. Enter two sentences with no paragraph break: "Hello world. Today is good."
5. Play → confirm word, phrase, sentence layers are active; paragraph layer is silent
6. **Pass criteria**: No errors shown; silent layers produce no sound and no console errors.

---

## Scenario 9: Config Persistence (Principle X)

**Goal**: Confirm layered config is saved and restored.

1. Switch to layered mode
2. Change paragraph layer to **Thunder**, gain to 0.15
3. Reload the page
4. **Expected**: Layered mode is still active; paragraph is still set to Thunder at 0.15 gain
5. Export config (export config button) → open JSON → confirm `mode: "layered"` and `layered.paragraph.soundCharacterId: "thunder"` are present
6. **Pass criteria**: Layered configuration survives page reload and is present in exported JSON.

---

## Scenario 10: Pre-005 Config Import Compatibility

**Goal**: Confirm old config files load without error.

1. Export a config file from a pre-005 session (or create manually: any `singling-lab-config.json` without `mode` or `layered` fields)
2. Import it via "import config"
3. **Expected**: Config loads successfully; mode defaults to `single`; layered settings default to DEFAULT_LAYERED_PARAMS
4. **Pass criteria**: No error message shown; app functions normally after import.

---

## Build Verification

```bash
npm run build   # must complete with 0 TypeScript errors
```
