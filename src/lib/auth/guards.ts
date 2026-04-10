import type { APIContext } from 'astro';
import { getAccessTokenFromCookies, getAuthenticatedAuthorContext } from './session';

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
