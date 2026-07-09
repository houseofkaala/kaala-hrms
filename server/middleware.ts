import { Request, Response, NextFunction } from 'express';
import { getUserById } from './db';
import { createSession, deleteSession, resolveSession, revokeOtherSessions } from './sessions';
import { hasModuleAccess, isManagerOrAdmin } from './security';

export { createSession, deleteSession, revokeOtherSessions };

export interface AuthedRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const userId = resolveSession(authHeader.slice(7));
  if (!userId) return res.status(401).json({ error: 'Invalid or expired session' });
  req.userId = userId;
  const user = getUserById(userId);
  if (!user || user.status === 'Inactive') {
    return res.status(403).json({ error: 'Account is inactive or not found' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = getUserById(req.userId!);
    if (!user || !roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

const PATH_MODULE_RULES: [RegExp, string][] = [
  [/^\/api\/crm/, 'crm'],
  [/^\/api\/finance/, 'finance'],
  [/^\/api\/field/, 'field'],
  [/^\/api\/recruit/, 'recruit'],
  [/^\/api\/benefits/, 'benefits'],
  [/^\/api\/tax/, 'tax'],
  [/^\/api\/signatures/, 'documents'],
  [/^\/api\/offboarding/, 'offboarding'],
  [/^\/api\/integrations/, 'settings'],
  [/^\/api\/leaderboard/, 'leaderboard'],
  [/^\/api\/reports/, 'reports'],
  [/^\/api\/employees/, 'employees'],
  [/^\/api\/roles/, 'roles'],
  [/^\/api\/settings/, 'settings'],
  [/^\/api\/automations/, 'settings'],
  [/^\/api\/payroll\/run/, 'payroll'],
  [/^\/api\/admin\//, 'settings'],
  [/^\/api\/biometric-devices/, 'attendance'],
  [/^\/api\/holidays/, 'holidays'],
  [/^\/api\/policies/, 'policies'],
  [/^\/api\/assets/, 'assets'],
  [/^\/api\/documents/, 'documents'],
  [/^\/api\/surveys/, 'surveys'],
  [/^\/api\/learning/, 'learning'],
  [/^\/api\/helpdesk/, 'helpdesk'],
  [/^\/api\/community/, 'community'],
  [/^\/api\/tasks/, 'marketplace'],
  [/^\/api\/marketplace/, 'marketplace'],
  [/^\/api\/kanban/, 'tasks'],
  [/^\/api\/projects/, 'projects'],
  [/^\/api\/performance/, 'performance'],
  [/^\/api\/expenses/, 'expenses'],
  [/^\/api\/timesheets/, 'timesheets'],
  [/^\/api\/onboarding/, 'onboarding'],
  [/^\/api\/org-chart/, 'orgchart'],
  [/^\/api\/attendance/, 'attendance'],
  [/^\/api\/leave/, 'leave'],
  [/^\/api\/rewards/, 'rewards'],
  [/^\/api\/transactions/, 'rewards'],
  [/^\/api\/chat/, 'chat'],
  [/^\/api\/ai/, 'ai'],
  [/^\/api\/payroll/, 'payroll'],
  [/^\/api\/notifications/, 'notifications'],
  [/^\/api\/shifts/, 'attendance'],
];

const MODULE_EXEMPT = new Set([
  '/api/me',
  '/api/users',
  '/api/health',
  '/api/auth/logout',
]);

export function moduleAccessMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) return next();

  const path = req.originalUrl.split('?')[0];
  if (MODULE_EXEMPT.has(path)) return next();

  const user = getUserById(req.userId);
  if (!user || isManagerOrAdmin(user)) return next();

  for (const [pattern, module] of PATH_MODULE_RULES) {
    if (pattern.test(path) && !hasModuleAccess(user.role, module)) {
      return res.status(403).json({ error: 'Module access denied' });
    }
  }

  next();
}