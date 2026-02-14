export const siteConfig = {
  name: 'A poc a poc i amb bona lletra',
  description:
    'Un blog de relatos cortos con edición cuidada, publicación pausada y lectura sin ruido.',
  locales: ['es', 'ca', 'en'] as const,
  defaultLocale: 'es' as const,
};

export type SupportedLocale = (typeof siteConfig.locales)[number];
