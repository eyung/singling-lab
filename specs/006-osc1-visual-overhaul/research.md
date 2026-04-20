# Research: OSC-1 Visual Overhaul

**Branch**: `006-osc1-visual-overhaul`  
**Date**: 2026-04-20

All questions resolved. No NEEDS CLARIFICATION markers remain.

---

## Q1: How to load IBM Plex Mono without bundling font files?

**Decision**: Google Fonts CDN `<link>` tag in `index.html`, loaded as a stylesheet preconnect pair.

**Rationale**: The OSC-1 UI kit already uses this pattern (`"IBM Plex Mono",ui-monospace,...`). Google Fonts is reliable, CDN-cached, and requires no asset management. The fallback stack (`ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`) ensures readability if the CDN is unreachable.

**Alternatives considered**:
- Bundle the font as a local asset — more work (download, Vite config), no reliability benefit for a lab tool that is always online.
- Use a different monospace — JetBrains Mono is the design system's listed substitute but IBM Plex Mono is the UI kit's explicit first choice.

**Implementation**:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Q2: How to add CSS custom properties alongside Tailwind CSS 4?

**Decision**: Define chassis tokens in `src/index.css` using a `:root` block after the `@import "tailwindcss"` line. Tailwind 4 uses CSS custom properties for its own tokens; custom properties in `:root` coexist without conflict.

**Rationale**: Tailwind 4's `@variant dark` is already in `index.css`. Adding `:root` and `[data-theme="light"]` blocks in the same file follows the same pattern used by the design system's `colors_and_type.css`. Vite processes `index.css` through PostCSS/Tailwind, which passes through non-Tailwind custom properties unchanged.

**Light/dark approach**: The existing codebase uses `document.documentElement.classList.toggle('dark')` for theme switching (via `themeStore.ts`). The chassis palette dark tokens live in `:root` (dark is default); light overrides live under `:root.dark` ← this is WRONG — need to check. The current `index.css` uses `@variant dark (&:where(.dark, .dark *))` which means dark mode is activated by the `.dark` class on `<html>`. So chassis tokens:
- `:root` — dark (default values, since the html element starts with `.dark`)
- `:root:not(.dark)` or `html.light` — light overrides

**Implementation**: Add after `@import "tailwindcss"` and `@variant dark`:
```css
:root {
  --chassis-panel: #1a1614;
  --chassis-panel-2: #221d1a;
  /* ... full token set ... */
}
:root:not(.dark) {
  /* light overrides */
}
```

---

## Q3: requestAnimationFrame tick for CRT waveform + VU meter in React?

**Decision**: Use a `useEffect` + `useRef` pattern in `App.tsx` to run a rAF loop, incrementing a `tick` counter via `useState`. Pass `tick` and `isPlaying` as props to `CrtScope` and `VuMeter`.

**Rationale**: The OSC-1 UI kit uses the same pattern (`useEffect` loop calling `setTick(t=>t+1)` via `requestAnimationFrame`). The tick counter is an integer that increments every frame — components use it as a time variable for `Math.sin(tick/N)` calculations. Using `useState` (not `useRef`) for tick means React re-renders the animated components each frame, which is correct behavior for a visual animation loop.

**Performance note**: Incrementing `tick` re-renders `App` and all children every rAF frame (~16ms). To limit re-render scope, `CrtScope` and `VuMeter` can be wrapped in `React.memo`. The existing playback logic in `App.tsx` is not performance-sensitive at this update rate.

**Implementation**:
```tsx
// In App.tsx
const [tick, setTick] = useState(0)
const rafRef = useRef<number | null>(null)

useEffect(() => {
  let running = true
  const loop = () => {
    if (!running) return
    setTick(t => t + 1)
    rafRef.current = requestAnimationFrame(loop)
  }
  rafRef.current = requestAnimationFrame(loop)
  return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
}, [])
```

---

## Q4: How to make the LED bar range input keyboard-accessible with the segmented visual?

**Decision**: Keep `<input type="range">` in the DOM, positioned `absolute` with `opacity:0` over the visual bar. The input has `aria-label` and standard `min/max/step/value` attributes. Keyboard users see focus outline on the bar container.

**Rationale**: The UI kit prototype already uses this pattern (`<input type="range" ... />` positioned absolute inside `.osc-bar` with `opacity:0; cursor:ew-resize; width:100%; height:100%`). This satisfies XI (Accessibility First): the native range input is keyboard-navigable, screen-reader-readable, and focusable. The visual segments are `pointer-events:none` decorations.

**Focus indicator**: The bar container needs a `focus-within:` ring so sighted keyboard users can see focus. Use Tailwind `focus-within:ring-1 focus-within:ring-zinc-400/60` on the `.osc-bar` wrapper.

---

## Q5: How to restructure Controls.tsx from sections to tabs?

**Decision**: Add local `useState<Tab>('global')` inside `Controls.tsx`. Render a tab bar with four buttons; conditionally render tab content. No routing or external state needed — the active tab is UI-only state that need not persist.

**Rationale**: Tab state is ephemeral UI preference, not application state. Persisting it would complicate the `AppParams` schema unnecessarily (violates X: only persist what needs portability). The current `Controls.tsx` already uses local state (`importError`), so adding one more `useState` is consistent.

**Tab organization**:
- `global` — instrument select, mode rocker, parse-level rocker, tempo/polyphony LED bars, export/import/reset, VU meter
- `levels` — all 5 `LevelEditor` accordions
- `layered` — all 4 `LayeredLevelEditor` accordions (visible regardless of `params.mode`, unlike current behavior where it's mode-conditional; the tab is always accessible)
- `semantic` — 3 semantic override toggles

**Note on layered tab visibility**: Currently the Layered Levels section in `Controls.tsx` is conditionally rendered when `params.mode === 'layered'`. In the tabbed design, the `layered` tab is always present but its editors show a note when mode is `single`. This matches the OSC-1 design more naturally.

---

## Q6: How do the new chassis styles coexist with existing Tailwind utility classes in App.tsx?

**Decision**: The chassis wrapper, CRT, and transport use the new `.osc-*` CSS classes defined in `index.css`. Tailwind utility classes are used for spacing/layout within those sections where they are simpler (e.g., `flex items-center gap-2`). The key point is that the warm chassis palette replaces the outer `bg-white dark:bg-zinc-950` wrapper — inner components can freely mix `.osc-*` with Tailwind.

**Rationale**: Tailwind 4 uses PostCSS and outputs utility classes. Custom `.osc-*` classes are authored CSS that Tailwind passes through unchanged. There is no conflict; they live in different namespaces. The only risk is specificity — `.osc-chassis` background rules must not be overridden by Tailwind utility classes applied to the same element. Avoid putting Tailwind `bg-*` on the same element as `.osc-chassis`.

---

## Q7: How does the existing themeStore / dark-mode toggle integrate with the chassis?

**Decision**: The chassis is dark-only in its primary form. The `toggleTheme` function in `App.tsx` already adds/removes `.dark` from `<html>`. The light-mode overrides in `:root:not(.dark)` will apply automatically when dark mode is off.

**Scope**: The ☀/☾ button moves from the `<header>` into the chassis title bar. Its `onClick` handler remains identical. The `aria-label` is preserved.

**Light mode**: The warm chassis panel colors `#1a1614` have no direct light-mode equivalent defined in the design system (it only defines zinc token overrides for light mode). For v1, light mode will substitute zinc semantic tokens for the chassis background (`--bg-canvas`, `--bg-surface`) rather than the warm browns. This is documented as a known limitation in `spec.md` assumptions.
