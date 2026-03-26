import { fetchWorkouts, saveConfig as saveConfigToSupabase } from './supabase';
import { DEFAULT_WORKOUTS } from './workouts';

export const CONFIG_KEY = 'fbeod_config';

const COLORS = ['a', 'b', 'c', 'd', 'e', 'f'];

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

export async function fetchConfigFromSupabase() {
  return fetchWorkouts();
}

export async function saveConfig(config) {
  saveConfigToStorage(config);
  await saveConfigToSupabase(config);
}

export async function seedDefaultWorkouts() {
  await saveConfigToSupabase({ version: 1, workouts: DEFAULT_WORKOUTS });
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
