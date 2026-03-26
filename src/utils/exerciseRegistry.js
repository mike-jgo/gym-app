import { fetchExercises, insertExercise } from './supabase';

export const REGISTRY_KEY = 'fbeod_exercises';

function normalize(name) {
  return name.toLowerCase().trim();
}

export function loadRegistryFromStorage(userId) {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || parsed._userId !== userId) return {};
    const { _userId, ...registry } = parsed;
    return registry;
  } catch {
    return {};
  }
}

export function saveRegistryToStorage(registry, userId) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify({ _userId: userId, ...registry }));
}

// Fetch all exercises (presets + user custom) from Supabase.
// Falls back to the user-scoped local cache if Supabase is unavailable.
// Returns { [id]: { id, name } } map.
export async function loadRegistry(userId) {
  try {
    const registry = await fetchExercises();
    saveRegistryToStorage(registry, userId);
    return registry;
  } catch {
    return loadRegistryFromStorage(userId);
  }
}

// Returns { id, name, isNew? }
// Checks registry by exact name match; generates new stable ID if not found.
export function resolveExercise(name, registry) {
  const n = normalize(name);
  const existing = Object.values(registry).find((e) => normalize(e.name) === n);
  if (existing) return { id: existing.id, name: existing.name };
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const id = `${slug}_${Date.now().toString(36)}`;
  return { id, name: name.trim(), isNew: true };
}

// Persist a new custom exercise to Supabase + local cache.
export async function addExercise(exercise, registry, userId) {
  await insertExercise(exercise);
  const updated = { ...registry, [exercise.id]: { id: exercise.id, name: exercise.name } };
  saveRegistryToStorage(updated, userId);
  return updated;
}
