# Tasks: Configuration Persistence & Portability

**Input**: Design documents from `specs/004-config-persist/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not requested — manual functional verification only (per existing project convention).

**Organization**: Tasks grouped by user story.
- US1 (P1): File export/import — the core research use case.
- US2 (P2): Cross-user portability verification — no new code; same implementation.
- US3 (P3): Auto-persistence across page reloads — App.tsx lazy init + auto-save wiring.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Type System)

**Purpose**: Add the `ConfigFile` type and `CONFIG_VERSION` constant to the type system
before any new source files are written. All downstream tasks depend on these being in place.

- [x] T001 Add `ConfigFile` interface to `src/types.ts` (fields: `version: string`, `app: "singling-lab"`, `exported: string`, `params: AppParams`)
- [x] T002 Add `export const CONFIG_VERSION = "1"` to `src/types.ts`

**Checkpoint**: `npm run build` passes before proceeding.

---

## Phase 2: Foundational (Core `configStore.ts` Module)

**Purpose**: Create `src/configStore.ts` with all persistence logic. This module is required
by both US1 (file export/import) and US3 (localStorage). No UI is affected yet.

**⚠️ CRITICAL**: US1 and US3 cannot begin until this phase is complete.

- [x] T003 Create `src/configStore.ts` with imports: `import type { AppParams, ConfigFile } from './types'` and `import { DEFAULT_PARAMS, CONFIG_VERSION, validateAppParams, validateLevelParams } from './types'`; define `const STORAGE_KEY = 'singling-lab:params'` and `const PARSE_LEVELS` array
- [x] T004 Implement `validateConfig(raw: unknown): AppParams | null` in `src/configStore.ts` — checks `raw.app === 'singling-lab'`, `raw.params` is an object, rebuilds each `LevelParams` field with fallback to `DEFAULT_PARAMS`, calls `validateLevelParams()` per level and `validateAppParams()` on the result (per contracts/module-interfaces.md)
- [x] T005 [P] Implement `saveToStorage(params: AppParams): void` in `src/configStore.ts` — wraps `localStorage.setItem(STORAGE_KEY, JSON.stringify(params))` in try/catch; never throws
- [x] T006 [P] Implement `loadFromStorage(): AppParams | null` in `src/configStore.ts` — reads `localStorage.getItem(STORAGE_KEY)`, parses JSON, calls `validateConfig` with a `singling-lab` wrapper, returns `null` on any failure; never throws
- [x] T007 [P] Implement `resetToDefaults(): AppParams` in `src/configStore.ts` — calls `localStorage.removeItem(STORAGE_KEY)` in try/catch, returns `{ ...DEFAULT_PARAMS }`

**Checkpoint**: `npm run build` passes. Module is importable. No UI changes yet.

---

## Phase 3: User Story 1 — Save and Reload a Configuration (Priority: P1) 🎯 MVP

**Goal**: The user can download the current parameter state as a JSON file ("export config")
and restore any previously exported file ("import config"). The exported file can be opened
in a text editor and all parameter names are recognisable.

**Independent Test**: Export config → open file in text editor → confirm readable JSON with
recognisable field names. Then: reload page (returns to defaults) → import the exported file
→ confirm all parameter values match the exported state. No audio playback required.

### Implementation for User Story 1

- [x] T008 [US1] Implement `exportConfig(params: AppParams): void` in `src/configStore.ts` — builds `ConfigFile` object with `CONFIG_VERSION`, `'singling-lab'`, `new Date().toISOString()`, and `params`; creates `Blob` with `JSON.stringify(file, null, 2)`; creates object URL; creates hidden `<a download="singling-lab-config.json">`; clicks it; revokes URL (per research.md Decision 3 and contracts/module-interfaces.md)
- [x] T009 [US1] Implement `importConfig(file: File): Promise<AppParams>` in `src/configStore.ts` — wraps `FileReader.readAsText()` in a `Promise`; on load: `JSON.parse` → `validateConfig` → resolve with params or reject with user-displayable `Error`; on FileReader error: reject with `'Could not read file.'` (per research.md Decision 4 and contracts/module-interfaces.md)
- [x] T010 [US1] In `src/components/Controls.tsx`: add `import { exportConfig, importConfig, resetToDefaults } from '../configStore'`; add `import { useRef, useState } from 'react'`
- [x] T011 [US1] In `src/components/Controls.tsx` Global section (after polyphony slider): add `fileInputRef = useRef<HTMLInputElement>(null)` and `importError` state; add the three-button row (export config / import config / reset) with classes matching existing button style; add hidden `<input type="file" accept=".json" ref={fileInputRef} tabIndex={-1} aria-hidden="true">`; add inline error display `<p>` for import failures (per contracts/module-interfaces.md)
- [x] T012 [US1] Wire the Controls buttons: export button calls `exportConfig(params)`; import button calls `fileInputRef.current?.click()`; file input `onChange` calls `importConfig(file)` then `onChange(imported)` on success or sets `importError` on failure; reset button calls `onChange(resetToDefaults())` and clears error state

**Checkpoint**: User Story 1 fully functional.
- Export → readable JSON file with `version`, `app`, `exported`, `params` fields ✅
- Import file → all parameters restored to exported values ✅
- Import random JSON → error message shown; state unchanged ✅
- Import malformed file → error message shown; state unchanged ✅
- `npm run build` passes ✅

---

## Phase 4: User Story 2 — Share Configuration with Another User (Priority: P2)

**Goal**: A configuration file exported by one user can be imported by a different user in a
separate browser session and produce identical playback output.

**Independent Test**: Export config → open an incognito/private window → import the same
file → confirm parameter values match exactly → play the same text → confirm audibly
identical output.

**⚠️ No new code required.** The Phase 3 implementation satisfies all US2 requirements.
The `ConfigFile` format uses no user-specific identifiers (FR-006). The human-readable JSON
with recognisable field names satisfies FR-005. These tasks are verification only.

### Verification for User Story 2

- [ ] T013 [US2] Manual verification: open exported `singling-lab-config.json` in a text editor; confirm `version`, `app`, `exported`, `params` keys visible; confirm nested field names (`parseLevel`, `instrument`, `tempo`, `polyphony`, `semantic`, `levels`) are recognisable without documentation
- [ ] T014 [US2] Manual verification: export config from the main window; open an incognito/private browser window; navigate to `http://localhost:5173`; import the same file; confirm all parameter values match the original session exactly

