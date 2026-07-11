// Minimal stand-in for the parts of Astro's APIContext that the comments/kudos
// POST handlers actually touch: request.formData(), request.headers, url,
// cookies (get/set), and redirect().

interface MakeContextOptions {
  form: Record<string, string>;
  headers?: Record<string, string>;
  url?: string;
  cookies?: Record<string, string>;
}

export function makeApiContext(options: MakeContextOptions) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(options.form)) {
    formData.set(key, value);
  }

  const headers = new Headers(options.headers ?? {});
  const url = new URL(options.url ?? 'http://localhost:4321/api/test');
  const cookieStore = new Map<string, string>(Object.entries(options.cookies ?? {}));
  const setCookies: Array<{ name: string; value: string }> = [];

  const context = {
    request: {
      formData: async () => formData,
      headers,
    },
    url,
    redirect(location: string, status = 302) {
      return new Response(null, { status, headers: { Location: location } });
    },
    cookies: {
      get(name: string) {
        return cookieStore.has(name) ? { value: cookieStore.get(name) as string } : undefined;
      },
      set(name: string, value: string) {
        cookieStore.set(name, value);
        setCookies.push({ name, value });
      },
      delete(name: string) {
        cookieStore.delete(name);
      },
      has(name: string) {
        return cookieStore.has(name);
      },
    },
  };

  return { context, cookieStore, setCookies };
}

export function readRedirect(response: Response) {
  const location = response.headers.get('location');
  const params = location
    ? new URL(location, 'http://localhost:4321').searchParams
    : new URLSearchParams();
  return { status: response.status, location, params };
}
