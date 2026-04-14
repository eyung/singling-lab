# Data Model: Configuration Persistence & Portability

**Branch**: `004-config-persist` | **Date**: 2026-04-14

Covers only additions and changes introduced by this feature. Baseline model:
`specs/001-core-instrument/data-model.md`.

---

## New Entity: ConfigFile

The structure of an exported configuration file. Written to disk on export;
read from disk on import. Never stored in application state — it is a serialisation
envelope around `AppParams`.

| Field | Type | Constraints |
|---|---|---|
| `version` | string | Non-empty; current value `"1"` |
| `app` | string | Must equal `"singling-lab"` exactly |
| `exported` | string | ISO 8601 timestamp; informational only |
| `params` | AppParams | Full `AppParams` object (see baseline model) |

**Validation on import**:
- `app !== "singling-lab"` → reject entire file
- `version` unrecognised → warn, attempt import with fallback
- `params` missing or not an object → reject entire file
- Individual `params` fields missing or wrong type → fall back to `DEFAULT_PARAMS` values
- All numeric ranges clamped via existing `validateLevelParams()` / `validateAppParams()`

**Read-only after export**: The exported file is a snapshot; the app does not track or update
it after download.

---

## New Entity: StoredParams

The structure written to browser `localStorage`. A subset of `ConfigFile` — no metadata
wrapper, just the raw `AppParams`.

| Storage key | Value type | Notes |
|---|---|---|
| `singling-lab:params` | `AppParams` JSON string | Written on every parameter change; read once on init |

**Validation on read** (same rules as ConfigFile.params):
- Not valid JSON → ignore; use `DEFAULT_PARAMS`
- Valid JSON but fails structural check → ignore; use `DEFAULT_PARAMS`
- Valid JSON passes check → pass through `validateAppParams()` and per-level `validateLevelParams()`

**Lifetime**: Persists until the user explicitly resets to defaults (which clears the key)
or clears their browser storage manually.

---

## New Constant: CONFIG_VERSION

```
CONFIG_VERSION = "1"
```

Used as the `version` field in `ConfigFile`. Incremented (as a string) only on breaking
schema changes. Defined in `types.ts` alongside `AppParams`.

---

## Modified Entity: AppParams

No fields are added to `AppParams` at runtime. The `instrument` field (added in feature
003) is included in the export and import schema.

All five `LevelParams` entries (one per `ParseLevel`) are included in the export. The
`instrument` string, `polyphony`, `tempo`, `parseLevel`, and `semantic` flags are all
included.

---

## Relationships

```
AppParams (runtime state in React)
  │
  ├──[on every onChange]──► StoredParams (localStorage: "singling-lab:params")
  │
  └──[on export trigger]──► ConfigFile (downloaded .json file)
                                └── params: AppParams (full snapshot)

On page load:
  StoredParams ──[if present & valid]──► AppParams (initial state)
  DEFAULT_PARAMS ──[if absent/invalid]──► AppParams (initial state)

On import:
  ConfigFile (uploaded .json) ──[validate]──► AppParams (replaces current state)
                                         └──► StoredParams (auto-saved after apply)
```

---

## State Transitions

```
App initialisation:
  → read localStorage["singling-lab:params"]
  → if present & valid: initialState = validated parsed params
  → if absent/invalid:  initialState = DEFAULT_PARAMS

Parameter change (any control):
  → update AppParams in React state
  → write AppParams to localStorage["singling-lab:params"] (silent fail allowed)

Export action:
  → snapshot current AppParams
  → wrap in ConfigFile envelope with current timestamp
  → serialise to JSON
  → trigger Blob download as "singling-lab-config.json"
  → no state change

Import action:
  → user selects .json file via file input
  → FileReader reads file as text
  → JSON.parse → validateConfig()
  → if invalid: show error message; no state change
  → if valid: apply validated AppParams to React state → triggers auto-save to localStorage

Reset action:
  → set React state to DEFAULT_PARAMS
  → clear localStorage["singling-lab:params"]
  → UI reflects default values immediately
```