**Checkpoint**: User Story 2 verified — configuration files are portable across users and sessions.

---

## Phase 5: User Story 3 — Persist Configuration Across Page Reloads (Priority: P3)

**Goal**: The user's most recently used parameter state is automatically restored on page
load without any action from the user.

**Independent Test**: Set non-default parameters → reload the page → confirm the parameter
values are restored without importing a file. Also: reset to defaults → reload → confirm
default values are shown (not the previous non-default state).

### Implementation for User Story 3

- [x] T015 [US3] In `src/App.tsx`: replace `useState(DEFAULT_PARAMS)` with lazy initialiser `useState<AppParams>(() => loadFromStorage() ?? DEFAULT_PARAMS)`; add import for `loadFromStorage` and `saveToStorage` from `'./configStore'`
- [x] T016 [US3] In `src/App.tsx`: wrap the existing `onChange` handler passed to `<Controls>` to call `saveToStorage(p)` after `setParams(p)` — every parameter change now auto-saves to `localStorage`

**Checkpoint**: User Story 3 fully functional.
- Set non-default values → reload page → values restored ✅
- Click "reset" → reload page → default values shown ✅
- Open app in incognito → confirm defaults shown (no stored state) ✅
- `npm run build` passes ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 [P] Final `npm run build` confirming zero TypeScript errors and clean Vite production bundle
- [ ] T018 Run quickstart.md Step 5 verification checklist in full: all 8 verification items must pass
- [ ] T019 [P] Verify keyboard accessibility: Tab through Export → Import → Reset buttons confirming each receives visible focus; confirm hidden file input is not in tab order (`tabIndex={-1}`)
- [ ] T020 [P] Confirm `aria-label` attributes are present on all three buttons (inspect with browser DevTools → Accessibility panel)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist before configStore can import them); BLOCKS US1 and US3
- **US1 (Phase 3)**: Depends on Phase 2 (configStore must exist); no dependency on US2 or US3
- **US2 (Phase 4)**: Depends on Phase 3 (verification of same implementation); no code
- **US3 (Phase 5)**: Depends on Phase 2 (loadFromStorage/saveToStorage) and partially on Phase 3 (Controls reset button calls resetToDefaults, which clears storage)
- **Polish (Phase 6)**: Depends on all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2. Independent of US2 and US3.
- **US2 (P2)**: Depends on US1 implementation. Verification only; no code.
- **US3 (P3)**: Depends on Phase 2. Can be developed in parallel with US1 after Phase 2.

