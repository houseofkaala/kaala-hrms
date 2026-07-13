import crypto from 'crypto';
import { getDb, saveDb } from './db';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ip?: string;
  userAgent?: string;
}

function pruneExpired() {
  const now = Date.now();
  const db = getDb();
  if (!db.sessions) db.sessions = [];
  const before = db.sessions.length;
  db.sessions = db.sessions.filter(s => new Date(s.expiresAt).getTime() > now);
  if (db.sessions.length !== before) saveDb();
}

export function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string },
): string {
  pruneExpired();
  const token = crypto.randomUUID();
  const now = new Date();
  const record: SessionRecord = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  };
  const db = getDb();
  if (!db.sessions) db.sessions = [];
  db.sessions.push(record);
  saveDb();
  return token;
}

export function resolveSession(token: string): string | null {
  pruneExpired();
  const db = getDb();
  const session = db.sessions?.find(s => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    deleteSession(token);
    return null;
  }
  return session.userId;
}

export function deleteSession(token: string) {
  const db = getDb();
  if (!db.sessions) return;
  const before = db.sessions.length;
  db.sessions = db.sessions.filter(s => s.token !== token);
  if (db.sessions.length !== before) saveDb();
}

export function revokeOtherSessions(userId: string, keepToken?: string) {
  const db = getDb();
  if (!db.sessions) return;
  const before = db.sessions.length;
  db.sessions = db.sessions.filter(s => s.userId !== userId || (keepToken != null && s.token === keepToken));
  if (db.sessions.length !== before) saveDb();
}

export function deleteSessionsForUser(userId: string) {
  revokeOtherSessions(userId);
}

export function listSessionsForUser(userId: string): SessionRecord[] {
  pruneExpired();
  const db = getDb();
  const now = Date.now();
  return (db.sessions || [])
    .filter(s => s.userId === userId && new Date(s.expiresAt).getTime() > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}