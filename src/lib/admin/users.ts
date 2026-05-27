import { z } from 'zod';
import { siteConfig } from '../../config/site';
import { createServiceRoleClient } from '../supabase/server';
import { slugify } from '../stories/utils';

const createAuthorAccountSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional().default(''),
  locale: z.enum(siteConfig.locales),
  password: z.string().min(10).max(72),
});

export type CreateAuthorAccountInput = z.infer<typeof createAuthorAccountSchema>;

export class CreateAuthorAccountError extends Error {
  code: 'email_taken' | 'create_failed';

  constructor(code: 'email_taken' | 'create_failed', message: string) {
    super(message);
    this.code = code;
  }
}

function getBaseSlug(input: Pick<CreateAuthorAccountInput, 'slug' | 'displayName' | 'email'>) {
  const explicitSlug = slugify(input.slug ?? '');
  if (explicitSlug.length > 0) {
    return explicitSlug;
  }

  const displayNameSlug = slugify(input.displayName);
  if (displayNameSlug.length > 0) {
    return displayNameSlug;
  }

  const emailPrefix = input.email.split('@')[0] ?? 'author';
  return slugify(emailPrefix) || `author-${crypto.randomUUID().slice(0, 8)}`;
}

async function resolveUniqueAuthorSlug(candidate: string) {
  const serviceClient = createServiceRoleClient();
  let slug = candidate;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await serviceClient
      .from('authors')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new CreateAuthorAccountError('create_failed', error.message);
    }

    if (!data) {
      return slug;
    }

    slug = `${candidate}-${crypto.randomUUID().slice(0, 6)}`;
  }

  throw new CreateAuthorAccountError('create_failed', 'Unable to allocate a unique author slug.');
}

export function parseCreateAuthorAccountInput(input: unknown) {
  return createAuthorAccountSchema.safeParse(input);
}

export async function createAuthorAccount(rawInput: CreateAuthorAccountInput) {
  const input = createAuthorAccountSchema.parse(rawInput);
  const serviceClient = createServiceRoleClient();

  const baseSlug = getBaseSlug(input);
  const slug = await resolveUniqueAuthorSlug(baseSlug);

  const { data: createdUser, error: createUserError } = await serviceClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createUserError) {
    if (createUserError.message.includes('already been registered')) {
      throw new CreateAuthorAccountError('email_taken', createUserError.message);
    }

    throw new CreateAuthorAccountError('create_failed', createUserError.message);
  }

  const userId = createdUser.user?.id;
  if (!userId) {
    throw new CreateAuthorAccountError('create_failed', 'Supabase did not return the created user id.');
  }

  const { error: profileError } = await serviceClient.from('profiles').insert({
    id: userId,
    role: 'author',
    display_name: input.displayName,
    locale: input.locale,
  });

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(userId);
    throw new CreateAuthorAccountError('create_failed', profileError.message);
  }

  const { error: authorError } = await serviceClient.from('authors').insert({
    id: userId,
    slug,
    display_name: input.displayName,
    grammatical_gender: 'neutral',
    bio: '',
  });

  if (authorError) {
    await serviceClient.auth.admin.deleteUser(userId);
    throw new CreateAuthorAccountError('create_failed', authorError.message);
  }

  return {
    userId,
    email: input.email,
    displayName: input.displayName,
    locale: input.locale,
    slug,
  };
}
