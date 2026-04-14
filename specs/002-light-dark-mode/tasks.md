# Tasks: Light/Dark Mode Toggle

**Input**: Design documents from `specs/002-light-dark-mode/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅

**Tests**: Not requested — manual functional verification only.

---

## Phase 1: Tailwind Configuration

**Purpose**: Enable class-based dark mode so `dark:` utilities work.

- [x] T001 Check existing Tailwind config (vite.config.ts, tailwind.config.*, or CSS imports) and configure `darkMode: 'class'` appropriately for Tailwind v4

**Checkpoint**: After T001, `dark:` class utilities must activate when `dark` class is present on `<html>`.

---

## Phase 2: Flash Prevention

**Purpose**: Prevent white flash on reload when dark theme is stored.

- [x] T002 In `index.html`, add an inline `<script>` inside `<head>` (before any stylesheets) that reads `localStorage.getItem('singling-lab:theme')` and adds `dark` class to `document.documentElement` if stored value is not `'light'`

**Checkpoint**: After T002, reloading the page with dark preference stored shows dark immediately.

---

## Phase 3: Theme Store

**Purpose**: Encapsulate all localStorage theme logic in one module.

- [x] T003 Create `src/themeStore.ts` with:
  - `const THEME_KEY = 'singling-lab:theme'`
  - `type Theme = 'dark' | 'light'`
  - `export function getStoredTheme(): Theme` — reads localStorage, returns `'dark'` if absent or invalid
  - `export function applyTheme(theme: Theme): void` — adds/removes `dark` class on `document.documentElement`; writes to localStorage in try/catch (silent on failure)
  - `export function getInitialTheme(): Theme` — reads current class from `document.documentElement` (set by inline script) to avoid double-reading localStorage

**Checkpoint**: Module is importable and type-checks.

---

## Phase 4: App Integration

**Purpose**: Wire theme state into App.tsx, add toggle button to header.

- [x] T004 In `src/App.tsx`: import `getInitialTheme`, `applyTheme` from `./themeStore`; add `const [theme, setTheme] = useState<Theme>(() => getInitialTheme())`; add `toggleTheme` callback that calls `applyTheme` with flipped value and updates state
- [x] T005 In `src/App.tsx` header: add theme toggle button to the right of the title — renders ☀ when dark (click → light), ☾ when light (click → dark); include `aria-label="Switch to light mode"` / `"Switch to dark mode"` and appropriate classes
- [x] T006 In `src/App.tsx`: replace hardcoded dark-only Tailwind classes with dual-theme variants per the color mapping in plan.md — page background, header, left panel, textarea, play button, stop button, active unit display

**Checkpoint**: Theme toggle works visually in the App shell; Controls panel not yet re-themed.

---

## Phase 5: Controls Panel Re-theme

**Purpose**: Apply dual-theme classes to all Controls.tsx elements.

- [x] T007 In `src/components/Controls.tsx`: re-theme the outer container, section headings, Slider labels and inputs, select dropdowns, checkbox labels, button row (export/import/reset), details/summary (LevelEditor), and import error paragraph — using light defaults + `dark:` variants per plan.md color mapping

**Checkpoint**: All controls look correct in both themes.

---

## Phase 6: Validation

- [x] T008 Run `npm run build` — zero TypeScript errors, clean Vite production bundle
- [ ] T009 Manual verification: toggle to light → all surfaces light; toggle to dark → original dark zinc look; reload after each → preference restored; incognito → dark default
- [ ] T010 Verify `aria-label` on toggle button changes to reflect the action; verify Tab key reaches the toggle button

---

## Dependencies

- T001 must complete before T002, T003 (Tailwind must be configured for dark: utilities to work)
- T002 and T003 can run in parallel after T001
- T004, T005, T006 are sequential (each builds on the previous state of App.tsx)
- T007 is independent of T004–T006 (different file)
- T008–T010 depend on all implementation tasks being complete

---

## Implementation Strategy

**MVP**: T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008
This delivers the complete feature in a single linear pass.
