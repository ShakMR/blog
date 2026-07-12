import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// A per-render arithmetic challenge, signed so it can be verified statelessly.
// The token carries only the expiry + an HMAC over the correct answer, so it
// never reveals the answer and can't be forged without the server secret.
const CHALLENGE_TTL_MS = 2 * 60 * 60 * 1000; // 2h, matches the max submit window

export interface CommentChallenge {
  a: number;
  b: number;
  token: string;
}

function resolveSecret(override?: string): string {
  const secret =
    override ??
    import.meta.env.COMMENT_CHALLENGE_SECRET ??
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error('Missing signing secret for the comment challenge.');
  }
  return secret;
}

function sign(answer: number, exp: number, secret: string): string {
  return createHmac('sha256', secret).update(`${answer}:${exp}`).digest('hex');
}

export function createChallenge(now = Date.now(), secret?: string): CommentChallenge {
  const key = resolveSecret(secret);
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  const exp = now + CHALLENGE_TTL_MS;

  return { a, b, token: `${exp}.${sign(a + b, exp, key)}` };
}

export function verifyChallenge(answer: string, token: string, now = Date.now(), secret?: string): boolean {
  const numericAnswer = Number((answer ?? '').trim());
  if (!Number.isInteger(numericAnswer)) {
    return false;
  }

  const [expPart, signature] = (token ?? '').split('.');
  const exp = Number(expPart);
  if (!Number.isInteger(exp) || exp < now) {
    return false;
  }

  const expected = sign(numericAnswer, exp, resolveSecret(secret));
  if (!signature || signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
