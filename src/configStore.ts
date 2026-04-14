import type { AppParams, ConfigFile } from './types'
import { DEFAULT_PARAMS, CONFIG_VERSION, validateAppParams, validateLevelParams } from './types'

const STORAGE_KEY = 'singling-lab:params'
const PARSE_LEVELS = ['letter', 'word', 'phrase', 'sentence', 'paragraph'] as const
const WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square']
const LEVEL_VALUES = new Set(PARSE_LEVELS)

// ── Validation ────────────────────────────────────────────────────────────────

export function validateConfig(raw: unknown): AppParams | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r['app'] !== 'singling-lab') return null
  if (typeof r['params'] !== 'object' || r['params'] === null) return null

  const p = r['params'] as Record<string, unknown>
  const d = DEFAULT_PARAMS

  const parseLevel = LEVEL_VALUES.has(p['parseLevel'] as never)
    ? (p['parseLevel'] as AppParams['parseLevel'])
    : d.parseLevel

  const sem = (typeof p['semantic'] === 'object' && p['semantic'] !== null)
    ? p['semantic'] as Record<string, unknown>
    : {}
  const semantic: AppParams['semantic'] = {
    sentimentToPitch:     typeof sem['sentimentToPitch'] === 'boolean' ? sem['sentimentToPitch'] : d.semantic.sentimentToPitch,
    energyToFilterCutoff: typeof sem['energyToFilterCutoff'] === 'boolean' ? sem['energyToFilterCutoff'] : d.semantic.energyToFilterCutoff,
    energyToTempo:        typeof sem['energyToTempo'] === 'boolean' ? sem['energyToTempo'] : d.semantic.energyToTempo,
  }

  const levelsRaw = (typeof p['levels'] === 'object' && p['levels'] !== null)
    ? p['levels'] as Record<string, unknown>
    : {}

  const levels = Object.fromEntries(
    PARSE_LEVELS.map(level => {
      const l = (typeof levelsRaw[level] === 'object' && levelsRaw[level] !== null)
        ? levelsRaw[level] as Record<string, unknown>
        : {}
      const def = d.levels[level]
      return [level, validateLevelParams({
        enabled:     typeof l['enabled'] === 'boolean' ? l['enabled'] : def.enabled,
        pitchMin:    typeof l['pitchMin'] === 'number' ? l['pitchMin'] : def.pitchMin,
        pitchMax:    typeof l['pitchMax'] === 'number' ? l['pitchMax'] : def.pitchMax,
        durationMin: typeof l['durationMin'] === 'number' ? l['durationMin'] : def.durationMin,
        durationMax: typeof l['durationMax'] === 'number' ? l['durationMax'] : def.durationMax,
        attack:      typeof l['attack'] === 'number' ? l['attack'] : def.attack,
        release:     typeof l['release'] === 'number' ? l['release'] : def.release,
        waveform:    WAVEFORMS.includes(l['waveform'] as OscillatorType)
                       ? (l['waveform'] as OscillatorType) : def.waveform,
        filterCutoff: typeof l['filterCutoff'] === 'number' ? l['filterCutoff'] : def.filterCutoff,
        filterQ:     typeof l['filterQ'] === 'number' ? l['filterQ'] : def.filterQ,
        gain:        typeof l['gain'] === 'number' ? l['gain'] : def.gain,
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {
    // silent — storage may be unavailable in private/incognito mode
  }
}

export function loadFromStorage(): AppParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    // Wrap in ConfigFile envelope so validateConfig can check the app sentinel
    return validateConfig({ app: 'singling-lab', params: parsed })
  } catch {
    return null
  }
}

export function resetToDefaults(): AppParams {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // silent
  }
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
        const raw = JSON.parse(reader.result as string) as unknown
        const params = validateConfig(raw)
        if (!params) {
          reject(new Error('Not a valid singling-lab configuration file.'))
        } else {
          resolve(params)
        }
      } catch {
        reject(new Error('File is not valid JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}
