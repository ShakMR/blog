import { describe, expect, it } from 'vitest';
import { createChallenge, verifyChallenge } from '../../src/lib/comments/challenge';

const SECRET = 'unit-test-signing-secret';
const now = 1_800_000_000_000;

describe('comment challenge', () => {
  it('accepts the correct answer to a fresh challenge', () => {
    const { a, b, token } = createChallenge(now, SECRET);
    expect(verifyChallenge(String(a + b), token, now, SECRET)).toBe(true);
  });

  it('rejects a wrong answer', () => {
    const { a, b, token } = createChallenge(now, SECRET);
    expect(verifyChallenge(String(a + b + 1), token, now, SECRET)).toBe(false);
  });

  it('rejects a non-numeric answer', () => {
    const { token } = createChallenge(now, SECRET);
    expect(verifyChallenge('abc', token, now, SECRET)).toBe(false);
  });

  it('rejects an expired challenge', () => {
    const { a, b, token } = createChallenge(now, SECRET);
    const later = now + 3 * 60 * 60 * 1000; // past the 2h TTL
    expect(verifyChallenge(String(a + b), token, later, SECRET)).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    const { a, b, token } = createChallenge(now, SECRET);
    expect(verifyChallenge(String(a + b), token, now, 'a-different-secret')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const { a, b, token } = createChallenge(now, SECRET);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyChallenge(String(a + b), tampered, now, SECRET)).toBe(false);
  });
});
