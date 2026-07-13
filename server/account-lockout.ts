import { getDb, saveDb } from './db';
import { pushNotification } from './db';

const MAX_FAILURES = 10;
const LOCKOUT_MS = 30 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

export interface LoginAttemptState {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

function ensureStates(): Record<string, LoginAttemptState> {
  const db = getDb() as ReturnType<typeof getDb> & {
    loginAttemptStates?: Record<string, LoginAttemptState>;
  };
  if (!db.loginAttemptStates) db.loginAttemptStates = {};
  return db.loginAttemptStates;
}

function stateKey(email: string, userId?: string) {
  return userId || email.toLowerCase();
}

export function isAccountLocked(email: string, userId?: string): { locked: boolean; retryAfterSec?: number } {
  const states = ensureStates();
  const st = states[stateKey(email, userId)];
  if (!st?.lockedUntil) return { locked: false };
  const now = Date.now();
  if (st.lockedUntil <= now) {
    delete st.lockedUntil;
    st.count = 0;
    saveDb();
    return { locked: false };
  }
  return { locked: true, retryAfterSec: Math.ceil((st.lockedUntil - now) / 1000) };
}

export function recordLoginFailure(email: string, userId?: string): { locked: boolean; attempts: number } {
  const states = ensureStates();
  const key = stateKey(email, userId);
  const now = Date.now();
  let st = states[key];
  if (!st || now - st.windowStart > WINDOW_MS) {
    st = { count: 0, windowStart: now };
    states[key] = st;
  }
  st.count += 1;

  if (st.count >= MAX_FAILURES) {
    st.lockedUntil = now + LOCKOUT_MS;
    if (userId) {
      pushNotification(
        userId,
        'Account temporarily locked',
        'Too many failed sign-in attempts. Your account is locked for 30 minutes.',
        { triggerId: 'security.account_locked' },
      );
    }
    saveDb();
    return { locked: true, attempts: st.count };
  }

  if (userId && st.count === 5) {
    pushNotification(
      userId,
      'Failed sign-in attempts',
      'Multiple failed sign-in attempts were detected on your account.',
      { triggerId: 'security.failed_attempts' },
    );
    saveDb();
    return { locked: false, attempts: st.count };
  }

  return { locked: false, attempts: st.count };
}

export function clearLoginFailures(email: string, userId?: string) {
  const states = ensureStates();
  delete states[stateKey(email, userId)];
  saveDb();
}