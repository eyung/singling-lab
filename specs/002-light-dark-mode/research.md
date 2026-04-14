# Research: Light/Dark Mode Toggle

**Feature**: 002-light-dark-mode
**Date**: 2026-04-13

---

## Decision 1: Tailwind Dark Mode Strategy

**Decision**: Use the `class` strategy — add/remove a `dark` class on `<html>` element.

**Rationale**: The `media` strategy (OS-level) was explicitly out-of-scope per the spec. The `class` strategy gives full programmatic control: JavaScript adds `dark` to `document.documentElement.classList` and Tailwind's `dark:` variant utilities apply immediately.

**Alternatives considered**:
- `media` strategy: follows OS preference automatically but cannot be manually overridden — rejected
- CSS custom properties: more flexible but requires maintaining a separate design token system — overkill for two themes

**Implementation**: In `tailwind.config.js` (or `tailwind.config.ts`), set `darkMode: 'class'`.

---

## Decision 2: Theme Persistence

**Decision**: Use a dedicated `localStorage` key `singling-lab:theme` storing `'dark' | 'light'`.

**Rationale**: Keeping theme preference separate from `AppParams` means config export/import doesn't carry theme state (per FR-009). The existing `configStore.ts` pattern (try/catch, silent failures) is reused for consistency.

**Alternatives considered**:
- Include `theme` in `AppParams`: simpler code path but violates FR-009 and pollutes audio config files
- Cookie storage: no benefit over localStorage for a client-only SPA; adds complexity

---

## Decision 3: Flash of Incorrect Theme (FOIT) Prevention

**Decision**: Apply the stored theme class via an inline `<script>` in `index.html` before React hydrates.

**Rationale**: If theme is applied only in React's `useEffect`, there is a brief flash of the default theme on reload. An inline script that runs synchronously before body paint eliminates this flash.

**Implementation**:
```html
<script>
  (function() {
    var t = localStorage.getItem('singling-lab:theme');
    if (t === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  })();
</script>
```

Wait — the existing app uses dark by default. So `dark` class strategy:
- Default (no class): light theme → not what we want
- Inverse: default dark, add `light` class for light mode

**Revised approach**: Use a `data-theme` attribute or use the `class` strategy with `dark` as the opt-in:
- No class on `<html>` → light mode (Tailwind default)
- `dark` class on `<html>` → dark mode

Since the app defaults to dark, the inline script adds `dark` by default and removes it only when `'light'` is stored. This aligns with standard Tailwind dark mode class strategy.

**Inline script** (in `<head>` of `index.html`):
```html
<script>
  (function(){
    var t=localStorage.getItem('singling-lab:theme');
    if(t!=='light') document.documentElement.classList.add('dark');
  })();
</script>
```

---

## Decision 4: Light Theme Palette

**Decision**: Use zinc color scale — light surfaces on zinc-50/white, text on zinc-800/zinc-900, borders on zinc-300.

**Rationale**: Zinc is already the project's design language (dark theme uses zinc-950/zinc-100). Using the same scale for both themes maintains visual coherence. The light end of zinc provides warm-neutral grays rather than harsh pure white.

**Light theme palette**:
- Page background: `white` / `zinc-50`
- Header/panel backgrounds: `zinc-100`
- Text primary: `zinc-900`
- Text secondary: `zinc-600`
- Borders: `zinc-300`
- Input backgrounds: `white`
- Button backgrounds: `zinc-200`
- Button hover: `zinc-300`
- Accent (active): `zinc-800` (text) / `zinc-900` (background)

---

## Decision 5: Toggle UI

**Decision**: A small icon button in the header — sun icon for light mode, moon icon for dark mode — with text fallback.

**Rationale**: Icon buttons are standard for theme toggles; the icon represents the current state or the action (convention: show the "switch to" icon). Text fallback satisfies accessibility without needing an icon library.

**Implementation**: Inline SVG or Unicode symbols (☀ / ☾) to avoid any new package dependency. An `aria-label` provides the accessible name.

---

## Constitution Check

| Principle | Status |
|-----------|--------|
| I: Oscillator-only synthesis | N/A (UI only) |
| II: In-browser NLP | N/A |
| III: No audio libraries | N/A |
| IV: Preserve parameter relationships | N/A |
| V: Semantic-first mapping | N/A |
| VI: Validated parameter ranges | N/A |
| VII: Playback resilience | N/A |
| VIII: Zero new npm packages | PASS — Tailwind class strategy uses existing Tailwind setup |
| IX: Reduce ambiguity | PASS — two themes only, no system detection, manual only |
| X: Persist & Portability | PASS — persisted in dedicated localStorage key; NOT in config file |
| XI: Accessibility First | PASS — aria-label on toggle, keyboard navigable, WCAG AA contrast |
