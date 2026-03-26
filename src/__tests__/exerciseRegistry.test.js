import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase before importing exerciseRegistry so the Supabase client is
// never instantiated (import.meta.env would be undefined in the test env).
vi.mock('../utils/supabase', () => ({
  fetchExercises: vi.fn(),
  insertExercise: vi.fn(),
}));

import {
  resolveExercise,
  loadRegistryFromStorage,
  saveRegistryToStorage,
  REGISTRY_KEY,
} from '../utils/exerciseRegistry';

// ── resolveExercise ────────────────────────────────────────────────────────

describe('resolveExercise', () => {
  const registry = {
    bb_bench: { id: 'bb_bench', name: 'Bench Press' },
    bb_squat: { id: 'bb_squat', name: 'Squat' },
    pull_up:  { id: 'pull_up',  name: 'Pull-up' },
  };

  it('returns the existing exercise when the name matches exactly', () => {
    const result = resolveExercise('Bench Press', registry);
    expect(result).toEqual({ id: 'bb_bench', name: 'Bench Press' });
    expect(result).not.toHaveProperty('isNew');
  });

  it('matches case-insensitively', () => {
    const result = resolveExercise('bench press', registry);
    expect(result.id).toBe('bb_bench');
    expect(result).not.toHaveProperty('isNew');
  });

  it('matches with surrounding whitespace in the input name', () => {
    const result = resolveExercise('  Squat  ', registry);
    expect(result.id).toBe('bb_squat');
    expect(result).not.toHaveProperty('isNew');
  });

  it('returns isNew: true when the name is not found', () => {
    const result = resolveExercise('Romanian Deadlift', registry);
    expect(result.isNew).toBe(true);
  });

  it('generates a slug_<base36> id for a new exercise', () => {
    const result = resolveExercise('Romanian Deadlift', registry);
    expect(result.id).toMatch(/^romanian_deadlift_[a-z0-9]+$/);
  });

  it('trims the name stored on a new exercise', () => {
    const result = resolveExercise('  Overhead Press  ', registry);
    expect(result.name).toBe('Overhead Press');
    expect(result.isNew).toBe(true);
  });

  it('returns an empty registry lookup as a new exercise', () => {
    const result = resolveExercise('Cable Row', {});
    expect(result.isNew).toBe(true);
    expect(result.id).toMatch(/^cable_row_[a-z0-9]+$/);
  });

  it('does not return isNew on a found match even if registry has many entries', () => {
    const bigRegistry = { ...registry, rdl: { id: 'rdl', name: 'Romanian Deadlift' } };
    const result = resolveExercise('Romanian Deadlift', bigRegistry);
    expect(result.id).toBe('rdl');
    expect(result).not.toHaveProperty('isNew');
  });
});

// ── loadRegistryFromStorage / saveRegistryToStorage ───────────────────────

describe('loadRegistryFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty object when nothing is stored', () => {
    expect(loadRegistryFromStorage('user-1')).toEqual({});
  });

  it('returns an empty object when the stored userId does not match', () => {
    const data = { userId: 'user-99', bb_bench: { id: 'bb_bench', name: 'Bench Press' } };
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
    expect(loadRegistryFromStorage('user-1')).toEqual({});
  });

  it('returns the registry without the userId field when userId matches', () => {
    const data = {
      userId: 'user-1',
      bb_bench: { id: 'bb_bench', name: 'Bench Press' },
      bb_squat: { id: 'bb_squat', name: 'Squat' },
    };
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));

    const result = loadRegistryFromStorage('user-1');
    expect(result).toEqual({
      bb_bench: { id: 'bb_bench', name: 'Bench Press' },
      bb_squat: { id: 'bb_squat', name: 'Squat' },
    });
    expect(result).not.toHaveProperty('userId');
  });

  it('returns an empty object when the stored JSON is malformed', () => {
    localStorage.setItem(REGISTRY_KEY, '{bad json}');
    expect(loadRegistryFromStorage('user-1')).toEqual({});
  });

  it('returns an empty object when the stored value is null JSON', () => {
    localStorage.setItem(REGISTRY_KEY, 'null');
    expect(loadRegistryFromStorage('user-1')).toEqual({});
  });
});

describe('saveRegistryToStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes JSON to the registry key in localStorage', () => {
    const registry = { bb_bench: { id: 'bb_bench', name: 'Bench Press' } };
    saveRegistryToStorage(registry, 'user-7');
    const raw = localStorage.getItem(REGISTRY_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.userId).toBe('user-7');
    expect(parsed.bb_bench).toEqual({ id: 'bb_bench', name: 'Bench Press' });
  });

  it('round-trips through loadRegistryFromStorage with the matching userId', () => {
    const registry = {
      bb_bench: { id: 'bb_bench', name: 'Bench Press' },
      rdl:      { id: 'rdl',      name: 'Romanian Deadlift' },
    };
    saveRegistryToStorage(registry, 'alice');
    expect(loadRegistryFromStorage('alice')).toEqual(registry);
  });

  it('round-trip returns empty object for a different userId', () => {
    saveRegistryToStorage({ bb_bench: { id: 'bb_bench', name: 'Bench Press' } }, 'alice');
    expect(loadRegistryFromStorage('bob')).toEqual({});
  });

  it('overwrites a previously saved registry for the same key', () => {
    saveRegistryToStorage({ bb_bench: { id: 'bb_bench', name: 'Bench Press' } }, 'user-1');
    saveRegistryToStorage({ rdl: { id: 'rdl', name: 'Deadlift' } }, 'user-1');
    const result = loadRegistryFromStorage('user-1');
    expect(result).toEqual({ rdl: { id: 'rdl', name: 'Deadlift' } });
    expect(result).not.toHaveProperty('bb_bench');
  });
});
