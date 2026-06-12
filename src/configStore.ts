import type { AppParams, ConfigFile, KeywordRule, ScaleMode } from './types'
import {
  DEFAULT_PARAMS, CONFIG_VERSION, validateAppParams, validateLevelParams,
  validateLayeredLevelConfig, LAYERED_LEVELS, SCALE_MODES, SEMANTIC_CATEGORIES,
} from './types'

const STORAGE_KEY = 'singling-lab:params'
const PARSE_LEVELS = ['letter', 'word', 'phrase', 'sentence', 'paragraph'] as const
const WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square']
const LEVEL_VALUES = new Set(PARSE_LEVELS)

// ── Validation ────────────────────────────────────────────────────────────────

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

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

  const sem = obj(p['semantic'])
  const semantic: AppParams['semantic'] = {
    sentimentToPitch:     bool(sem['sentimentToPitch'], d.semantic.sentimentToPitch),
    energyToFilterCutoff: bool(sem['energyToFilterCutoff'], d.semantic.energyToFilterCutoff),
    energyToTempo:        bool(sem['energyToTempo'], d.semantic.energyToTempo),
    wordLengthToDuration: bool(sem['wordLengthToDuration'], d.semantic.wordLengthToDuration),
    modalStrengthToPitch: bool(sem['modalStrengthToPitch'], d.semantic.modalStrengthToPitch),
    frequencyTierToGain:  bool(sem['frequencyTierToGain'], d.semantic.frequencyTierToGain),
    categoryToCharacter:  bool(sem['categoryToCharacter'], d.semantic.categoryToCharacter),
    punctuationSounds:    bool(sem['punctuationSounds'], d.semantic.punctuationSounds),
    sentenceContour:      bool(sem['sentenceContour'], d.semantic.sentenceContour),
  }

  const levelsRaw = obj(p['levels'])
  const levels = Object.fromEntries(
    PARSE_LEVELS.map(level => {
      const l = obj(levelsRaw[level])
      const def = d.levels[level]
      return [level, validateLevelParams({
        enabled:      bool(l['enabled'], def.enabled),
        pitchMin:     num(l['pitchMin'], def.pitchMin),
        pitchMax:     num(l['pitchMax'], def.pitchMax),
        durationMin:  num(l['durationMin'], def.durationMin),
        durationMax:  num(l['durationMax'], def.durationMax),
        attack:       num(l['attack'], def.attack),
        release:      num(l['release'], def.release),
        waveform:     WAVEFORMS.includes(l['waveform'] as OscillatorType)
                        ? (l['waveform'] as OscillatorType) : def.waveform,
        filterCutoff: num(l['filterCutoff'], def.filterCutoff),
        filterQ:      num(l['filterQ'], def.filterQ),
        gain:         num(l['gain'], def.gain),
        rate:         num(l['rate'], def.rate),
      })]
    })
  ) as AppParams['levels']

  const mode: AppParams['mode'] = p['mode'] === 'layered' ? 'layered' : 'single'

  const layeredRaw = obj(p['layered'])
  const layered = Object.fromEntries(
    LAYERED_LEVELS.map(level => {
      const l = obj(layeredRaw[level])
      const def = d.layered[level]
      return [level, validateLayeredLevelConfig({
        soundCharacterId: typeof l['soundCharacterId'] === 'string' ? l['soundCharacterId'] : def.soundCharacterId,
        gain:    num(l['gain'], def.gain),
        enabled: bool(l['enabled'], def.enabled),
        sustainMode: (l['sustainMode'] === 'hold' || l['sustainMode'] === 'retrigger')
          ? l['sustainMode'] : def.sustainMode,
        pan: num(l['pan'], def.pan),
      })]
    })
  ) as AppParams['layered']

  const scaleRaw = obj(p['scale'])
  const scale: AppParams['scale'] = {
    quantize: bool(scaleRaw['quantize'], d.scale.quantize),
    root:     num(scaleRaw['root'], d.scale.root),
    mode:     SCALE_MODES.includes(scaleRaw['mode'] as ScaleMode)
                ? (scaleRaw['mode'] as ScaleMode) : d.scale.mode,
  }

  const keywords: KeywordRule[] = Array.isArray(p['keywords'])
    ? (p['keywords'] as unknown[]).flatMap(k => {
        const kw = obj(k)
        return typeof kw['word'] === 'string'
          ? [{
              word: kw['word'],
              soundCharacterId: typeof kw['soundCharacterId'] === 'string' ? kw['soundCharacterId'] : 'bell',
              boost: num(kw['boost'], 1),
            }]
          : []
      })
    : []

  const catRaw = obj(p['categoryMap'])
  const categoryMap: Record<string, string> = {}
  for (const cat of SEMANTIC_CATEGORIES) {
    const v = catRaw[cat]
    categoryMap[cat] = typeof v === 'string' ? v : (d.categoryMap[cat] ?? '')
  }

  return validateAppParams({
    parseLevel,
    instrument: typeof p['instrument'] === 'string' ? p['instrument'] : d.instrument,
    polyphony:  num(p['polyphony'], d.polyphony),
    tempo:      num(p['tempo'], d.tempo),
    semantic,
    levels,
    mode,
    layered,
    scale,
    keywords,
    categoryMap,
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
