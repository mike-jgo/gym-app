# Fitlog

A minimal, mobile-first workout tracker. Log sets, track e1RM, and view your progress over time.

**[Open Fitlog](https://mike-jgo.github.io/gym-app/)**

---

## Using Fitlog

Fitlog runs in your browser and works as an installable PWA on mobile. Open the link above, enter your email, and sign in via the magic link — no password needed.

---

## Running Locally

```bash
npm install
npm run dev
```

Create a `.env` file with your Supabase credentials (see `.env.example`).

Deploy to GitHub Pages:

```bash
npm run deploy
```

---

## Tech

- React + Vite (PWA)
- Supabase (auth + database)
- Tailwind CSS
- Recharts
