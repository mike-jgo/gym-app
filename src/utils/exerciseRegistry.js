import { PRESET_EXERCISES } from './workouts';

export const REGISTRY_KEY = 'fbeod_exercises';

function normalize(name) {
  return name.toLowerCase().trim();
}

export function loadRegistry() {
  let stored = {};
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch { /* ignore */ }
  // Presets always present and always authoritative for their IDs
  const registry = { ...stored };
  for (const p of PRESET_EXERCISES) {
    registry[p.id] = { id: p.id, name: p.name };
  }
  return registry;
}

export function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

// Returns { id, name, isNew? }
// Checks presets → registry by name → generates a new stable ID
export function resolveExercise(name, registry) {
  const n = normalize(name);
  const preset = PRESET_EXERCISES.find((p) => normalize(p.name) === n);
  if (preset) return { id: preset.id, name: preset.name };
  const existing = Object.values(registry).find((e) => normalize(e.name) === n);
  if (existing) return { id: existing.id, name: existing.name };
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const id = `${slug}_${Date.now().toString(36)}`;
  return { id, name: name.trim(), isNew: true };
}
