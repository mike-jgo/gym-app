// ============================================================
// Fitlog Google Apps Script
//
// SETUP:
// 1. Create a blank Google Sheet (name it anything)
// 2. Extensions → Apps Script → paste this code
// 3. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
// 4. Copy the deployment URL into Fitlog
//
// All tabs and headers are created automatically on first use.
// ============================================================

const LOG_SHEET = 'Log';
const LAST_SHEET = 'LastLifts';
const CONFIG_SHEET = 'Config';
const SESSIONS_SHEET = 'Sessions';
const PB_SHEET = 'PBs';
const LOG_HEADERS = [
  'Date', 'Workout', 'Exercise', 'ExerciseID', 'Set', 'Weight', 'Reps', 'e1RM', 'Bodyweight',
  'RPE', 'RIR', 'VolumeLoad', 'HardSet'
];
const LAST_HEADERS = ['ExerciseID', 'Exercise', 'Date', 'Sets'];
const SESSION_HEADERS = [
  'SessionID', 'Date', 'Workout', 'WorkoutColor', 'Bodyweight', 'Exercises', 'Duration',
  'TotalVolume', 'HardSets', 'AvgRPE'
];
const PB_HEADERS = [
  'ExerciseID', 'Exercise', 'Best1RM', 'Best1RMDate',
  'BestWeight', 'BestWeightReps', 'BestWeightDate',
  'BestVolume', 'BestVolumeDate'
];

// Ensure all required sheets exist with correct headers
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const required = [
    {
      name: LOG_SHEET,
      headers: LOG_HEADERS
    },
    {
      name: LAST_SHEET,
      headers: LAST_HEADERS
    },
    {
      name: CONFIG_SHEET,
      headers: []
    },
    {
      name: SESSIONS_SHEET,
      headers: SESSION_HEADERS
    },
    {
      name: PB_SHEET,
      headers: PB_HEADERS
    }
  ];

  required.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      if (def.headers.length > 0) {
        sheet.appendRow(def.headers);
      }
    } else if (def.headers.length > 0) {
      ensureHeaders(sheet, def.headers);
    }
  });
}

// Handle GET requests (fetch data)
function doGet(e) {
  initSheets();
  const action = (e && e.parameter && e.parameter.action) || 'lastLifts';

  if (action === 'lastLifts') {
    return sendJson(getLastLifts());
  }

  if (action === 'sessions') {
    return sendJson(getSessions());
  }

  if (action === 'allData') {
    return sendJson(getAllData());
  }

  if (action === 'pbs') {
    return sendJson(getPBs());
  }

  if (action === 'getConfig') {
    return sendJson(getConfig());
  }

  return sendJson({ status: 'error', message: 'Unknown action' });
}

