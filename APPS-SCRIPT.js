// ============================================================
// FBEOD Google Apps Script
// 
// SETUP:
// 1. Create a Google Sheet with tabs "Log" and "LastLifts"
// 2. Log headers (Row 1): Date | Workout | Exercise | ExerciseID | Set | Weight | Reps | e1RM | Bodyweight
// 3. LastLifts headers (Row 1): ExerciseID | Exercise | Date | Sets
// 4. Extensions → Apps Script → paste this code
// 5. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
// 6. Copy the URL into the tracker
// ============================================================

const LOG_SHEET = 'Log';
const LAST_SHEET = 'LastLifts';
const CONFIG_SHEET = 'Config';

// Handle GET requests (fetch data)
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'lastLifts';

  if (action === 'lastLifts') {
    return sendJson(getLastLifts());
  }

  if (action === 'allData') {
    return sendJson(getAllData());
  }

  if (action === 'getConfig') {
    return sendJson(getConfig());
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

    if (body.action === 'saveConfig') {
      return sendJson(saveConfig(body));
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
  const workout = data.workout;
  const bodyweight = data.bodyweight;

  const rows = [];

  data.exercises.forEach(function(ex) {
    ex.sets.forEach(function(s) {
      const e1rm = calc1RM(s.weight, s.reps);
      rows.push([
        dateStr,
        workout,
        ex.name,
        ex.id,
        s.set,
        s.weight,
        s.reps,
        Math.round(e1rm * 10) / 10,
        bodyweight
      ]);
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
      foundRow = i + 1;
      break;
    }
  }

  const setsJson = JSON.stringify(sets.map(function(s) {
    return { w: s.weight, r: s.reps };
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

// Get config from Config sheet
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) return { status: 'ok', data: null };

  const data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'config') {
      try {
        return { status: 'ok', data: JSON.parse(data[i][1]) };
      } catch(e) {
        return { status: 'ok', data: null };
      }
    }
  }
  return { status: 'ok', data: null };
}

// Save config to Config sheet (upsert)
function saveConfig(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) return { status: 'error', message: 'Config sheet not found' };

  const configJson = JSON.stringify(data.config);
  const rows = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'config') {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 2).setValue(configJson);
  } else {
    sheet.appendRow(['config', configJson]);
  }

  return { status: 'ok' };
}

// Brzycki 1RM formula
function calc1RM(w, r) {
  if (!w || w <= 0 || !r || r <= 0 || r > 30) return 0;
  if (r === 1) return w;
  return w * (36 / (37 - r));
}

// Helper to send JSON responses
function sendJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
