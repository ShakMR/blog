import { describe, expect, it } from 'vitest';
import { resolveLocale } from '../../src/lib/i18n';

describe('resolveLocale', () => {
  it('returns locale from path prefix when valid', () => {
    expect(resolveLocale('/ca/authors')).toBe('ca');
  });

  it('falls back to default locale when invalid', () => {
    expect(resolveLocale('/fr/home')).toBe('es');
  });
});
