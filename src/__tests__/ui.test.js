import { describe, it, expect } from 'vitest';
import { syncDotClass } from '../utils/ui';

describe('syncDotClass', () => {
  it('returns green classes for connected', () => {
    expect(syncDotClass('connected')).toBe('bg-green shadow-[0_0_8px_var(--green-dim)]');
  });

  it('returns yellow + pulse classes for syncing', () => {
    expect(syncDotClass('syncing')).toBe('bg-yellow animate-pulse-dot');
  });

  it('returns red class for error', () => {
    expect(syncDotClass('error')).toBe('bg-red');
  });

  it('returns muted class for unknown status', () => {
    expect(syncDotClass('unknown')).toBe('bg-muted');
  });

  it('returns muted class for undefined', () => {
    expect(syncDotClass(undefined)).toBe('bg-muted');
  });

  it('returns muted class for empty string', () => {
    expect(syncDotClass('')).toBe('bg-muted');
  });
});
