# FBEOD Tracker — Google Sheets Setup Guide

## Overview

Your workout data will be stored in a Google Sheet with this structure:

| Date | Workout | Exercise | ExerciseID | Set | Weight | Reps | e1RM | Bodyweight | RPE | RIR | VolumeLoad | HardSet |
|------|---------|----------|------------|-----|--------|------|------|------------|-----|-----|------------|---------|

A separate "LastLifts" sheet tracks the most recent session per exercise for the "LAST" display in the tracker.

---

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it **"FBEOD Tracker"**
3. Rename the first tab to **"Log"**
4. Add headers in Row 1: `Date | Workout | Exercise | ExerciseID | Set | Weight | Reps | e1RM | Bodyweight | RPE | RIR | VolumeLoad | HardSet`
5. Create a second tab named **"LastLifts"**
6. Add headers in Row 1: `ExerciseID | Exercise | Date | Sets`
7. Create a third tab named **"Config"** (no headers needed — the script manages this automatically)

---

## Step 2: Add the Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Paste the entire script below
4. Click **Save** (💾 icon)

```javascript
// ============================================================
// FBEOD Google Apps Script — paste this into Code.gs
// ============================================================

const LOG_SHEET = 'Log';
const LAST_SHEET = 'LastLifts';

// Handle GET requests (fetch last lifts)
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'lastLifts';

  if (action === 'lastLifts') {
    return sendJson(getLastLifts());
  }

  if (action === 'allData') {
    return sendJson(getAllData());
  }

  return sendJson({ status: 'error', message: 'Unknown action' });
}

// Handle POST requests (save workout)
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'save') {
      return sendJson(saveWorkout(body));
    }

    return sendJson({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return sendJson({ status: 'error', message: err.toString() });
  }
}

// Save a workout session
function saveWorkout(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET);
  const lastSheet = ss.getSheetByName(LAST_SHEET);

  const date = new Date(data.date);
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd MMM yyyy');
  const workout = data.workout;       // "A" or "B"
  const bodyweight = data.bodyweight;  // number

  const rows = [];

  data.exercises.forEach(function(ex) {
    ex.sets.forEach(function(s) {
      const e1rm = calc1RM(s.weight, s.reps);
      rows.push([dateStr, workout, ex.name, ex.id, s.set, s.weight, s.reps, Math.round(e1rm * 10) / 10, bodyweight]);
    });

    // Update LastLifts
    updateLastLift(lastSheet, ex.id, ex.name, dateStr, ex.sets);
  });

  if (rows.length > 0) {
    logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { status: 'ok', rowsSaved: rows.length };
}

// Update the LastLifts sheet for a given exercise
function updateLastLift(sheet, exId, exName, dateStr, sets) {
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === exId) {
      foundRow = i + 1; // Sheets is 1-indexed
      break;
    }
  }

  const setsJson = JSON.stringify(sets.map(function(s) {
    return { w: s.weight, r: s.reps, rpe: s.rpe, rir: s.rir };
  }));

  if (foundRow > 0) {
    sheet.getRange(foundRow, 2, 1, 3).setValues([[exName, dateStr, setsJson]]);
  } else {
    sheet.appendRow([exId, exName, dateStr, setsJson]);
  }
}

// Get all last-lift data
function getLastLifts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LAST_SHEET);
  const data = sheet.getDataRange().getValues();
  var result = {};

  for (var i = 1; i < data.length; i++) {
    var exId = data[i][0];
    var sets = [];
    try { sets = JSON.parse(data[i][3]); } catch(e) {}
    result[exId] = {
      name: data[i][1],
      date: data[i][2],
      sets: sets
    };
  }

  return { status: 'ok', data: result };
}

// Get all log data (for Claude Code / analysis)
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOG_SHEET);
  const data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }

  return { status: 'ok', data: rows, count: rows.length };
}

// Brzycki 1RM formula
function calc1RM(w, r) {
  if (!w || w <= 0 || !r || r <= 0 || r > 30) return 0;
  if (r === 1) return w;
  return w * (36 / (37 - r));
}

// Helper to send JSON responses with CORS headers
function sendJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Step 3: Deploy as Web App

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Set:
   - **Description**: "FBEOD API"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. Click **Deploy**
5. **Authorize** the app when prompted (click through the "unsafe" warning — it's your own script)
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## Step 4: Connect the Tracker

1. Open your **fbeod-tracker.html** file in a browser
2. You'll see a yellow "CONNECT GOOGLE SHEETS" banner
3. Paste the Web App URL from Step 3
4. Click **CONNECT**
5. The green dot in the header confirms the connection

---

## Step 5 (Optional): Claude Code + Google Sheets MCP

To let Claude Code read/edit your workout data:

```powershell
# Add a Google Sheets MCP server to Claude Code
claude mcp add google-sheets -- cmd /c npx -y @anthropic-ai/google-sheets-mcp
```

Or you can simply have Claude Code call your Apps Script URL directly — just tell it:

> "Fetch my workout data from https://script.google.com/macros/s/.../exec?action=allData and show me my bench press progression"

Claude Code can use `curl` or write a quick script to query the same API your tracker uses.

---

## How It Works

```
┌──────────────┐      POST /save       ┌──────────────────┐      writes      ┌──────────────┐
│  FBEOD       │ ──────────────────────>│  Google Apps     │ ────────────────>│  Google      │
│  Tracker     │                        │  Script (API)    │                  │  Sheet       │
│  (browser)   │ <──────────────────────│                  │ <────────────────│              │
└──────────────┘    GET /lastLifts      └──────────────────┘     reads        └──────────────┘
                                               ^                                     ^
                                               │                                     │
                                        ┌──────┴───────┐                             │
                                        │  Claude Code │ ────── reads/edits ─────────┘
                                        │  (terminal)  │
                                        └──────────────┘
```

- **SAVE** button → sends your session to the Google Sheet
- **LAST** display → fetches previous session data from the Sheet
- **EXPORT** → still copies to clipboard (works offline)
- **CLEAR** → only clears the current input fields, not the Sheet data
- Your data is always safe in Google Sheets!

---

## Troubleshooting

- **"Connection failed"**: Make sure you deployed as "Anyone" access and copied the full URL
- **CORS errors**: The tracker uses `text/plain` content type to avoid CORS preflight. If issues persist, redeploy the Apps Script
- **Data not showing**: Check the "LastLifts" tab in your Sheet — it should have rows after your first save
- **To update the script**: In Apps Script, edit the code, then Deploy → Manage deployments → Edit → New version → Deploy
