# Quickstart: Sonic Overhaul manual verification

Run `npm run dev`, open http://localhost:5173.

## Transport & timeline
1. Click **load: storm**, press **play** — words highlight in sync with sound; the structure
   map playhead sweeps; pressing **play** again pauses (audio and position freeze), **resume**
   continues from the same word.
2. Press **space** (focus outside the textarea) — toggles play/pause. **Esc** stops.
3. Click any word block in the structure map — playback starts from that word.
4. Stop mid-sentence — audio fades in ~50 ms without a click.

## Layered mode
5. Mode → **layered**, play *storm* — pluck words over pad phrases (panned left), string
   sentences (panned right, held), ocean paragraph bed; underlines: solid=phrase,
   dashed=sentence, dotted=paragraph; W/P/S/¶ LEDs flash on the scope.
6. All four layers stay aligned to the word grid for the whole text (no drift by the end).
7. Layers tab: set sentence sustain to **retrigger** — sentences re-strike per word instead of
   holding.

## Language features
8. Play *rhythm* demo — commas tick, periods thud, "eight!" lands an accent, "Hear it?" glides
   upward. Toggle **punctuation sounds** off — ticks disappear and the rhythm tightens.
9. *storm* demo: "must hold" sits noticeably higher than "Could the little fleet…"
   (modal strength → pitch); toggle it off and replay to compare.
10. Language tab → add keyword `storm` with character *Thunder* — every "storm" now rumbles.
11. Category map: `animal → Flute` (default) — in "the wolf crossed the river", wolf plays
    flute-voiced.
12. Toggle **live** chip on, type "hello world " — each completed word sounds as you type.

## Scale
13. Global tab: scale **C major → D pentatonicMinor** — layered playback re-harmonises on next
    play; in single mode the **quantize** toggle snaps pitches.

## Exports (constitution: successful first session)
14. **rec wav** → renders and downloads `singling-….wav`; plays back identically to live.
15. Downloads → **midi** opens in a DAW: word/phrase/sentence/paragraph tracks, punctuation on
    the drum channel. **txt** → annotated parse report at every level.
16. Config **export** → JSON; delete `keywords` from the file, re-**import** — loads with
    defaults, no errors (backward compatibility).

## Scope & themes
17. CRT shows the real output waveform (matches what you hear, persistence trails); VU meter
    responds to actual level. Inspector line shows sent/nrg/class/tier/syllables for the
    active word.
18. Toggle ☀/☾ — light chassis, CRT face stays dark; all controls legible in both themes.
19. Narrow the window below 1080 px — layout stacks to a single scrollable column.
