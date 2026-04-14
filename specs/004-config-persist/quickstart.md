# Quickstart: Configuration Persistence & Portability

**Branch**: `004-config-persist` | **Date**: 2026-04-14

Implementation order and verification steps.

---

## Step 1 — Add `ConfigFile` type and `CONFIG_VERSION` to `src/types.ts`

```typescript
export const CONFIG_VERSION = "1"

export interface ConfigFile {
  version: string
  app: "singling-lab"
  exported: string      // ISO 8601
  params: AppParams
}
```

No changes to existing types or validators.

---

## Step 2 — Create `src/configStore.ts`

```typescript
import type { AppParams, ConfigFile } from './types'
import { DEFAULT_PARAMS, CONFIG_VERSION, validateAppParams, validateLevelParams } from './types'

const STORAGE_KEY = 'singling-lab:params'
const PARSE_LEVELS = ['letter', 'word', 'phrase', 'sentence', 'paragraph'] as const

// ── Validation ────────────────────────────────────────────────────────────────

export function validateConfig(raw: unknown): AppParams | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r['app'] !== 'singling-lab') return null
  if (typeof r['params'] !== 'object' || r['params'] === null) return null

  const p = r['params'] as Record<string, unknown>
  const d = DEFAULT_PARAMS

  const parseLevel = (['letter','word','phrase','sentence','paragraph'] as const)
    .includes(p['parseLevel'] as never) ? p['parseLevel'] as AppParams['parseLevel'] : d.parseLevel

  const semantic = (typeof p['semantic'] === 'object' && p['semantic'] !== null)
    ? {
        sentimentToPitch:     typeof (p['semantic'] as any).sentimentToPitch === 'boolean'
          ? (p['semantic'] as any).sentimentToPitch : d.semantic.sentimentToPitch,
        energyToFilterCutoff: typeof (p['semantic'] as any).energyToFilterCutoff === 'boolean'
          ? (p['semantic'] as any).energyToFilterCutoff : d.semantic.energyToFilterCutoff,
        energyToTempo:        typeof (p['semantic'] as any).energyToTempo === 'boolean'
          ? (p['semantic'] as any).energyToTempo : d.semantic.energyToTempo,
      }
    : d.semantic

  const levelsRaw = (typeof p['levels'] === 'object' && p['levels'] !== null)
    ? p['levels'] as Record<string, unknown>
    : {}

  const levels = Object.fromEntries(
    PARSE_LEVELS.map(level => {
      const lRaw = (typeof levelsRaw[level] === 'object' && levelsRaw[level] !== null)
        ? levelsRaw[level] as Record<string, unknown>
        : {}
      const def = d.levels[level]
      return [level, validateLevelParams({
        enabled:     typeof lRaw['enabled'] === 'boolean' ? lRaw['enabled'] : def.enabled,
        pitchMin:    typeof lRaw['pitchMin'] === 'number' ? lRaw['pitchMin'] : def.pitchMin,
        pitchMax:    typeof lRaw['pitchMax'] === 'number' ? lRaw['pitchMax'] : def.pitchMax,
        durationMin: typeof lRaw['durationMin'] === 'number' ? lRaw['durationMin'] : def.durationMin,
        durationMax: typeof lRaw['durationMax'] === 'number' ? lRaw['durationMax'] : def.durationMax,
        attack:      typeof lRaw['attack'] === 'number' ? lRaw['attack'] : def.attack,
        release:     typeof lRaw['release'] === 'number' ? lRaw['release'] : def.release,
        waveform:    (['sine','triangle','sawtooth','square'] as OscillatorType[])
                       .includes(lRaw['waveform'] as OscillatorType)
                       ? lRaw['waveform'] as OscillatorType : def.waveform,
        filterCutoff: typeof lRaw['filterCutoff'] === 'number' ? lRaw['filterCutoff'] : def.filterCutoff,
        filterQ:     typeof lRaw['filterQ'] === 'number' ? lRaw['filterQ'] : def.filterQ,
        gain:        typeof lRaw['gain'] === 'number' ? lRaw['gain'] : def.gain,
      })]
    })
  ) as AppParams['levels']

  return validateAppParams({
    parseLevel,
    instrument: typeof p['instrument'] === 'string' ? p['instrument'] : d.instrument,
    polyphony:  typeof p['polyphony'] === 'number' ? p['polyphony'] : d.polyphony,
    tempo:      typeof p['tempo'] === 'number' ? p['tempo'] : d.tempo,
    semantic,
    levels,
  })
}

// ── localStorage ──────────────────────────────────────────────────────────────

export function saveToStorage(params: AppParams): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)) } catch { /* silent */ }
}

export function loadFromStorage(): AppParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return validateConfig(JSON.parse(raw) ? { app: 'singling-lab', params: JSON.parse(raw) } : null)
  } catch { return null }
}

export function resetToDefaults(): AppParams {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* silent */ }
  return { ...DEFAULT_PARAMS }
}

// ── File export / import ──────────────────────────────────────────────────────

export function exportConfig(params: AppParams): void {
  const file: ConfigFile = {
    version: CONFIG_VERSION,
    app: 'singling-lab',
    exported: new Date().toISOString(),
    params,
  }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'singling-lab-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importConfig(file: File): Promise<AppParams> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)
        const params = validateConfig(raw)
        if (!params) reject(new Error('Not a valid singling-lab configuration file.'))
        else resolve(params)
      } catch {
        reject(new Error('File is not valid JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}
```

