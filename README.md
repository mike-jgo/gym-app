# Fitlog

A minimal, mobile-first workout tracker. Log sets, track e1RM, and sync to your own Google Sheet.

**[Open Fitlog](https://mike-jgo.github.io/gym-app/)**

---

## Using Fitlog

Fitlog runs entirely in your browser — no install needed. Open the link above on any device and it's ready to use.

Your data is stored in your own private Google Sheet, so you'll need to do a one-time setup to enable cloud sync.

---

## Google Sheets Setup

1. Create a blank Google Sheet (name it anything)
2. Open **Extensions → Apps Script**
3. Delete any existing code and paste in the contents of [`APPS-SCRIPT.js`](./APPS-SCRIPT.js)
4. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** and copy the URL
6. Open Fitlog, paste the URL into the setup banner, and tap **Connect**

All sheet tabs and headers are created automatically on first use.

---

## Running Locally

```bash
npm install
npm run dev
```

Deploy to GitHub Pages:

```bash
npm run deploy
```

---

## Tech

- React + Vite
- Google Apps Script (personal data backend)
- No accounts, no third-party servers
