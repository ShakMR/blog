import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthorWelcomeEmail,
  isInviteEmailConfigured,
  sendInviteEmail,
} from '../../src/lib/email/relay';

describe('invite email', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reports delivery as configured only when Resend env vars exist', () => {
    expect(isInviteEmailConfigured()).toBe(false);

    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM', 'Blog <invites@blog.example.com>');
    expect(isInviteEmailConfigured()).toBe(true);
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

  it('posts the expected payload to the Resend API', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM', 'Blog <invites@blog.example.com>');

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);

    await sendInviteEmail({
      toEmail: 'author@example.com',
      toName: 'Author Example',
      subject: 'Hello',
      text: 'Plain',
      html: '<p>Plain</p>',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.authorization).toBe('Bearer re_test_key');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Blog <invites@blog.example.com>',
      to: ['author@example.com'],
      subject: 'Hello',
      text: 'Plain',
      html: '<p>Plain</p>',
    });
  });

  it('throws a typed error when Resend is not configured', async () => {
    await expect(
      sendInviteEmail({ toEmail: 'author@example.com', subject: 'Hello', text: 'Plain', html: '<p>Plain</p>' }),
    ).rejects.toMatchObject({ code: 'not_configured' });
  });

  it('throws a delivery error when Resend responds non-2xx', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM', 'Blog <invites@blog.example.com>');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));

    await expect(
      sendInviteEmail({ toEmail: 'author@example.com', subject: 'Hello', text: 'Plain', html: '<p>Plain</p>' }),
    ).rejects.toMatchObject({ code: 'delivery_failed' });
  });
});
