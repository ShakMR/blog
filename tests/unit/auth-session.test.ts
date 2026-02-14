import { describe, expect, it } from 'vitest';
import { isAuthorRole } from '../../src/lib/auth/session';

describe('isAuthorRole', () => {
  it('allows author and admin roles', () => {
    expect(isAuthorRole('author')).toBe(true);
    expect(isAuthorRole('admin')).toBe(true);
  });
});
