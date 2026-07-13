import type { Request } from 'express';
import { getDb, saveDb } from './db';

export type SecurityAuditEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'session_revoked'
  | 'sessions_revoked_others'
  | 'admin_sessions_revoked'
  | 'admin_password_reset';

export interface SecurityAuditEntry {
  id: string;
  event: SecurityAuditEvent;
  userId?: string;
  actorId?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
  createdAt: string;
}

const MAX_ENTRIES = 5000;

export function requestContext(req: Request): { ip?: string; userAgent?: string } {
  const ip = String(req.ip || req.socket?.remoteAddress || '').trim().slice(0, 64);
  const userAgent = String(req.headers['user-agent'] || '').trim().slice(0, 256);
  return {
    ip: ip || undefined,
    userAgent: userAgent || undefined,
  };
}

function ensureAuditLog() {
  const db = getDb() as ReturnType<typeof getDb> & { securityAuditLog?: SecurityAuditEntry[] };
  if (!db.securityAuditLog) db.securityAuditLog = [];
  return db.securityAuditLog;
}

export function logSecurityEvent(
  event: SecurityAuditEvent,
  opts: {
    userId?: string;
    actorId?: string;
    ip?: string;
    userAgent?: string;
    detail?: string;
  } = {},
) {
  const log = ensureAuditLog();
  log.unshift({
    id: `sa${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
    event,
    userId: opts.userId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    detail: opts.detail?.slice(0, 500),
    createdAt: new Date().toISOString(),
  });
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
  saveDb();
}

export function getUserAuditLog(userId: string, limit = 50): SecurityAuditEntry[] {
  const log = ensureAuditLog() as SecurityAuditEntry[];
  return log.filter(e => e.userId === userId || e.actorId === userId).slice(0, limit);
}

export function getOrgAuditLog(limit = 100): SecurityAuditEntry[] {
  return ensureAuditLog() as SecurityAuditEntry[];
}

export function formatAuditEvent(event: SecurityAuditEvent): string {
  const labels: Record<SecurityAuditEvent, string> = {
    login_success: 'Signed in',
    login_failed: 'Failed sign-in',
    logout: 'Signed out',
    password_changed: 'Password changed',
    session_revoked: 'Session ended',
    sessions_revoked_others: 'Other sessions signed out',
    admin_sessions_revoked: 'Sessions revoked by admin',
    admin_password_reset: 'Password reset by admin',
  };
  return labels[event] || event;
}