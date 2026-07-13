import crypto from 'crypto';

interface ExchangeEntry {
  token: string;
  expiresAt: number;
}

const codes = new Map<string, ExchangeEntry>();
const TTL_MS = 60_000;

function prune() {
  const now = Date.now();
  for (const [code, entry] of codes) {
    if (entry.expiresAt <= now) codes.delete(code);
  }
}

/** Issue a one-time code so tokens never appear in URLs or server logs. */
export function issueAuthExchangeCode(sessionToken: string): string {
  prune();
  const code = crypto.randomBytes(24).toString('base64url');
  codes.set(code, { token: sessionToken, expiresAt: Date.now() + TTL_MS });
  return code;
}

export function redeemAuthExchangeCode(code: string): string | null {
  prune();
  const entry = codes.get(code);
  if (!entry) return null;
  codes.delete(code);
  if (entry.expiresAt <= Date.now()) return null;
  return entry.token;
}