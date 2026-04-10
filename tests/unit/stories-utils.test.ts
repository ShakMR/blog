import { describe, expect, it } from 'vitest';
import { parseTags, slugify } from '../../src/lib/stories/utils';

describe('stories utils', () => {
  it('slugifies title text', () => {
    expect(slugify('Árbol de la Vida!')).toBe('arbol-de-la-vida');
  });

  it('parses deduplicated tags', () => {
    expect(parseTags('cuento, fantasia, Cuento,  ')).toEqual(['cuento', 'fantasia']);
  });
});
