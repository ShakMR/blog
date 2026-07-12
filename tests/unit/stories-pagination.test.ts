import { describe, expect, it } from 'vitest';
import { parsePageParam } from '../../src/lib/stories/pagination';

describe('parsePageParam', () => {
  it('accepts positive integers', () => {
    expect(parsePageParam('1')).toBe(1);
    expect(parsePageParam('7')).toBe(7);
  });

  it('falls back to 1 for invalid, missing, or non-positive values', () => {
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-3')).toBe(1);
    expect(parsePageParam('2.5')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
  });
});
