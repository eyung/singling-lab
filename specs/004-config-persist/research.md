# Research: Configuration Persistence & Portability

**Branch**: `004-config-persist` | **Date**: 2026-04-14
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: Configuration File Format — JSON

**Decision**: The exported configuration file uses JSON (`.json` extension).

**Rationale**: FR-005 requires the file to be human-readable and parameter names to be
recognisable without documentation. JSON satisfies this without additional libraries:
- Human-readable and diffable in any text editor
- Natively parsed by the browser (`JSON.parse` / `JSON.stringify`)
- Parameter names map directly to `AppParams` field names
- Industry-standard format for configuration interchange
- Supports a `version` field for forward-compatibility without schema negotiation

**Alternatives considered**:
- **TOML**: More human-friendly, but requires a parser library. Violates the no-new-dependencies
  constraint and adds bundle size.
- **CSV / TSV**: Not suitable for nested structures (`levels` is a Record of Records).
- **Binary (MessagePack, CBOR)**: Not human-readable; violates FR-005.
- **XML**: Verbose, harder to diff than JSON, no advantage for this use case.

---

## Decision 2: Configuration Schema & Versioning

**Decision**: The exported file has this top-level structure:

```json
{
  "version": "1",
  "app": "singling-lab",
  "exported": "2026-04-14T10:00:00.000Z",
  "params": { /* AppParams — see data-model.md */ }
}
```

- `version`: integer string (`"1"`, `"2"`, …). Incremented only on breaking schema changes.
- `app`: Fixed sentinel value `"singling-lab"` used to reject unrelated JSON files on import.
- `exported`: ISO 8601 timestamp. Informational only; not used in state restoration.
- `params`: The full `AppParams` object as-is (matching the TypeScript type exactly).

**Forward-compatibility rules** (applied during import):
- Unknown top-level keys → silently ignored
- Unknown keys inside `params` → silently ignored
- Missing keys inside `params` → fall back to `DEFAULT_PARAMS` for that field
- `version` mismatch with a newer major version → warn user, attempt import with fallback

**Rationale**: Using `AppParams` directly as `params` keeps the schema minimal and avoids
introducing a separate serialisation model. The `app` sentinel prevents silent corruption
from importing an unrelated JSON file. The `version` field is a string (`"1"`) rather than
an integer for forward-compatibility readability.

**Alternatives considered**:
- **JSON Schema validation with ajv**: Precise but adds a library dependency. Rejected.
- **Flat structure** (no `params` wrapper): Mixes metadata and params; harder to evolve.
- **Semantic versioning** (`"1.0.0"`): Overkill for a single-team app with a simple schema.

---

## Decision 3: Export Mechanism — Blob Download

**Decision**: Export creates a `Blob` from the JSON string, generates an object URL, creates
an invisible `<a>` element with `download="singling-lab-config.json"`, triggers a click,
then immediately revokes the URL.

**Rationale**: This is the standard, dependency-free, cross-browser pattern for triggering
a file download from a web app. No server involvement. Works in Chrome, Firefox, Safari, Edge
(current versions). The object URL is immediately revoked to avoid memory leaks.

**Filename default**: `singling-lab-config.json`. Does not include a timestamp in the filename
(to avoid creating many almost-identical files); users can rename before saving.

**Alternatives considered**:
- **`navigator.msSaveBlob`**: IE11 only; not in target browsers.
- **`showSaveFilePicker` (File System Access API)**: Modern and ergonomic, but not supported
  in Firefox and requires HTTPS. Too restrictive for v1.
- **Base64 `data:` URL**: Older pattern; large files hit URL length limits in some browsers.
  Blob URL is cleaner and has no size limit.

---

## Decision 4: Import Mechanism — File Input + FileReader

**Decision**: Import uses a visually hidden `<input type="file" accept=".json">` element
triggered by a visible "Import" button. On file selection, `FileReader.readAsText()` reads
the file, then `JSON.parse()` parses it, `validateConfig()` validates the structure, and
if valid, `AppParams` is updated and saved to localStorage.

