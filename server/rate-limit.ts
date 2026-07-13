interface AttemptBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, AttemptBucket>();

const LOGIN_MAX = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const API_MAX = 400;
const API_WINDOW_MS = 60 * 1000;

const AUTH_MAX = 30;
const AUTH_WINDOW_MS = 60 * 1000;

const SENSITIVE_MAX = 5;
const SENSITIVE_WINDOW_MS = 15 * 60 * 1000;

function key(ip: string, email: string) {
  return `${ip}:${email.toLowerCase()}`;
}

function bump(bucketKey: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  let bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(bucketKey, bucket);
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function checkLoginRateLimit(ip: string, email: string): { allowed: boolean; retryAfterSec?: number } {
  return bump(key(ip, email), LOGIN_MAX, LOGIN_WINDOW_MS);
}

export function clearLoginRateLimit(ip: string, email: string) {
  buckets.delete(key(ip, email));
}

export function checkApiRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  return bump(`api:${ip}`, API_MAX, API_WINDOW_MS);
}

export function checkAuthEndpointRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  return bump(`auth:${ip}`, AUTH_MAX, AUTH_WINDOW_MS);
}

export function checkSensitiveActionRateLimit(ip: string, userId: string): { allowed: boolean; retryAfterSec?: number } {
  return bump(`sensitive:${userId}:${ip}`, SENSITIVE_MAX, SENSITIVE_WINDOW_MS);
}