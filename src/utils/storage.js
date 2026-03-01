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
  }
}
