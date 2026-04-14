# Module Interface Contracts: Configuration Persistence & Portability

**Branch**: `004-config-persist` | **Date**: 2026-04-14

New and changed contracts only. Baseline: `specs/001-core-instrument/contracts/module-interfaces.md`.

---

## `configStore.ts` — NEW MODULE

All functions are pure or have well-defined side effects. No async operations except
`importConfig` (FileReader is event-driven; wrapped in a Promise).

---

### `exportConfig(params: AppParams): void`

Triggers a browser download of the current `AppParams` as a JSON file.

| Argument | Type | Constraints |
|---|---|---|
| `params` | AppParams | Current validated application state |

**Side effects**:
- Creates a `Blob` with JSON content
- Creates a temporary object URL
- Programmatically clicks a hidden anchor element with `download="singling-lab-config.json"`
- Revokes the object URL immediately after click
- No state change; no async operations visible to the caller

**Guarantees**:
- Always produces a valid `ConfigFile` JSON structure
- The downloaded file always passes `validateConfig()` when re-imported
- Does not throw; browser download failures are silently ignored (browser handles them)

---

### `importConfig(file: File): Promise<AppParams>`

Reads and validates an uploaded file. Returns the validated `AppParams` on success,
or rejects with a descriptive `Error` on failure.

| Argument | Type | Constraints |
|---|---|---|
| `file` | File | Any File object from a file input element |

**Returns**: `Promise<AppParams>`
- Resolves with fully validated `AppParams` (all ranges clamped, all fields present)
- Rejects with `Error` whose `.message` is user-displayable if:
  - File cannot be read
  - Content is not valid JSON
  - `app` field is not `"singling-lab"`
  - `params` field is missing or not an object

**Guarantees**:
- The resolved `AppParams` has passed both `validateConfig()` and the existing
  `validateLevelParams()` / `validateAppParams()` validators
- Never mutates application state directly; caller applies the returned value
- Missing `params` fields fall back to `DEFAULT_PARAMS` values (partial imports are valid)

---

### `saveToStorage(params: AppParams): void`

Writes `AppParams` to `localStorage` under the key `singling-lab:params`.

| Argument | Type | Constraints |
|---|---|---|
| `params` | AppParams | Current validated application state |

**Side effects**: Writes to `localStorage`. Silently no-ops if storage is unavailable
(e.g., private/incognito mode, quota exceeded).

**Guarantees**:
- Never throws (all errors are caught internally)
- Writes only the `AppParams` object, not the `ConfigFile` wrapper

---

### `loadFromStorage(): AppParams | null`

Reads and validates `AppParams` from `localStorage`.

**Returns**: Validated `AppParams`, or `null` if no valid stored state exists.

- Returns `null` if the key is absent, the value is not valid JSON, or structural
  validation fails
- If present and structurally valid, passes through `validateAppParams()` and
  `validateLevelParams()` before returning
- Missing individual fields fall back to `DEFAULT_PARAMS` values

**Guarantees**:
- Never throws
- Synchronous (localStorage is synchronous)
- A non-null return value is always safe to use as `AppParams` initial state

---

### `validateConfig(raw: unknown): AppParams | null`

Structural validator for a parsed `ConfigFile` object. Returns the extracted `AppParams`
(with defaults applied for missing fields) or `null` if the structure is fundamentally invalid.

| Argument | Type | Constraints |
|---|---|---|
| `raw` | unknown | Any value (typically a `JSON.parse` result) |

**Returns**: `AppParams | null`
- `null` if `raw` is not an object, `raw.app !== "singling-lab"`, or `raw.params` is
  missing/not an object
- Otherwise: a fully-formed `AppParams` built from `raw.params`, with missing fields
  filled from `DEFAULT_PARAMS`; all values clamped via existing validators

**Guarantees**:
- Pure function; no side effects
- Never throws
- A non-null return has passed `validateAppParams()` and per-level `validateLevelParams()`

---

### `resetToDefaults(): AppParams`

Returns `DEFAULT_PARAMS` and clears `localStorage["singling-lab:params"]`.

**Returns**: `DEFAULT_PARAMS` (a fresh copy, not a reference).

**Side effects**: Removes the `singling-lab:params` key from `localStorage`.

**Guarantees**:
- Never throws
- Caller applies the returned value as the new application state

---

## `types.ts` — CHANGES

### New type: `ConfigFile`

```typescript
interface ConfigFile {
  version: string       // "1"
  app: "singling-lab"
  exported: string      // ISO 8601 timestamp
  params: AppParams
}
```

### New constant: `CONFIG_VERSION`

```typescript
const CONFIG_VERSION = "1"
```

### Unchanged: `AppParams`, `DEFAULT_PARAMS`, validators

No changes to existing types or validation functions.

---

## `App.tsx` — CHANGES

### Initialisation

On component mount, before rendering:
```
const stored = loadFromStorage()
const initialParams = stored ?? DEFAULT_PARAMS
```
`useState(initialParams)` replaces `useState(DEFAULT_PARAMS)`.

### Auto-save on change

The `onChange` handler (passed to `Controls`) is wrapped to call `saveToStorage(params)`
after every state update. No additional debounce — `localStorage` writes are synchronous
and fast enough for this payload size (<5KB).

---

## `components/Controls.tsx` — CHANGES

### New controls in Global section

Three new controls added below the existing polyphony slider:

1. **Export button** — labelled "export config"; calls `exportConfig(params)` on click;
   keyboard-accessible; `aria-label="Export configuration as JSON file"`
2. **Import button + hidden file input** — visible button labelled "import config";
   triggers hidden `<input type="file" accept=".json">` on click; on file selection,
   calls `importConfig(file)`, then calls `onChange` with the result; displays an
   error message inline if import fails; `aria-label="Import configuration from JSON file"`
3. **Reset button** — labelled "reset defaults"; calls `resetToDefaults()`, then calls
   `onChange` with the returned `DEFAULT_PARAMS`; `aria-label="Reset all parameters to defaults"`

**Error display**: A single `<p>` element below the controls shows the most recent import
error message (if any). Cleared on the next successful import or reset.

**No new props**: Uses existing `params: AppParams` and `onChange: (p: AppParams) => void`.

---

## Accessibility contract

All three new controls MUST:
- Be reachable via Tab key in logical order (Export → Import → Reset)
- Have visible focus indicators (consistent with existing controls)
- Have descriptive `aria-label` attributes
- Not rely on colour alone to convey state

The hidden file input MUST have `tabIndex={-1}` and `aria-hidden="true"` so screen readers
target only the visible trigger button.