### Within Each Phase

- T003 must complete before T004–T007 (T004–T007 add functions to the file created in T003)
- T004–T007 can be written in parallel (each is a separate function in `configStore.ts`)
- T008–T009 can be written in parallel (both add functions to `configStore.ts`, no dependency between them)
- T010 → T011 → T012 must be sequential (each builds on the previous import in Controls.tsx)
- T015 → T016 must be sequential (T016 wraps the handler that T015 establishes)

### Parallel Opportunities

- T005, T006, T007 (Phase 2) — three independent functions in `configStore.ts`
- T008, T009 (Phase 3) — two more independent functions in `configStore.ts`
- T013, T014 (Phase 4) — two independent manual verification scenarios
- T017, T019, T020 (Phase 6) — build check and accessibility checks are independent

---

## Parallel Example: Phase 2

```text
# Once T003 (module skeleton) is written:
Task: "Implement validateConfig() in src/configStore.ts"      ← T004
Task: "Implement saveToStorage() in src/configStore.ts"      ← T005
Task: "Implement loadFromStorage() in src/configStore.ts"    ← T006
Task: "Implement resetToDefaults() in src/configStore.ts"    ← T007
# All four are independent functions; can be written simultaneously
```

```text
# Once T007 (resetToDefaults) is written, Phase 3 can add:
Task: "Implement exportConfig() in src/configStore.ts"       ← T008
Task: "Implement importConfig() in src/configStore.ts"       ← T009
# Independent of each other; both depend only on Phase 2 completion
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: Add types (T001–T002) — ~5 min
2. Phase 2: Create `configStore.ts` with validateConfig + storage functions (T003–T007) — ~20 min
3. Phase 3: Add exportConfig + importConfig + Controls UI (T008–T012) — ~20 min
4. **STOP and VALIDATE**: Export a config, open in text editor, reload page, import it back — confirm SC-001 and SC-002
5. **MVP is done** — researchers can share and restore configurations via file

### Incremental Delivery

1. Phase 1 + 2 → core module ready (no visible UI change yet)
2. Phase 3 → Export/Import/Reset controls visible (US1 complete)
3. Phase 4 → Cross-session portability verified (US2 confirmed, no code)
4. Phase 5 → Auto-persistence on reload (US3 complete)
5. Phase 6 → Build + accessibility sign-off

### Notes

- Total implementation tasks: 10 (T001–T002, T003–T009, T015–T016)
- Total verification tasks: 6 (T013–T014, T017–T020)
- **No new npm dependencies** — all persistence uses native browser APIs
- `configStore.ts` functions **never throw** — all errors are caught internally or returned as rejected Promises
- The `validateConfig()` function is the critical correctness gate — all imported and loaded state passes through it before touching `AppParams`
- Commit naturally after Phase 2 (module created) and after Phase 3 (UI wired); US3 is a small App.tsx change that can be committed separately
