import { WORKOUTS } from './workouts';
import { getApiUrl } from './sheets';

export const CONFIG_KEY = 'fbeod_config';

const COLORS = ['a', 'b', 'c', 'd', 'e', 'f'];

export function buildDefaultConfig() {
  return {
    version: 1,
    workouts: [
      {
        id: 'workout_a',
        label: 'A',
        color: 'a',
        exercises: WORKOUTS.A.map((ex) => ({ ...ex })),
      },
      {
        id: 'workout_b',
        label: 'B',
        color: 'b',
        exercises: WORKOUTS.B.map((ex) => ({ ...ex })),
      },
    ],
  };
}

export function loadConfigFromStorage() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.workouts)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfigToStorage(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function fetchConfigFromSheets() {
  const url = getApiUrl();
  if (!url) return null;
  try {
    const response = await fetch(`${url}?action=getConfig`);
    const result = await response.json();
    if (result.status === 'ok' && result.data) return result.data;
    return null;
  } catch {
    return null;
  }
}

export async function saveConfigToSheets(config) {
  const url = getApiUrl();
  if (!url) throw new Error('No API URL configured');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveConfig', config }),
  });
  const result = await response.json();
  if (result.status !== 'ok') throw new Error(result.message || 'Config save failed');
  return result;
}

export async function fetchExercisesFromSheets() {
  const url = getApiUrl();
  if (!url) return null;
  try {
    const response = await fetch(`${url}?action=getExercises`);
    const result = await response.json();
    if (result.status === 'ok' && result.data) return result.data;
    return null;
  } catch {
    return null;
  }
}

export function saveExerciseToSheets(exercise) {
  const url = getApiUrl();
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveExercise', exercise }),
  }).catch(() => {});
}

export function generateExerciseId(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${slug}_${Date.now().toString(36)}`;
}

export function nextAvailableColor(usedColors) {
  return COLORS.find((c) => !usedColors.includes(c)) ?? 'a';
}
