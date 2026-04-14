# Implementation Plan: Light/Dark Mode Toggle

**Feature**: 002-light-dark-mode
**Branch**: 002-light-dark-mode
**Date**: 2026-04-13
**Status**: Ready for task generation

---

## Technical Context

### Tech Stack
- TypeScript 5.x (strict)
- React 19, Vite 8, Tailwind CSS 4
- No new npm dependencies

### Architecture

Theme management is a thin UI layer:

1. **`index.html`** — inline `<script>` in `<head>` applies stored theme class before paint (eliminates flash)
2. **`src/themeStore.ts`** (new) — `getTheme()`, `setTheme()`, `toggleTheme()` helpers using `localStorage` key `singling-lab:theme`
3. **`src/App.tsx`** — `useTheme()` hook wraps themeStore; applies/removes `dark` class on `document.documentElement`
4. **`tailwind.config.js`** (or existing Vite/Tailwind setup) — set `darkMode: 'class'`
5. **`src/App.tsx`, `src/components/Controls.tsx`** — replace hardcoded dark zinc classes with dual-variant `dark:` / light defaults

### File Changes

| File | Change Type | Purpose |
|------|-------------|---------|
| `index.html` | Modify | Add inline flash-prevention script in `<head>` |
| `tailwind.config.js` | Modify or create | Set `darkMode: 'class'` |
| `src/themeStore.ts` | Create | Theme localStorage helpers |
| `src/App.tsx` | Modify | Theme state management, toggle button in header, apply `dark` class |
| `src/components/Controls.tsx` | Modify | Replace dark-only classes with dual-theme variants |

### Tailwind Dark Mode Configuration

Tailwind 4 uses a different config format than v3. Check existing setup:
- If `tailwind.config.js` exists: add `darkMode: 'class'`
- If using Tailwind v4's CSS-based config (`@import 'tailwindcss'`): add `@variant dark (&:where(.dark, .dark *));` or use the `dark` variant configuration

### Color Mapping

| UI Element | Light (default) | Dark (dark:) |
|------------|-----------------|--------------|
| Page bg | `bg-white` | `dark:bg-zinc-950` |
| Header bg | `bg-zinc-100` | `dark:bg-zinc-950` |
| Header border | `border-zinc-200` | `dark:border-zinc-800` |
| Primary text | `text-zinc-900` | `dark:text-zinc-100` |
| Secondary text | `text-zinc-500` | `dark:text-zinc-500` |
| Textarea bg | `bg-zinc-50` | `dark:bg-zinc-900` |
| Textarea border | `border-zinc-300` | `dark:border-zinc-700` |
| Textarea text | `text-zinc-900` | `dark:text-zinc-200` |
| Control panel bg | `bg-white` | `dark:bg-zinc-950` |
| Section heading | `text-zinc-400` | `dark:text-zinc-500` |
| Button bg | `bg-zinc-200` | `dark:bg-zinc-800` |
| Button border | `border-zinc-300` | `dark:border-zinc-700` |
| Button text | `text-zinc-700` | `dark:text-zinc-300` |
| Select bg | `bg-white` | `dark:bg-zinc-900` |
| Details border | `border-zinc-300` | `dark:border-zinc-800` |
| Play button (idle) | `bg-zinc-200 border-zinc-400 text-zinc-800` | `dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200` |
| Stop button | `bg-red-100 border-red-400 text-red-700` | `dark:bg-red-900/40 dark:border-red-700 dark:text-red-300` |
| Active unit text | `text-zinc-500` | `dark:text-zinc-400` |
| Active unit highlight | `text-zinc-900` | `dark:text-zinc-200` |

### Toggle Button Design

Placed in app header, right side:

```
[singling lab]                    [☀ / ☾]
```

- Dark mode active → shows ☀ (click → switch to light)
- Light mode active → shows ☾ (click → switch to dark)
- `aria-label="Switch to light mode"` / `"Switch to dark mode"`
- Keyboard accessible (button element, receives focus)

---

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| VIII: Zero new packages | No new npm dependencies added | PASS |
| IX: Reduce ambiguity | Two explicit themes, no auto-detection, dark default documented | PASS |
| X: Persist & Portability | Theme in dedicated `singling-lab:theme` key; NOT in AppParams or ConfigFile | PASS |
| XI: Accessibility First | `aria-label` on toggle, keyboard navigable, contrast ≥ 4.5:1 in both themes | PASS |

---

## Phased Implementation

### Phase 1: Configuration
- Configure Tailwind for class-based dark mode
- Add flash-prevention script to `index.html`

### Phase 2: Theme Store
- Create `src/themeStore.ts` with get/set/toggle helpers

### Phase 3: App Integration
- Wire theme state into `App.tsx`
- Add toggle button to header
- Re-theme `App.tsx` elements

### Phase 4: Controls Panel
- Re-theme all elements in `Controls.tsx`

### Phase 5: Validation
- Build check
- Manual verification of both themes
