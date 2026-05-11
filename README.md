# Fitlog

A minimal, mobile-first workout tracker. Log sets, track e1RM, and view your progress over time.

## Stack

- React + Vite PWA
- Node + Express API
- Postgres database
- Docker Compose for VPS deployment

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`, then run Postgres and the API:

```bash
docker compose up postgres
npm run seed:user
npm run server
```

In another terminal, run the Vite dev server:

```bash
npm run dev
```

Vite proxies `/api` to `http://localhost:3000`.

## VPS Deployment

Set production values for `POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then run:

```bash
docker compose up -d --build
```

Serve the app behind HTTPS on your VPS and proxy traffic to port `3000`. If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the app creates or updates that admin user at startup.

## Commands

```bash
npm run dev        # Vite frontend dev server
npm run server     # Express API + static app server
npm run seed:user  # Create/update the admin user
npm run build      # Build React app to dist/
npm run test       # Run Vitest tests
```
