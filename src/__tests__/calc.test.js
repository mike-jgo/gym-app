import { describe, it, expect } from 'vitest';
import { calc1RM } from '../utils/calc';

describe('calc1RM — Brzycki formula', () => {
  // ── Happy path ─────────────────────────────────────────────────

  it('returns weight unchanged when reps is 1', () => {
    expect(calc1RM(100, 1)).toBe(100);
    expect(calc1RM(60, 1)).toBe(60);
  });

  it('computes correct 1RM for weight=100 reps=5', () => {
    // Brzycki: 100 * (36 / (37 - 5)) = 100 * (36 / 32) = 112.5
    const result = calc1RM(100, 5);
    expect(result).toBeCloseTo(112.5, 5);
  });

  it('computes correct 1RM for weight=80 reps=10', () => {
    // 80 * (36 / (37 - 10)) = 80 * (36 / 27) ≈ 106.666...
    const result = calc1RM(80, 10);
    expect(result).toBeCloseTo(80 * (36 / 27), 10);
  });

  it('computes correct 1RM for weight=140 reps=3', () => {
    // 140 * (36 / (37 - 3)) = 140 * (36 / 34) ≈ 148.235...
    const result = calc1RM(140, 3);
    expect(result).toBeCloseTo(140 * (36 / 34), 10);
  });

  // ── Edge cases — should return 0 ───────────────────────────────

  it('returns 0 when weight is 0', () => {
    expect(calc1RM(0, 5)).toBe(0);
  });

  it('returns 0 when weight is negative', () => {
    expect(calc1RM(-10, 5)).toBe(0);
  });

  it('returns 0 when reps is 0', () => {
    expect(calc1RM(100, 0)).toBe(0);
  });

  it('returns 0 when reps is negative', () => {
    expect(calc1RM(100, -1)).toBe(0);
  });

  it('returns 0 when reps is greater than 30', () => {
    expect(calc1RM(50, 31)).toBe(0);
    expect(calc1RM(50, 100)).toBe(0);
  });

  it('does NOT return 0 when reps is exactly 30 (boundary is inclusive on valid side)', () => {
    // reps=30 is valid: 36 / (37-30) = 36/7 ≈ 5.14...
    const result = calc1RM(50, 30);
    expect(result).toBeCloseTo(50 * (36 / 7), 10);
  });

  it('returns 0 when weight is null or undefined', () => {
    expect(calc1RM(null, 5)).toBe(0);
    expect(calc1RM(undefined, 5)).toBe(0);
  });

  it('returns 0 when reps is null or undefined', () => {
    expect(calc1RM(100, null)).toBe(0);
    expect(calc1RM(100, undefined)).toBe(0);
  });
});