---

## Step 3 — Update `App.tsx` initialisation and auto-save

```typescript
import { loadFromStorage, saveToStorage } from './configStore'

// Replace: useState(DEFAULT_PARAMS)
// With:
const [params, setParams] = useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)

// Wrap onChange handler to auto-save:
const handleParamsChange = (p: AppParams) => {
  setParams(p)
  saveToStorage(p)
}
// Pass handleParamsChange to <Controls onChange={handleParamsChange} />
```

---

## Step 4 — Add controls to `Controls.tsx`

Import and add three controls in the Global section below the polyphony slider:

```tsx
import { exportConfig, importConfig, resetToDefaults } from '../configStore'
import { useRef, useState } from 'react'

// Inside Controls component:
const fileInputRef = useRef<HTMLInputElement>(null)
const [importError, setImportError] = useState<string | null>(null)

// In the Global <section>, after polyphony slider:
<div className="flex gap-2 mt-1">
  <button
    onClick={() => exportConfig(params)}
    aria-label="Export configuration as JSON file"
    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 hover:border-zinc-500"
  >
    export config
  </button>
  <button
    onClick={() => fileInputRef.current?.click()}
    aria-label="Import configuration from JSON file"
    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 hover:border-zinc-500"
  >
    import config
  </button>
  <button
    onClick={() => { setImportError(null); onChange(resetToDefaults()) }}
    aria-label="Reset all parameters to defaults"
    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 hover:border-zinc-500"
  >
    reset
  </button>
</div>
<input
  ref={fileInputRef}
  type="file"
  accept=".json"
  tabIndex={-1}
  aria-hidden="true"
  className="hidden"
  onChange={async e => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const imported = await importConfig(file)
      setImportError(null)
      onChange(imported)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
    }
  }}
/>
{importError && (
  <p className="text-xs font-mono text-red-400 mt-1">{importError}</p>
)}
```

---

## Step 5 — Verify

Run `npm run dev` and confirm:

1. Set non-default parameters → reload page → parameters restored ✅
2. Click "export config" → `singling-lab-config.json` downloads ✅
3. Open the file in a text editor → JSON is readable, parameter names recognisable ✅
4. Reset to defaults → reload page → defaults shown (not previous state) ✅
5. Import a previously exported file → all parameters restored to exported values ✅
6. Import a random JSON file → error message displayed, state unchanged ✅
7. Tab through Export / Import / Reset buttons → all reachable by keyboard ✅
8. `npm run build` passes with zero TypeScript errors ✅

---

## Files changed

| File | Change type |
|---|---|
| `src/types.ts` | Edit — add `ConfigFile` interface, `CONFIG_VERSION` constant |
| `src/configStore.ts` | Create — all persistence logic |
| `src/App.tsx` | Edit — lazy init from storage, wrap onChange with auto-save |
| `src/components/Controls.tsx` | Edit — import controls in Global section |
