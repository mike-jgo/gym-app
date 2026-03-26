import { describe, it, expect, vi } from 'vitest';

// Prevent createClient from executing with undefined env vars at module load
// time. The pure functions (computeLastLifts, computePersonalBests) do not
// touch the Supabase client at all — only calc1RM — so a no-op stub is enough.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

import { computeLastLifts, computePersonalBests } from '../utils/supabase';

// ── helpers ────────────────────────────────────────────────────────────────

function makeSession(date, exercises) {
  return { date, exercises };
}

function makeExercise(id, sets, totalVolume = 0) {
  return { id, sets, totalVolume };
}

function makeSet(weight, reps) {
  return { weight, reps };
}

// ── computeLastLifts ───────────────────────────────────────────────────────

describe('computeLastLifts', () => {
  it('returns an empty map when given no sessions', () => {
    expect(computeLastLifts([])).toEqual({});
  });

  it('returns an empty map when a session has no exercises array', () => {
    const sessions = [{ date: '2026-01-01' }];
    expect(computeLastLifts(sessions)).toEqual({});
  });

  it('returns an empty map when a session has an empty exercises array', () => {
    const sessions = [makeSession('2026-01-01', [])];
    expect(computeLastLifts(sessions)).toEqual({});
  });

  it('records the date and sets for a single exercise in a single session', () => {
    const sets = [makeSet(100, 5)];
    const sessions = [makeSession('2026-03-01', [makeExercise('bb_bench', sets)])];

    const result = computeLastLifts(sessions);
    expect(result['bb_bench']).toEqual({ date: '2026-03-01', sets });
  });

  it('records the most recent session for each exercise (first in reverse-chrono array)', () => {
    // sessions[0] is most recent, sessions[1] is older
    const recentSets  = [makeSet(110, 3)];
    const olderSets   = [makeSet(100, 5)];
    const sessions = [
      makeSession('2026-03-10', [makeExercise('bb_bench', recentSets)]),
      makeSession('2026-02-01', [makeExercise('bb_bench', olderSets)]),
    ];

    const result = computeLastLifts(sessions);
    expect(result['bb_bench'].date).toBe('2026-03-10');
    expect(result['bb_bench'].sets).toBe(recentSets);
  });

  it('does not overwrite the first (most recent) entry with a later session', () => {
    // Iteration order: session 0 (most recent) is processed first.
    // The older session must not overwrite the entry.
    const newerSets = [makeSet(120, 1)];
    const olderSets = [makeSet(60, 10)];
    const sessions = [
      makeSession('2026-03-20', [makeExercise('deadlift', newerSets)]),
      makeSession('2026-01-05', [makeExercise('deadlift', olderSets)]),
    ];

    const result = computeLastLifts(sessions);
    expect(result['deadlift'].sets).toBe(newerSets);
    expect(result['deadlift'].date).toBe('2026-03-20');
  });

  it('tracks each distinct exercise independently', () => {
    const benchSets = [makeSet(100, 5)];
    const squatSets = [makeSet(120, 4)];
    const sessions = [
      makeSession('2026-03-15', [
        makeExercise('bb_bench', benchSets),
        makeExercise('bb_squat', squatSets),
      ]),
    ];

    const result = computeLastLifts(sessions);
    expect(result['bb_bench'].sets).toBe(benchSets);
    expect(result['bb_squat'].sets).toBe(squatSets);
  });

  it('picks up an exercise from an older session when it was not in the most recent one', () => {
    const rdlSets   = [makeSet(100, 8)];
    const sessions = [
      makeSession('2026-03-20', [makeExercise('bb_bench', [makeSet(100, 5)])]),
      makeSession('2026-02-10', [makeExercise('rdl', rdlSets)]),
    ];

    const result = computeLastLifts(sessions);
    expect(result['rdl']).toEqual({ date: '2026-02-10', sets: rdlSets });
    expect(result['bb_bench']).toBeDefined();
  });
});

// ── computePersonalBests ───────────────────────────────────────────────────