// Handle POST requests (save workout)
function doPost(e) {
  initSheets();
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
  const sessionsSheet = ss.getSheetByName(SESSIONS_SHEET);
  const pbSheet = ss.getSheetByName(PB_SHEET);
  const logHeaders = getSheetHeaders(logSheet);

  const date = new Date(data.date);
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd MMM yyyy');
  const workout = data.workout;
  const workoutColor = data.workoutColor || '';
  const bodyweight = data.bodyweight;

  var sessionVolume = 0;
  var sessionHardSets = 0;
  var sessionRpeTotal = 0;
  var sessionRpeCount = 0;
  const rows = [];

  data.exercises.forEach(function(ex) {
    ex.sets.forEach(function(s) {
      const e1rm = calc1RM(s.weight, s.reps);
      const effort = normalizeEffort(s.rpe, s.rir);
      const volumeLoad = Math.round((s.weight || 0) * (s.reps || 0) * 10) / 10;
      const hardSet = effort.rpe != null ? effort.rpe >= 8 : (effort.rir != null && effort.rir <= 2);

      sessionVolume += volumeLoad;
      if (hardSet) sessionHardSets += 1;
      if (effort.rpe != null) {
        sessionRpeTotal += effort.rpe;
        sessionRpeCount += 1;
      }

      rows.push(buildLogRow(logHeaders, {
        Date: dateStr,
        Workout: workout,
        Exercise: ex.name,
        ExerciseID: ex.id,
        Set: s.set,
        Weight: s.weight,
        Reps: s.reps,
        e1RM: Math.round(e1rm * 10) / 10,
        Bodyweight: bodyweight,
        RPE: effort.rpe,
        RIR: effort.rir,
        VolumeLoad: volumeLoad,
        HardSet: hardSet ? 1 : 0
      }));
    });

  });

  if (rows.length > 0) {
    logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  upsertLastLifts(lastSheet, dateStr, data.exercises);
  upsertPersonalBests(pbSheet, dateStr, data.exercises);

  // Append session summary
  var avgRpe = sessionRpeCount > 0 ? Math.round((sessionRpeTotal / sessionRpeCount) * 10) / 10 : '';
  sessionsSheet.appendRow([
    data.date,
    dateStr,
    workout,
    workoutColor,
    bodyweight,
    JSON.stringify(data.exercises),
    data.duration || 0,
    Math.round(sessionVolume * 10) / 10,
    sessionHardSets,
    avgRpe
  ]);

  return { status: 'ok', rowsSaved: rows.length };
}

function ensureHeaders(sheet, headers) {
  var width = Math.max(sheet.getLastColumn(), headers.length);
  if (width === 0) {
    sheet.appendRow(headers);
    return;
  }

  var existing = sheet.getRange(1, 1, 1, width).getValues()[0];
  var missing = [];
  headers.forEach(function(h) {
    if (existing.indexOf(h) === -1) missing.push(h);
  });

  if (missing.length > 0) {
    var startCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  }
}

function getSheetHeaders(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function buildLogRow(headers, valuesByHeader) {
  return headers.map(function(h) {
    return valuesByHeader[h] != null ? valuesByHeader[h] : '';
  });
}

function normalizeEffort(rpeRaw, rirRaw) {
  var rpe = parseEffort(rpeRaw);
  var rir = parseEffort(rirRaw);

  if (rpe == null && rir == null) return { rpe: null, rir: null };
  if (rpe == null && rir != null) rpe = 10 - rir;
  if (rir == null && rpe != null) rir = 10 - rpe;
  if (rpe != null && rir != null) rir = 10 - rpe;

  return { rpe: round1(rpe), rir: round1(rir) };
}

function parseEffort(v) {
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function upsertLastLifts(sheet, dateStr, exercises) {
  const data = sheet.getDataRange().getValues();
  const rowByExercise = {};

  for (var i = 1; i < data.length; i++) {
    rowByExercise[data[i][0]] = i + 1;
  }

  var toAppend = [];
  exercises.forEach(function(ex) {
    var setsJson = JSON.stringify((ex.sets || []).map(function(s) {
      var effort = normalizeEffort(s.rpe, s.rir);
      return { w: s.weight, r: s.reps, rpe: effort.rpe, rir: effort.rir };
    }));
    var row = rowByExercise[ex.id];
    if (row) {
      sheet.getRange(row, 2, 1, 3).setValues([[ex.name, dateStr, setsJson]]);
    } else {
      toAppend.push([ex.id, ex.name, dateStr, setsJson]);
    }
  });

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
  }
}

function upsertPersonalBests(sheet, dateStr, exercises) {
  const data = sheet.getDataRange().getValues();
  const existing = {};

  for (var i = 1; i < data.length; i++) {
    var exId = String(data[i][0] || '');
    if (!exId) continue;
    existing[exId] = {
      row: i + 1,
      exercise: data[i][1] || '',
      best1RM: Number(data[i][2]) || 0,
      best1RMDate: data[i][3] || '',
      bestWeight: Number(data[i][4]) || 0,
      bestWeightReps: Number(data[i][5]) || 0,
      bestWeightDate: data[i][6] || '',
      bestVolume: Number(data[i][7]) || 0,
      bestVolumeDate: data[i][8] || ''
    };
  }

  var toAppend = [];
  exercises.forEach(function(ex) {
    var sets = ex.sets || [];
    if (sets.length === 0) return;

    var exBest1RM = 0;
    var exBestWeight = 0;
    var exBestWeightReps = 0;
    var exBestVolume = 0;

    sets.forEach(function(s) {
      var w = Number(s.weight) || 0;
      var r = Number(s.reps) || 0;
      var rm = calc1RM(w, r);
      var vol = round1(w * r);
      if (rm > exBest1RM) exBest1RM = rm;
      if (w > exBestWeight) {
        exBestWeight = w;
        exBestWeightReps = r;
      }
      if (vol > exBestVolume) exBestVolume = vol;
    });

    var curr = existing[ex.id] || {
      row: 0,
      exercise: ex.name,
      best1RM: 0,
      best1RMDate: '',
      bestWeight: 0,
      bestWeightReps: 0,
      bestWeightDate: '',
      bestVolume: 0,
      bestVolumeDate: ''
    };

    curr.exercise = ex.name;
    if (exBest1RM > curr.best1RM) {
      curr.best1RM = round1(exBest1RM);
      curr.best1RMDate = dateStr;
    }
    if (exBestWeight > curr.bestWeight) {
      curr.bestWeight = exBestWeight;
      curr.bestWeightReps = exBestWeightReps;
      curr.bestWeightDate = dateStr;
    }
    if (exBestVolume > curr.bestVolume) {
      curr.bestVolume = round1(exBestVolume);
      curr.bestVolumeDate = dateStr;
    }

    var rowValues = [
      ex.id,
      curr.exercise,
      curr.best1RM,
      curr.best1RMDate,
      curr.bestWeight,
      curr.bestWeightReps,
      curr.bestWeightDate,
      curr.bestVolume,
      curr.bestVolumeDate
    ];

    if (curr.row > 0) {
      sheet.getRange(curr.row, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      toAppend.push(rowValues);
    }
  });

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
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
      date: formatDateVal(data[i][2], 'yyyy-MM-dd'),
      sets: sets
    };
  }

  return { status: 'ok', data: result };
}

// Get all sessions in reverse chronological order
function getSessions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SESSIONS_SHEET);
  if (!sheet) return { status: 'ok', data: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'ok', data: [] };
  const headers = data[0];
  const idx = {};
  headers.forEach(function(h, i) { idx[h] = i; });

  var result = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var exercises = [];
    var exercisesRaw = row[idx.Exercises != null ? idx.Exercises : 5];
    try { exercises = JSON.parse(exercisesRaw); } catch(e) {}
    var sessionRaw = row[idx.SessionID != null ? idx.SessionID : 0];
    var sessionId = sessionRaw instanceof Date ? sessionRaw.toISOString() : String(sessionRaw);
    var duration = parseInt(row[idx.Duration != null ? idx.Duration : 6], 10) || 0;
    var totalVolume = Number(row[idx.TotalVolume != null ? idx.TotalVolume : 7]) || 0;
    var hardSets = parseInt(row[idx.HardSets != null ? idx.HardSets : 8], 10) || 0;
    var avgRpe = parseEffort(row[idx.AvgRPE != null ? idx.AvgRPE : 9]);
    result.push({
      id: sessionId,
      date: formatDateVal(sessionRaw, 'yyyy-MM-dd HH:mm:ss'),
      workout: row[idx.Workout != null ? idx.Workout : 2],
      workoutColor: row[idx.WorkoutColor != null ? idx.WorkoutColor : 3],
      bodyweight: row[idx.Bodyweight != null ? idx.Bodyweight : 4],
      exercises: exercises,
      duration: duration,
      totalVolume: totalVolume,
      hardSets: hardSets,
      avgRPE: avgRpe
    });
  }

  return { status: 'ok', data: result };
}

// Get all log data (for analysis)
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

// Get compact PB payload keyed by ExerciseID
function getPBs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PB_SHEET);
  if (!sheet) return { status: 'ok', data: {} };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'ok', data: {} };

  var result = {};
  for (var i = 1; i < data.length; i++) {
    var exId = String(data[i][0] || '');
    if (!exId) continue;
    result[exId] = {
      exercise: data[i][1] || '',
      best1RM: Number(data[i][2]) || 0,
      best1RMDate: formatDateVal(data[i][3], 'yyyy-MM-dd'),
      bestWeight: Number(data[i][4]) || 0,
      bestWeightReps: Number(data[i][5]) || 0,
      bestWeightDate: formatDateVal(data[i][6], 'yyyy-MM-dd'),
      bestVolume: Number(data[i][7]) || 0,
      bestVolumeDate: formatDateVal(data[i][8], 'yyyy-MM-dd')
    };
  }

  return { status: 'ok', data: result };
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

// Format a value that may have been auto-converted to a Date by Sheets
function formatDateVal(val, fmt) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), fmt);
  }
  return String(val);
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
