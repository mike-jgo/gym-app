import { fetchExercises, insertExercise } from './supabase';

export const REGISTRY_KEY = 'fbeod_exercises';

function normalize(name) {
  return name.toLowerCase().trim();
}

export function loadRegistryFromStorage() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRegistryToStorage(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

// Fetch all exercises (presets + user custom) from Supabase.
// Returns { [id]: { id, name } } map.
export async function loadRegistry() {
  const registry = await fetchExercises();
  saveRegistryToStorage(registry);
  return registry;
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
export async function addExercise(exercise, registry) {
  await insertExercise(exercise);
  const updated = { ...registry, [exercise.id]: { id: exercise.id, name: exercise.name } };
  saveRegistryToStorage(updated);
  return updated;
}
