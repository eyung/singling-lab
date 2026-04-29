# Contract: LayeredLevelConfig

**Type**: TypeScript interface in `src/types.ts`  
**Persisted in**: `AppParams.layered` (localStorage + exported `.json` config)

## Shape

```ts
interface LayeredLevelConfig {
  soundCharacterId: string   // non-empty; ID of a SoundCharacter
  gain: number               // clamped [0, 1]
  enabled: boolean
  sustainMode: 'retrigger' | 'hold'  // NEW in 007
}
```

## Invariants

| Field | Rule |
|---|---|
| `soundCharacterId` | Must be a non-empty string. Invalid or empty values are replaced with `'default'`. |
| `gain` | Clamped to `[0, 1]` by `validateLayeredLevelConfig`. |
| `enabled` | No constraints beyond boolean type. |
| `sustainMode` | Must be `'retrigger'` or `'hold'`. Any other value (including missing) falls back to the layer's default. |

## Defaults per Layer

| Layer | soundCharacterId | gain | enabled | sustainMode |
|---|---|---|---|---|
| `word` | `'pluck'` | `0.70` | `true` | `'retrigger'` |
| `phrase` | `'pad'` | `0.42` | `true` | `'retrigger'` |
| `sentence` | `'strings'` | `0.22` | `true` | `'retrigger'` |
| `paragraph` | `'ocean'` | `0.10` | `true` | `'hold'` |

## Backward Compatibility

Configs exported before feature 007 do not include `sustainMode`. On import, `validateConfig` falls back to the default for each layer. No breaking change; no migration required.

## Semantic of `sustainMode` in the Playback Engine

- `'retrigger'`: On every word beat within the span, `playLayeredUnit` is called with `sp.duration = beatMs / 1000`. The note re-fires rhythmically at the word tempo.
- `'hold'`: At the first word beat of the span, `playLayeredUnit` is called with `sp.duration = spanWordCount × beatMs / 1000`. The note plays continuously until the span ends. On subsequent beats within the same span, no audio event is fired.

This field has no effect on the word layer (word tokens always fire once per beat).
