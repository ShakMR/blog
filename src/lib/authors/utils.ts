import type { SupportedLocale } from '../../config/site';

export type GrammaticalGender = 'masculine' | 'feminine' | 'neutral';

export function getAuthorNoun(locale: SupportedLocale, gender: GrammaticalGender): string {
  if (locale === 'en') {
    return 'Author';
  }

  if (locale === 'ca') {
    if (gender === 'feminine') return 'Autora';
    if (gender === 'masculine') return 'Autor';
    return 'Autor/a';
  }

  if (gender === 'feminine') return 'Autora';
  if (gender === 'masculine') return 'Autor';
  return 'Autor/a';
}

export function getAboutAuthorLabel(locale: SupportedLocale, gender: GrammaticalGender): string {
  if (locale === 'en') {
    return 'About the author';
  }

  if (locale === 'ca') {
    if (gender === 'feminine') return "Sobre l'autora";
    if (gender === 'masculine') return "Sobre l'autor";
    return "Sobre l'autoria";
  }

  if (gender === 'feminine') return 'Sobre la autora';
  if (gender === 'masculine') return 'Sobre el autor';
  return 'Sobre la autoria';
}
