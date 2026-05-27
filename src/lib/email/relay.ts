import { z } from 'zod';

const emailRelayEnvSchema = z.object({
  GMAIL_RELAY_URL: z.string().url().optional(),
  GMAIL_RELAY_TOKEN: z.string().min(1).optional(),
  GMAIL_RELAY_FROM_EMAIL: z.string().email().optional(),
  GMAIL_RELAY_FROM_NAME: z.string().min(1).optional(),
  GMAIL_RELAY_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:4321'),
});

export interface RelayEmailMessage {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailRelayError extends Error {
  code: 'misconfigured' | 'delivery_failed';

  constructor(code: 'misconfigured' | 'delivery_failed', message: string) {
    super(message);
    this.code = code;
  }
}

function getEmailRelayEnv() {
  return emailRelayEnvSchema.parse(import.meta.env);
}

export function getEmailRelayStatus() {
  const env = getEmailRelayEnv();
  const hasAnyRelayConfig = Boolean(
    env.GMAIL_RELAY_URL || env.GMAIL_RELAY_TOKEN || env.GMAIL_RELAY_FROM_EMAIL || env.GMAIL_RELAY_FROM_NAME,
  );
  const isConfigured = Boolean(env.GMAIL_RELAY_URL && env.GMAIL_RELAY_FROM_EMAIL);

  return {
    hasAnyRelayConfig,
    isConfigured,
  };
}

export function buildAuthorWelcomeEmail(input: {
  email: string;
  displayName: string;
  temporaryPassword: string;
}) {
  const env = getEmailRelayEnv();
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
  } satisfies RelayEmailMessage;
}

export async function sendRelayEmail(message: RelayEmailMessage) {
  const env = getEmailRelayEnv();

  if (!env.GMAIL_RELAY_URL || !env.GMAIL_RELAY_FROM_EMAIL) {
    throw new EmailRelayError('misconfigured', 'Missing GMAIL_RELAY_URL or GMAIL_RELAY_FROM_EMAIL.');
  }

  const response = await fetch(env.GMAIL_RELAY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(env.GMAIL_RELAY_TOKEN ? { authorization: `Bearer ${env.GMAIL_RELAY_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      from: {
        email: env.GMAIL_RELAY_FROM_EMAIL,
        name: env.GMAIL_RELAY_FROM_NAME,
      },
      to: [
        {
          email: message.toEmail,
          name: message.toName,
        },
      ],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(env.GMAIL_RELAY_TIMEOUT_MS ?? 10000),
  });

  if (!response.ok) {
    throw new EmailRelayError('delivery_failed', `Relay returned ${response.status}.`);
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
