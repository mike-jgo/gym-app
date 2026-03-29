# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build (output to dist/)
npm run preview   # Preview production build locally
npm run test      # Run all tests with Vitest
npm run deploy    # Build + deploy to GitHub Pages (mike-jgo.github.io/gym-app)
```

Run a single test file:
```bash
npx vitest run src/__tests__/calc.test.js
```

## Architecture

**Stack:** React 19 + Vite 6, Tailwind CSS 4, Supabase (auth + DB), Recharts, deployed to GitHub Pages at base path `/gym-app/`.

**No router.** Navigation is a `screen` state string in `App.jsx` — values: `'home'`, `'session'`, `'history'`, `'manage'`. All screen switching happens in App via callbacks passed down.

**Auth:** Supabase email magic link. `useAuth.js` handles the session and includes a PWA cookie bridge for iOS (tokens don't persist in standalone PWA mode otherwise). App shows `AuthScreen` until authenticated.

**Data persistence:** `useSupabase.js` handles all reads/writes to Supabase. Workout config is stored both in Supabase and localStorage (`fbeod_config`). `useConfig.js` manages the config shape: `{ version:1, workouts:[{ id, label, color:'a'|...|'f', exercises:[{id,name,sets}] }] }`.

**Workout color system:** Each workout has a color letter `'a'`–`'f'` (a=orange, b=blue, c=purple, d=cyan, e=amber, f=pink). CSS accent vars are defined in `global.css` and applied via `workoutColor` prop (not a label string) across `ExerciseCard`, `TimerBar`, `FooterActions`, and `Header`.

**Exercise IDs** in the preset registry (`exerciseRegistry.js`) are stable strings like `bb_bench`. These IDs must not change — they're used as localStorage keys to preserve per-user lift history.

**1RM calculation:** Brzycki formula lives in `src/utils/calc.js` and is mirrored in `APPS-SCRIPT.js`.

## Key Files

| File | Role |
|------|------|
| `src/App.jsx` | All top-level state, session logic, `handleComplete` (saves to Supabase), screen routing |
| `src/hooks/useSupabase.js` | All Supabase reads/writes (sessions, config, last lifts) |
| `src/hooks/useAuth.js` | Supabase auth + iOS PWA token bridge |
| `src/hooks/useConfig.js` | Workout config CRUD, syncs localStorage ↔ Supabase |
| `src/utils/config.js` | Pure config manipulation helpers |
| `src/utils/exerciseRegistry.js` | Preset exercise metadata |
| `APPS-SCRIPT.js` | Google Apps Script — legacy backend still supported alongside Supabase |

## Testing

Tests live in `src/__tests__/`. They use Vitest + `@testing-library/react` + jsdom. Supabase calls are mocked. Setup file: `src/__tests__/setup.js` (imports `@testing-library/jest-dom`). Test config is embedded in `vite.config.js`.

## Environment

Requires a `.env` file (see `.env.example`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
