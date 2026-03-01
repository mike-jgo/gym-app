# FBEOD Tracker

A workout tracker for the Full Body Every Other Day (FBEOD) program, with Google Sheets as a persistent data store.

## Project Structure

```
fbeod-tracker/
├── index.html                  # Entry HTML
├── vite.config.js              # Vite config (GitHub Pages compatible)
├── package.json
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Main app component
│   ├── styles/
│   │   └── global.css          # Design tokens & base styles
│   ├── components/
│   │   ├── Header.jsx/.css     # Logo, BW badge, sync indicator
│   │   ├── SetupBanner.jsx/.css# Google Sheets connection UI
│   │   ├── WorkoutToggle.jsx/.css # A/B workout switcher
│   │   ├── TimerBar.jsx/.css   # Rest timer with progress bar
│   │   ├── ExerciseCard.jsx/.css # Exercise with sets grid & e1RM
│   │   ├── FooterActions.jsx/.css # Save/Export/Clear buttons
│   │   └── Toast.jsx/.css      # Notification popup
│   ├── hooks/
│   │   ├── useTimer.js         # Rest timer logic
│   │   └── useSheets.js        # Google Sheets sync state
│   └── utils/
│       ├── workouts.js         # Exercise definitions (A & B)
│       ├── calc.js             # Brzycki 1RM formula
│       ├── storage.js          # localStorage for current session
│       └── sheets.js           # Google Sheets API calls
└── APPS-SCRIPT.js              # Google Apps Script (copy to Sheets)
```

## Quick Start

```bash
npm install
npm run dev
```

## Google Sheets Setup

1. Create a Google Sheet with two tabs: **"Log"** and **"LastLifts"**
2. In the Sheet, go to **Extensions → Apps Script**
3. Paste the contents of `APPS-SCRIPT.js`
4. Deploy as Web App (Execute as: Me, Access: Anyone)
5. Copy the URL and paste it into the tracker's setup banner

See `SETUP-GUIDE.md` for detailed instructions.

## Deploy to GitHub Pages

```bash
npm run deploy
```

Or commit the `dist/` folder to your `gh-pages` branch.

## Claude Code Integration

Claude Code can interact with your workout data via the same API:

```bash
# Fetch all data
curl "YOUR_APPS_SCRIPT_URL?action=allData"

# Or tell Claude Code your URL and ask it to analyze your progress
```
