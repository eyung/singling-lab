# Developer Quickstart: singling-lab

**Branch**: `001-core-instrument` | **Date**: 2026-04-10

---

## Prerequisites

- Node.js 18+
- npm 9+
- A modern browser (Chrome, Firefox, Safari, Edge)

---

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

---

## Build for production

```bash
npm run build
```

Output in `dist/`. Preview with:

```bash
npm run preview
```

---

## Deploy to Vercel

The project is pre-configured via `vercel.json`. To deploy:

```bash
npx vercel
```

Or connect the repo to Vercel and push — it will auto-detect the Vite framework.

---

## Source layout

```text
src/
├── types.ts            — all shared types, defaults, validation functions
├── parser.ts           — text → ParseUnit[] (all 5 parse levels)
├── soundEngine.ts      — buildSoundParams(), SoundEngine class
├── App.tsx             — playback loop, top-level UI
└── components/
    └── Controls.tsx    — parameter panel (global + per-level controls)
```

---

## Key workflows

### Adding a new parse level

1. Add the value to `ParseLevel` in `types.ts`.
2. Add a case in `parseText()` in `parser.ts`.
3. Add a default `LevelParams` entry in `DEFAULT_PARAMS.levels` in `types.ts`.
4. The level button and parameter panel are rendered dynamically — no UI changes
   needed.

### Adding a new semantic override

1. Add a boolean field to `SemanticParams` in `types.ts`.
2. Update `DEFAULT_PARAMS.semantic`.
3. Apply the override in `buildSoundParams()` in `soundEngine.ts` or in the tick
   loop in `App.tsx` (depending on whether it affects Sound Params or timing).
4. Add the checkbox to the Semantic section in `Controls.tsx`.

### Adding a new sound parameter

1. Add the field to `SoundParams` in `types.ts`.
2. Compute it in `buildSoundParams()` in `soundEngine.ts`.
3. Apply it in `SoundEngine.playUnit()`.
4. Add validation to `validateLevelParams()` if user-configurable.
5. Add a slider to `LevelEditor` in `Controls.tsx` if user-configurable.

---

## Constitution compliance check

Before merging any change, verify against Core Principles:

- Does the change introduce phoneme-based mapping? → Principle I violation.
- Does it require a server request for core functionality? → Principle III violation.
- Does it hardcode a sonic property that could reasonably vary? → Principle IV violation.
- Does it enable simultaneous multi-level playback without explicit scoping? → Principle V violation.
- Does it modify the source text? → Principle VII violation.
- Does it import an external audio library? → Principle VIII violation.
