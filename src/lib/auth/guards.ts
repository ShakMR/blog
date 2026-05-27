import type { APIContext } from 'astro';
import { getAccessTokenFromCookies, getAuthenticatedAuthorContext, isAdminRole } from './session';

export async function requireAuthorContext(context: APIContext) {
  const accessToken = getAccessTokenFromCookies(context.cookies);

  if (!accessToken) {
    return null;
  }

  const authorContext = await getAuthenticatedAuthorContext(accessToken);

  if (!authorContext) {
    return null;
  }

  return {
    accessToken,
    authorContext,
  };
}

export async function requireAdminContext(context: APIContext) {
  const guard = await requireAuthorContext(context);

  if (!guard || !isAdminRole(guard.authorContext.profile.role)) {
    return null;
  }

  return guard;
}
