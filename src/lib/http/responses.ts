import type { APIContext, APIRoute } from 'astro';

/** Consistent JSON error body for programmatic API routes. */
export function jsonError(status: number, code: string, message?: string): Response {
  return Response.json({ error: { code, message: message ?? code } }, { status });
}

/**
 * Wrap an API handler so any unexpected throw returns a safe fallback response
 * (built by `onError`) instead of an unhandled 500. Expected/validation errors
 * are still handled inside each route; this is the last-resort net.
 */
export function withApiErrorHandling(
  handler: APIRoute,
  onError: (context: APIContext) => Response | Promise<Response>,
): APIRoute {
  return async (context) => {
    try {
      return (await handler(context)) as Response;
    } catch {
      return onError(context);
    }
  };
}
