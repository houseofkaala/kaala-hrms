import type { Express } from 'express';
import { getDb, getUserById, saveDb } from './db';
import type { AuthedRequest } from './middleware';
import { requireRole } from './middleware';
import {
  deleteSession,
  listSessionsForUser,
  revokeOtherSessions,
  deleteSessionsForUser,
} from './sessions';
import {
  assertActiveUser,
  assertManager,
  directoryUser,
} from './security';
import {
  formatAuditEvent,
  getOrgAuditLog,
  getUserAuditLog,
  logSecurityEvent,
  requestContext,
} from './security-audit';
import { pushNotification } from './db';

function getProtectionStatus() {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    { id: 'https', label: 'HTTPS enforced', active: isProd, detail: 'Encrypted connections in production' },
    { id: 'headers', label: 'Security headers', active: true, detail: 'Anti-clickjacking, MIME sniffing, CSP' },
    { id: 'rate-limit', label: 'API rate limiting', active: true, detail: 'Blocks brute-force and flood attacks' },
    { id: 'lockout', label: 'Account lockout', active: true, detail: '10 failed logins → 30 min lock' },
    { id: 'sessions', label: 'Session management', active: true, detail: 'Revoke devices remotely' },
    { id: 'audit', label: 'Security audit log', active: true, detail: 'Tracks sign-ins and account changes' },
    { id: 'uploads', label: 'Upload sandboxing', active: true, detail: 'File type checks + path traversal blocks' },
    { id: 'passwords', label: 'Password hashing', active: true, detail: 'scrypt with per-user salt' },
    { id: 'cors', label: 'Origin restrictions', active: isProd, detail: 'Only your domains can call the API' },
    { id: 'sso-exchange', label: 'Secure SSO handoff', active: true, detail: 'One-time codes instead of tokens in URLs' },
  ];
}

function currentToken(req: AuthedRequest): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}

function serializeSession(
  s: ReturnType<typeof listSessionsForUser>[number],
  currentToken?: string,
) {
  return {
    token: s.token,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    ip: s.ip,
    userAgent: s.userAgent,
    current: currentToken != null && s.token === currentToken,
  };
}

export function registerSecurityRoutes(app: Express) {
  app.get('/api/security/overview', (req: AuthedRequest, res) => {
    const user = assertActiveUser(req, res);
    if (!user) return;

    const token = currentToken(req);
    const sessions = listSessionsForUser(user.id).map(s => serializeSession(s, token));
    const activity = getUserAuditLog(user.id, 40).map(e => ({
      ...e,
      label: formatAuditEvent(e.event),
    }));

    res.json({
      twoFactorRequired: Boolean(getDb().orgSettings.twoFactorRequired),
      sessions,
      activity,
      protections: getProtectionStatus(),
    });
  });

  app.post('/api/security/sessions/revoke-others', (req: AuthedRequest, res) => {
    const user = assertActiveUser(req, res);
    if (!user) return;

    const token = currentToken(req);
    revokeOtherSessions(user.id, token);
    const ctx = requestContext(req);
    logSecurityEvent('sessions_revoked_others', {
      userId: user.id,
      actorId: user.id,
      ...ctx,
    });
    saveDb();
    res.json({ success: true });
  });

  app.delete('/api/security/sessions/:token', (req: AuthedRequest, res) => {
    const user = assertActiveUser(req, res);
    if (!user) return;

    const target = req.params.token;
    const owned = listSessionsForUser(user.id).some(s => s.token === target);
    if (!owned) return res.status(404).json({ error: 'Session not found' });

    const current = currentToken(req);
    if (target === current) {
      return res.status(400).json({ error: 'Cannot revoke your current session. Sign out instead.' });
    }

    deleteSession(target);
    logSecurityEvent('session_revoked', {
      userId: user.id,
      actorId: user.id,
      ...requestContext(req),
    });
    res.json({ success: true });
  });

  app.get('/api/admin/security/overview', requireRole('admin', 'manager'), (req: AuthedRequest, res) => {
    const actor = assertManager(req, res);
    if (!actor) return;

    const db = getDb();
    const now = Date.now();
    const sessionsByUser = new Map<string, ReturnType<typeof listSessionsForUser>>();

    for (const s of db.sessions || []) {
      if (new Date(s.expiresAt).getTime() <= now) continue;
      const list = sessionsByUser.get(s.userId) || [];
      list.push(s);
      sessionsByUser.set(s.userId, list);
    }

    const activeSessions = [...sessionsByUser.entries()].map(([userId, sessions]) => {
      const u = getUserById(userId);
      const sorted = [...sessions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return {
        userId,
        user: u ? directoryUser(u) : null,
        sessionCount: sorted.length,
        lastLogin: sorted[0]?.createdAt,
        sessions: sorted.map(s => serializeSession(s)),
      };
    }).sort((a, b) => (b.lastLogin || '').localeCompare(a.lastLogin || ''));

    const auditLog = getOrgAuditLog(80).map(e => {
      const subject = e.userId ? getUserById(e.userId) : null;
      const actorUser = e.actorId ? getUserById(e.actorId) : null;
      return {
        ...e,
        label: formatAuditEvent(e.event),
        userName: subject?.name,
        actorName: actorUser?.name,
      };
    });

    res.json({
      twoFactorRequired: Boolean(db.orgSettings.twoFactorRequired),
      activeSessionCount: (db.sessions || []).filter(s => new Date(s.expiresAt).getTime() > now).length,
      usersWithSessions: activeSessions.length,
      activeSessions,
      auditLog,
    });
  });

  app.delete('/api/admin/security/sessions/:userId', requireRole('admin'), (req: AuthedRequest, res) => {
    const actor = assertActiveUser(req, res);
    if (!actor || actor.role !== 'admin') return;

    const target = getUserById(req.params.userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    deleteSessionsForUser(target.id);
    logSecurityEvent('admin_sessions_revoked', {
      userId: target.id,
      actorId: actor.id,
      ...requestContext(req),
      detail: `Revoked all sessions for ${target.email}`,
    });

    pushNotification(
      target.id,
      'Sessions signed out',
      'An administrator signed you out of all devices. Sign in again if this was you.',
      { triggerId: 'security.password_changed' },
    );

    res.json({ success: true });
  });
}