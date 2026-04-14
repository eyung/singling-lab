# Feature Specification: Light/Dark Mode Toggle

**Branch**: 002-light-dark-mode
**Created**: 2026-04-13
**Status**: Ready for planning

---

## Overview

Add a theme toggle to the singling-lab UI that switches between a dark zinc theme (the current default) and a light theme. The user's preference is remembered across page reloads without requiring any action from the user.

---

## User Stories

### US1 (P1): Toggle Between Themes

**As a** researcher using singling-lab,
**I want** to switch the interface between dark and light themes with a single click,
**So that** I can work comfortably in different lighting environments.

**Acceptance criteria**:
- A theme toggle control is visible in the app header at all times
- Clicking the toggle immediately switches the UI between dark and light themes
- All UI regions (header, text area, controls panel, buttons, sliders, dropdowns) respond to the theme change
- The toggle visually communicates the current theme state

### US2 (P2): Persist Theme Preference

**As a** researcher who reloads the page frequently,
**I want** my chosen theme to persist across page reloads,
**So that** I do not need to re-select it every session.

**Acceptance criteria**:
- After selecting a theme, reloading the page restores the chosen theme immediately (no flash of the opposite theme)
- The theme preference is stored independently of the audio configuration so importing/exporting configs does not change the theme
- Opening a new private/incognito window shows the default dark theme

---

## Functional Requirements

- FR-001: The theme toggle renders as a button in the app header (top-right area)
- FR-002: Two themes are supported: `dark` (default) and `light`
- FR-003: Theme switching is instantaneous — no page reload required
- FR-004: Theme state is persisted in `localStorage` under a dedicated key (`singling-lab:theme`), separate from audio parameters
- FR-005: On initial load, if no stored theme preference exists, the dark theme is shown
- FR-006: The toggle button carries an `aria-label` that reflects the action it will perform (e.g., "Switch to light mode" / "Switch to dark mode")
- FR-007: The light theme uses a high-contrast palette readable in bright environments (light background, dark text)
- FR-008: All existing interactive controls (sliders, selects, checkboxes, buttons) remain fully readable and usable in both themes
- FR-009: The theme preference is NOT included in exported configuration files — it is a local UI preference only

---

## Out of Scope

- System/OS-level dark mode detection (`prefers-color-scheme`) — manual toggle only
- Per-component theme overrides
- More than two theme variants
- Animation or transition effects during theme switching

---

## Edge Cases & Error Handling

- If `localStorage` is unavailable (private browsing, storage quota), the toggle still works for the session; the preference is simply not persisted — no error is shown to the user
- If an invalid theme value is found in `localStorage`, fall back to dark theme

---

## Assumptions

- Tailwind CSS dark mode will be configured using the `class` strategy (adding/removing a `dark` class on `<html>`)
- The existing dark theme (zinc-950/zinc-100 palette) becomes the canonical dark variant
- The light theme uses white/zinc-50 backgrounds with zinc-800/zinc-900 text
- No new npm packages are required — Tailwind's built-in dark variant utilities are sufficient

---

## Success Criteria

### Measurable Outcomes

- Theme switches in under 100ms of the toggle click (imperceptible delay)
- All text in both themes passes WCAG AA contrast ratio (4.5:1 minimum for normal text)
- Preference survives a hard page reload (Ctrl+Shift+R) and a normal reload

### Qualitative Outcomes

- A first-time user can find and use the toggle without documentation
- The light theme feels intentional, not an afterthought — all surfaces are styled

---

## Clarifications

### Session 2026-04-13

- Q: Should system/OS dark mode preference be honoured automatically? → A: No — manual toggle only, dark is the default
- Q: Where should the toggle be placed? → A: App header, top-right area
- Q: Should the theme be included in exported configs? → A: No — local UI preference only, stored under a separate localStorage key
