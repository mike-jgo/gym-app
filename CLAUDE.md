# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server; proxies /api to localhost:3000
npm run server     # Start Express API and serve dist/ when built
npm run seed:user  # Create/update the admin user from ADMIN_EMAIL/PASSWORD
npm run build      # Production frontend build
npm run preview    # Preview frontend build locally
npm run test       # Run all tests with Vitest
```

Run a single test file:

```bash
npx vitest run src/__tests__/calc.test.js
```

## Architecture

**Stack:** React 19 + Vite 6, Tailwind CSS 4, Express, Postgres, Recharts. Production is intended to run on a VPS via Docker Compose.

**No router.** Navigation is a `screen` state string in `App.jsx` - values: `'home'`, `'session'`, `'history'`, `'manage'`. All screen switching happens in App via callbacks passed down.

**Auth:** Email/password login through the Express API. Sessions are stored in same-origin HttpOnly cookies named `fitlog_session`. Public signup is disabled; the app creates/updates the admin user at startup when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. `npm run seed:user` is still available for manual seeding.

**Data persistence:** Browser code calls `/api/*` through `src/utils/api.js` and data helpers in `src/utils/dataApi.js`. Workout config is stored both in Postgres and localStorage (`fbeod_config`).

**Database:** Schema lives in `server/schema.sql`. The API runs schema setup and preset exercise seeding at startup. Ownership checks happen in Express queries, not Postgres RLS.

**Workout color system:** Each workout has a color letter `'a'`-`'f'` (a=orange, b=blue, c=purple, d=cyan, e=amber, f=pink). CSS accent vars are defined in `global.css` and applied via `workoutColor` prop across the UI.

**Exercise IDs** in the preset registry (`src/utils/workouts.js`) are stable strings like `bb_bench`. These IDs must not change because they are used as localStorage keys and database foreign keys.

**1RM calculation:** Brzycki formula lives in `src/utils/calc.js` and is used when deriving personal bests.

## Key Files

| File | Role |
|------|------|
| `server/app.js` | Express routes for auth, exercises, workouts, sessions |
| `server/schema.sql` | VPS Postgres schema |
| `server/seed-user.js` | Admin account creation/update script |
| `src/App.jsx` | Top-level state, session logic, screen routing |
| `src/hooks/useDatabase.js` | Session read/write state wrapper |
| `src/hooks/useAuth.js` | Cookie-backed API auth state |
| `src/hooks/useConfig.js` | Workout config CRUD, syncs localStorage and API |
| `src/utils/api.js` | Browser API request helper |

## Testing

Tests live in `src/__tests__/` and `server/__tests__/`. They use Vitest, Testing Library, and jsdom unless a test opts into the Node environment.
