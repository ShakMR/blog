import { z } from 'zod';

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  RESEND_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:4321'),
});

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface InviteEmailMessage {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailDeliveryError extends Error {
  code: 'not_configured' | 'delivery_failed';

  constructor(code: 'not_configured' | 'delivery_failed', message: string) {
    super(message);
    this.code = code;
  }
}

function getEmailEnv() {
  return emailEnvSchema.parse(import.meta.env);
}

/** True when Resend is configured to actually deliver invite emails. */
export function isInviteEmailConfigured(): boolean {
  const env = getEmailEnv();
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM);
}

export function buildAuthorWelcomeEmail(input: {
  email: string;
  displayName: string;
  temporaryPassword: string;
}): InviteEmailMessage {
  const env = getEmailEnv();
  const loginUrl = new URL('/auth/login', env.PUBLIC_APP_URL).toString();

  return {
    toEmail: input.email,
    toName: input.displayName,
    subject: 'Tu cuenta de autora ya está lista',
    text: [
      `Hola ${input.displayName},`,
      '',
      'Ya tienes acceso al espacio de autor.',
      `Email: ${input.email}`,
      `Contrasena temporal: ${input.temporaryPassword}`,
      `Acceso: ${loginUrl}`,
      '',
      'Por seguridad, cambia la contrasena despues de iniciar sesion.',
    ].join('\n'),
    html: [
      `<p>Hola ${escapeHtml(input.displayName)},</p>`,
      '<p>Ya tienes acceso al espacio de autor.</p>',
      '<ul>',
      `<li>Email: <strong>${escapeHtml(input.email)}</strong></li>`,
      `<li>Contrasena temporal: <strong>${escapeHtml(input.temporaryPassword)}</strong></li>`,
      `<li>Acceso: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></li>`,
      '</ul>',
      '<p>Por seguridad, cambia la contrasena despues de iniciar sesion.</p>',
    ].join(''),
  };
}

/** Deliver an invite email through Resend. Throws EmailDeliveryError on failure. */
export async function sendInviteEmail(message: InviteEmailMessage): Promise<void> {
  const env = getEmailEnv();

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    throw new EmailDeliveryError('not_configured', 'Missing RESEND_API_KEY or RESEND_FROM.');
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [message.toEmail],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(env.RESEND_TIMEOUT_MS ?? 10000),
  });

  if (!response.ok) {
    throw new EmailDeliveryError('delivery_failed', `Resend returned ${response.status}.`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
