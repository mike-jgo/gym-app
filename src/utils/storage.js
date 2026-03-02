const PREFIX = 'fbeod';

function fieldKey(exId, set, field) {
  return `${PREFIX}_${exId}_s${set}_${field}`;
}

export function saveField(exId, set, field, value) {
  localStorage.setItem(fieldKey(exId, set, field), value);
}

export function loadField(exId, set, field) {
  return localStorage.getItem(fieldKey(exId, set, field)) || '';
}

export function clearFields(exId, sets) {
  for (let s = 1; s <= sets; s++) {
    localStorage.removeItem(fieldKey(exId, s, 'w'));
    localStorage.removeItem(fieldKey(exId, s, 'r'));
    localStorage.removeItem(fieldKey(exId, s, 'rpe'));
    localStorage.removeItem(fieldKey(exId, s, 'rir'));
  }
}

const BW_KEY = 'fbeod_bw';
export function loadBodyweight() {
  return parseFloat(localStorage.getItem(BW_KEY)) || 64.5;
}
export function saveBodyweight(value) {
  localStorage.setItem(BW_KEY, String(value));
}

const EFFORT_MODE_KEY = 'fbeod_effort_mode';
export function loadEffortMode() {
  const mode = localStorage.getItem(EFFORT_MODE_KEY);
  return mode === 'rir' ? 'rir' : 'rpe';
}
export function saveEffortMode(mode) {
  localStorage.setItem(EFFORT_MODE_KEY, mode === 'rir' ? 'rir' : 'rpe');
}
