import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthorWelcomeEmail,
  getEmailRelayStatus,
  sendRelayEmail,
} from '../../src/lib/email/relay';

describe('email relay', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reports relay as configured only when required env vars exist', () => {
    vi.stubEnv('GMAIL_RELAY_URL', 'https://relay.example.com/send');
    vi.stubEnv('GMAIL_RELAY_FROM_EMAIL', 'noreply@example.com');

    expect(getEmailRelayStatus()).toEqual({
      hasAnyRelayConfig: true,
      isConfigured: true,
    });
  });

  it('builds the welcome email with login URL and temporary password', () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://blog.example.com');

    const email = buildAuthorWelcomeEmail({
      email: 'author@example.com',
      displayName: 'Author Example',
      temporaryPassword: 'TempPass123!',
    });

    expect(email.subject).toContain('cuenta');
    expect(email.text).toContain('TempPass123!');
    expect(email.text).toContain('https://blog.example.com/auth/login');
    expect(email.html).toContain('Author Example');
  });

  it('posts the expected payload to the relay', async () => {
    vi.stubEnv('GMAIL_RELAY_URL', 'https://relay.example.com/send');
    vi.stubEnv('GMAIL_RELAY_FROM_EMAIL', 'noreply@example.com');
    vi.stubEnv('GMAIL_RELAY_FROM_NAME', 'Blog');
    vi.stubEnv('GMAIL_RELAY_TOKEN', 'secret-token');

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    vi.stubGlobal('fetch', fetchSpy);

    await sendRelayEmail({
      toEmail: 'author@example.com',
      toName: 'Author Example',
      subject: 'Hello',
      text: 'Plain',
      html: '<p>Plain</p>',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://relay.example.com/send');
    expect(init.headers.authorization).toBe('Bearer secret-token');
    expect(JSON.parse(init.body as string)).toEqual({
      from: {
        email: 'noreply@example.com',
        name: 'Blog',
      },
      to: [
        {
          email: 'author@example.com',
          name: 'Author Example',
        },
      ],
      subject: 'Hello',
      text: 'Plain',
      html: '<p>Plain</p>',
    });
  });

  it('throws a typed error when the relay is misconfigured', async () => {
    await expect(sendRelayEmail({
      toEmail: 'author@example.com',
      subject: 'Hello',
      text: 'Plain',
      html: '<p>Plain</p>',
    })).rejects.toMatchObject({
      code: 'misconfigured',
    });
  });
});
