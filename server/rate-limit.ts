interface AttemptBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, AttemptBucket>();

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function key(ip: string, email: string) {
  return `${ip}:${email.toLowerCase()}`;
}

export function checkLoginRateLimit(ip: string, email: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const k = key(ip, email);
  let bucket = buckets.get(k);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(k, bucket);
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function clearLoginRateLimit(ip: string, email: string) {
  buckets.delete(key(ip, email));
}