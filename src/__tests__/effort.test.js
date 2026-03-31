import { describe, it, expect } from 'vitest';
import { normalizeEffort } from '../utils/effort';

describe('normalizeEffort', () => {
  it('returns null/null when both inputs are empty', () => {
    expect(normalizeEffort(null, null)).toEqual({ rpe: null, rir: null, error: null });
    expect(normalizeEffort('', '')).toEqual({ rpe: null, rir: null, error: null });
    expect(normalizeEffort(undefined, undefined)).toEqual({ rpe: null, rir: null, error: null });
  });

  it('derives RIR from RPE when only RPE is given', () => {
    expect(normalizeEffort(8, null)).toEqual({ rpe: 8, rir: 2, error: null });
    expect(normalizeEffort(9.5, '')).toEqual({ rpe: 9.5, rir: 0.5, error: null });
    expect(normalizeEffort(6, null)).toEqual({ rpe: 6, rir: 4, error: null });
  });

  it('derives RPE from RIR when only RIR is given', () => {
    expect(normalizeEffort(null, 2)).toEqual({ rpe: 8, rir: 2, error: null });
    expect(normalizeEffort('', 0)).toEqual({ rpe: 10, rir: 0, error: null });
    expect(normalizeEffort(null, 1.5)).toEqual({ rpe: 8.5, rir: 1.5, error: null });
  });

  it('uses RPE as source of truth when both are given (recalculates RIR)', () => {
    expect(normalizeEffort(8, 0)).toEqual({ rpe: 8, rir: 2, error: null });
  });

  it('rejects RPE below 6', () => {
    expect(normalizeEffort(5.5, null).error).toBeTruthy();
    expect(normalizeEffort(0, null).error).toBeTruthy();
  });

  it('rejects RPE above 10', () => {
    expect(normalizeEffort(10.5, null).error).toBeTruthy();
  });

  it('rejects RPE that is not a 0.5 step', () => {
    expect(normalizeEffort(7.3, null).error).toBeTruthy();
    expect(normalizeEffort(8.1, null).error).toBeTruthy();
  });

  it('rejects RIR below 0', () => {
    expect(normalizeEffort(null, -0.5).error).toBeTruthy();
  });

  it('rejects RIR above 4', () => {
    expect(normalizeEffort(null, 4.5).error).toBeTruthy();
    expect(normalizeEffort(null, 5).error).toBeTruthy();
  });

  it('rejects RIR that is not a 0.5 step', () => {
    expect(normalizeEffort(null, 1.3).error).toBeTruthy();
  });

  it('accepts boundary values RPE 10 and RIR 0', () => {
    expect(normalizeEffort(10, null)).toEqual({ rpe: 10, rir: 0, error: null });
    expect(normalizeEffort(null, 0)).toEqual({ rpe: 10, rir: 0, error: null });
  });
});