**Rationale**: `<input type="file">` is the most universally supported, accessible, and
dependency-free approach. `FileReader` is fully supported across all target browsers.
The hidden-input + trigger-button pattern is the standard accessible pattern (the visible
button is the keyboard/screen-reader target; the hidden input handles the OS file dialog).

**Error handling**:
- File is not JSON → caught by `JSON.parse` try/catch; user sees error message
- File is JSON but not a singling-lab config (`app` field missing or wrong) → rejected
- File has unknown `version` newer than current → warn, attempt import with fallback
- FileReader fails → generic error message

**Alternatives considered**:
- **Drag-and-drop**: Ergonomic but adds complexity and doesn't work for keyboard users.
  Can be added later as an enhancement.
- **`showOpenFilePicker` (File System Access API)**: Same issue as export — Firefox support
  missing.
- **Paste from clipboard**: Useful for power users but not discoverable; deferred.

---

## Decision 5: Auto-Persistence — localStorage

**Decision**: On every `AppParams` change (the existing `onChange` callback in `App.tsx`),
the full `AppParams` is serialised to localStorage under the key `singling-lab:params`.
On app initialisation, `App.tsx` reads this key; if present and valid, it replaces
`DEFAULT_PARAMS` as the initial state. If absent or invalid, `DEFAULT_PARAMS` is used.

**localStorage key**: `singling-lab:params` (namespaced to avoid collisions).  
**Stored value**: `AppParams` JSON (without the `ConfigFile` wrapper — the wrapper is only
for the exported file format).

**Rationale**: localStorage is synchronous, zero-latency, and available in all target
browsers without any setup. Storing raw `AppParams` (not the full `ConfigFile`) in localStorage
keeps the storage payload minimal and keeps the auto-save/restore path independent from the
export/import path.

**Storage failure handling**: `localStorage.setItem` may throw in private/incognito mode
or when storage is full. The save call is wrapped in a try/catch; failure is silent (does
not surface an error to the user for auto-save). Import/export continue to work regardless.

**Alternatives considered**:
- **`sessionStorage`**: Does not persist across page reloads; fails US3.
- **`IndexedDB`**: Async, more complex, overkill for a small JSON payload (<5KB).
- **`cookies`**: Size-limited (4KB), server-visible, inappropriate.
- **URL hash / query params**: Pollutes the URL; not shareable without additional copy-paste
  step.

---

## Decision 6: Validation — Manual TypeScript Type Guards

**Decision**: `validateConfig()` is a hand-written TypeScript type guard (no library).
It checks:
1. Top-level `app === 'singling-lab'`
2. `version` is a non-empty string
3. `params` is an object
4. `params.parseLevel` is one of the five valid `ParseLevel` values
5. `params.levels` is an object with entries for all five levels
6. Each level entry has the expected numeric/boolean/string fields

Fields that pass are kept; fields that fail or are missing fall back to `DEFAULT_PARAMS`.
The result is always passed through `validateAppParams()` and `validateLevelParams()` before
being applied to state, so invalid numeric ranges are clamped.

**Rationale**: A hand-written guard keeps the codebase free of validation library dependencies.
The existing `validateLevelParams()` and `validateAppParams()` functions already enforce all
numeric ranges; `validateConfig()` only needs to handle structural/type correctness.

**Alternatives considered**:
- **Zod**: Excellent library, but adds a dependency. Revisit if the schema grows complex.
- **JSON Schema + ajv**: Adds two dependencies. Overkill for a single schema.
- **No validation (trust the file)**: Violates FR-003 and could corrupt app state.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---|---|
| Configuration file format | JSON with `version`, `app`, `exported`, `params` wrapper |
| Schema versioning strategy | Integer string version; unknown keys ignored; missing keys fall back to defaults |
| Export mechanism | Blob download via hidden anchor click |
| Import mechanism | Hidden `<input type="file">` + FileReader |
| Auto-persistence storage | `localStorage` key `singling-lab:params`; raw `AppParams` JSON |
| Validation approach | Hand-written TypeScript type guard + existing validators |
| New dependencies | None |
