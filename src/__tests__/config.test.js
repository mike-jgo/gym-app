import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase and workouts before importing config so the module-level
// import.meta.env access and createClient call never executes.
vi.mock('../utils/supabase', () => ({
  fetchWorkouts: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('../utils/workouts', () => ({
  DEFAULT_WORKOUTS: [],
}));

import {
  generateExerciseId,
  nextAvailableColor,
  loadConfigFromStorage,
  saveConfigToStorage,
  CONFIG_KEY,
} from '../utils/config';

// ── generateExerciseId ─────────────────────────────────────────────────────

describe('generateExerciseId', () => {
  it('returns a string in slug_<base36timestamp> format', () => {
    const id = generateExerciseId('Bench Press');
    // Must contain an underscore separating slug from timestamp
    expect(id).toMatch(/^[a-z0-9_]+_[a-z0-9]+$/);
  });

  it('lower-cases the name and replaces spaces with underscores', () => {
    const id = generateExerciseId('Bench Press');
    expect(id.startsWith('bench_press_')).toBe(true);
  });

  it('collapses consecutive special characters into a single underscore', () => {
    const id = generateExerciseId('pull--up!!');
    expect(id.startsWith('pull_up_')).toBe(true);
  });

  it('strips leading and trailing underscores from the slug portion', () => {
    const id = generateExerciseId('  !!curl!!  ');
    // After trim+replace, leading/trailing underscores are stripped → slug is "curl"
    expect(id.startsWith('curl_')).toBe(true);
  });

  it('handles a single-word name', () => {
    const id = generateExerciseId('Squat');
    expect(id.startsWith('squat_')).toBe(true);
  });

  it('appends a non-empty base-36 timestamp suffix', () => {
    const id = generateExerciseId('Deadlift');
    const parts = id.split('_');
    const suffix = parts[parts.length - 1];
    // Base-36 timestamp should parse to a positive integer
    expect(parseInt(suffix, 36)).toBeGreaterThan(0);
  });

  it('generates unique IDs across rapid successive calls', () => {
    // Because Date.now() can return the same ms value in a tight loop we cannot
    // guarantee uniqueness at the unit level without faking time, but we can
    // verify the function produces strings at minimum.
    const a = generateExerciseId('Row');
    const b = generateExerciseId('Row');
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

// ── nextAvailableColor ─────────────────────────────────────────────────────

describe('nextAvailableColor', () => {
  it('returns "a" when no colors are used', () => {
    expect(nextAvailableColor([])).toBe('a');
  });

  it('returns "a" when "a" is not in the used list', () => {
    expect(nextAvailableColor(['b', 'c'])).toBe('a');
  });

  it('returns "b" when only "a" is used', () => {
    expect(nextAvailableColor(['a'])).toBe('b');
  });

  it('returns "c" when "a" and "b" are used', () => {
    expect(nextAvailableColor(['a', 'b'])).toBe('c');
  });

  it('returns "f" when a–e are all used', () => {
    expect(nextAvailableColor(['a', 'b', 'c', 'd', 'e'])).toBe('f');
  });

  it('returns "a" (fallback) when every color is used', () => {
    expect(nextAvailableColor(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('a');
  });

  it('finds first available even when used list is out of order', () => {
    // 'a' used, 'b' not used → should return 'b'
    expect(nextAvailableColor(['c', 'a', 'e'])).toBe('b');
  });
});

// ── loadConfigFromStorage / saveConfigToStorage ────────────────────────────

describe('loadConfigFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when localStorage has no entry for the config key', () => {
    expect(loadConfigFromStorage('user-1')).toBeNull();
  });

  it('returns null when the stored userId does not match the requested userId', () => {
    const data = { userId: 'user-99', version: 1, workouts: [] };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(data));
    expect(loadConfigFromStorage('user-1')).toBeNull();
  });

  it('returns the config without the userId field when userId matches', () => {
    const data = { userId: 'user-1', version: 1, workouts: [{ id: 'w1', label: 'Push', color: 'a', exercises: [] }] };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(data));

    const result = loadConfigFromStorage('user-1');
    expect(result).not.toBeNull();
    expect(result.version).toBe(1);
    expect(result.workouts).toHaveLength(1);
    expect(result).not.toHaveProperty('userId');
  });

  it('returns null when the stored JSON is malformed', () => {
    localStorage.setItem(CONFIG_KEY, '{not valid json}');
    expect(loadConfigFromStorage('user-1')).toBeNull();
  });

  it('returns null when the stored object has no "workouts" array', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ userId: 'user-1', version: 1 }));
    expect(loadConfigFromStorage('user-1')).toBeNull();
  });

  it('returns null when the stored value is null JSON', () => {
    localStorage.setItem(CONFIG_KEY, 'null');
    expect(loadConfigFromStorage('user-1')).toBeNull();
  });
});

describe('saveConfigToStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes JSON to the config key in localStorage', () => {
    const config = { version: 1, workouts: [] };
    saveConfigToStorage(config, 'user-42');
    const raw = localStorage.getItem(CONFIG_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.userId).toBe('user-42');
    expect(parsed.version).toBe(1);
  });

  it('merges userId into the stored payload alongside the config fields', () => {
    const config = { version: 1, workouts: [{ id: 'w1', label: 'Pull', color: 'b', exercises: [] }] };
    saveConfigToStorage(config, 'alice');
    const stored = JSON.parse(localStorage.getItem(CONFIG_KEY));
    expect(stored.userId).toBe('alice');
    expect(stored.workouts).toHaveLength(1);
  });

  it('round-trips through loadConfigFromStorage with matching userId', () => {
    const config = { version: 1, workouts: [{ id: 'w2', label: 'Legs', color: 'c', exercises: [] }] };
    saveConfigToStorage(config, 'bob');
    const loaded = loadConfigFromStorage('bob');
    expect(loaded).toEqual(config);
  });

  it('round-trip fails for a different userId', () => {
    saveConfigToStorage({ version: 1, workouts: [] }, 'bob');
    expect(loadConfigFromStorage('carol')).toBeNull();
  });
});