describe('computePersonalBests', () => {
  it('returns an empty map when given no sessions', () => {
    expect(computePersonalBests([])).toEqual({});
  });

  it('returns an empty map when a session has no exercises', () => {
    const sessions = [{ date: '2026-01-01' }];
    expect(computePersonalBests(sessions)).toEqual({});
  });

  it('initialises a PB record for a newly encountered exercise', () => {
    const sessions = [makeSession('2026-01-01', [makeExercise('bb_bench', [], 0)])];
    const result = computePersonalBests(sessions);
    expect(result['bb_bench']).toBeDefined();
    expect(result['bb_bench']).toHaveProperty('best1RM');
    expect(result['bb_bench']).toHaveProperty('bestWeight');
    expect(result['bb_bench']).toHaveProperty('bestVolume');
  });

  it('computes best1RM using the Brzycki formula for a single set', () => {
    // calc1RM(100, 5) = 100 * 36/32 = 112.5
    const sessions = [
      makeSession('2026-03-01', [makeExercise('bb_bench', [makeSet(100, 5)], 500)]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['bb_bench'].best1RM).toBeCloseTo(112.5, 1);
    expect(result['bb_bench'].best1RMDate).toBe('2026-03-01');
  });

  it('picks the highest 1RM across multiple sets in the same session', () => {
    // set 1: calc1RM(80, 8) ≈ 101.6   set 2: calc1RM(100, 5) = 112.5
    const sessions = [
      makeSession('2026-03-01', [
        makeExercise('bb_bench', [makeSet(80, 8), makeSet(100, 5)], 900),
      ]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['bb_bench'].best1RM).toBeCloseTo(112.5, 1);
  });

  it('finds the all-time best 1RM across multiple sessions', () => {
    // Older session has heavier lift
    const sessions = [
      makeSession('2026-03-10', [makeExercise('bb_bench', [makeSet(80, 5)], 400)]),
      makeSession('2026-01-01', [makeExercise('bb_bench', [makeSet(120, 3)], 360)]),
    ];
    // calc1RM(120,3) = 120*(36/34) ≈ 127.06   calc1RM(80,5) = 80*(36/32) = 90
    const result = computePersonalBests(sessions);
    expect(result['bb_bench'].best1RM).toBeCloseTo(120 * (36 / 34), 1);
    expect(result['bb_bench'].best1RMDate).toBe('2026-01-01');
  });

  it('tracks bestWeight and bestWeightReps independently from best1RM', () => {
    // Heavy single: weight=150 reps=1 → 1RM=150
    // Lighter set with higher e1RM: weight=100 reps=5 → 1RM=112.5
    // bestWeight should be 150, best1RM should be 150 (from the heavy single)
    const sessions = [
      makeSession('2026-03-01', [
        makeExercise('bb_bench', [makeSet(150, 1), makeSet(100, 5)], 650),
      ]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['bb_bench'].bestWeight).toBe(150);
    expect(result['bb_bench'].bestWeightReps).toBe(1);
    expect(result['bb_bench'].best1RM).toBe(150); // 1RM of a single = weight
  });

  it('finds bestWeight across multiple sessions', () => {
    const sessions = [
      makeSession('2026-03-10', [makeExercise('deadlift', [makeSet(180, 3)], 540)]),
      makeSession('2026-01-05', [makeExercise('deadlift', [makeSet(200, 1)], 200)]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['deadlift'].bestWeight).toBe(200);
    expect(result['deadlift'].bestWeightDate).toBe('2026-01-05');
  });

  it('computes bestVolume from exercise.totalVolume', () => {
    const sessions = [
      makeSession('2026-03-10', [makeExercise('bb_squat', [makeSet(100, 5)], 1500)]),
      makeSession('2026-02-01', [makeExercise('bb_squat', [makeSet(90, 5)], 1350)]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['bb_squat'].bestVolume).toBe(1500);
    expect(result['bb_squat'].bestVolumeDate).toBe('2026-03-10');
  });

  it('handles exercises with no sets gracefully (does not throw)', () => {
    const sessions = [makeSession('2026-03-01', [makeExercise('bb_bench', [], 0)])];
    expect(() => computePersonalBests(sessions)).not.toThrow();
    const result = computePersonalBests(sessions);
    expect(result['bb_bench'].best1RM).toBe(0);
    expect(result['bb_bench'].bestWeight).toBe(0);
  });

  it('handles exercises with a null/undefined sets field gracefully', () => {
    const sessions = [
      makeSession('2026-03-01', [{ id: 'bb_bench', totalVolume: 0 }]),
    ];
    expect(() => computePersonalBests(sessions)).not.toThrow();
  });

  it('tracks multiple distinct exercises independently', () => {
    const sessions = [
      makeSession('2026-03-01', [
        makeExercise('bb_bench', [makeSet(100, 5)], 500),
        makeExercise('bb_squat', [makeSet(140, 5)], 700),
      ]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['bb_bench']).toBeDefined();
    expect(result['bb_squat']).toBeDefined();
    expect(result['bb_bench'].bestWeight).toBe(100);
    expect(result['bb_squat'].bestWeight).toBe(140);
  });

  it('rounds best1RM to one decimal place', () => {
    // calc1RM(95, 7): 95 * 36/30 = 95 * 1.2 = 114.0 exactly for this case
    // Use a value that produces a non-trivial decimal: weight=73 reps=6
    // 73 * (36 / 31) = 73 * 1.16129... = 84.774...  → rounds to 84.8
    const sessions = [
      makeSession('2026-03-01', [makeExercise('ohp', [makeSet(73, 6)], 438)]),
    ];
    const result = computePersonalBests(sessions);
    const expected = Math.round(73 * (36 / 31) * 10) / 10;
    expect(result['ohp'].best1RM).toBe(expected);
  });

  it('does not update bestWeight when a lighter set is encountered later', () => {
    const sessions = [
      makeSession('2026-03-10', [makeExercise('bb_bench', [makeSet(60, 10)], 600)]),
      makeSession('2026-01-01', [makeExercise('bb_bench', [makeSet(110, 2)], 220)]),
    ];
    const result = computePersonalBests(sessions);
    expect(result['bb_bench'].bestWeight).toBe(110);
  });
});
