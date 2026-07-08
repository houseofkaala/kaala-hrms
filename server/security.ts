import { Response } from 'express';
import { getDb, getUserById, UserRecord } from './db';
import { AuthedRequest } from './middleware';

export function activeUsers() {
  return getDb().users.filter(u => u.status === 'Active' || u.status === 'On Leave');
}

export function isManagerOrAdmin(user: UserRecord | undefined): boolean {
  return user?.role === 'manager' || user?.role === 'admin';
}

export function assertActiveUser(req: AuthedRequest, res: Response): UserRecord | null {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return null;
  }
  if (user.status === 'Inactive') {
    res.status(403).json({ error: 'Account is inactive. Contact HR.' });
    return null;
  }
  return user;
}

export function assertSelfOrManager(req: AuthedRequest, res: Response, targetUserId: string): UserRecord | null {
  const user = assertActiveUser(req, res);
  if (!user) return null;
  if (targetUserId === req.userId || isManagerOrAdmin(user)) return user;
  res.status(403).json({ error: 'Forbidden' });
  return null;
}

export function assertManager(req: AuthedRequest, res: Response): UserRecord | null {
  const user = assertActiveUser(req, res);
  if (!user) return null;
  if (!isManagerOrAdmin(user)) {
    res.status(403).json({ error: 'Manager or admin access required' });
    return null;
  }
  return user;
}

export function canAccessTask(
  task: { ownerId: string; claimedById?: string | null; status?: string },
  userId: string,
  role: string,
): boolean {
  if (isManagerOrAdmin({ role } as UserRecord)) return true;
  return task.ownerId === userId || task.claimedById === userId;
}

export function canAccessKanbanTask(
  task: { assigneeId?: string },
  userId: string,
  role: string,
): boolean {
  if (isManagerOrAdmin({ role } as UserRecord)) return true;
  return !task.assigneeId || task.assigneeId === userId;
}

export function directoryUser(user: UserRecord) {
  const { password, bankAccount, ...safe } = user;
  return {
    id: safe.id,
    name: safe.name,
    email: safe.email,
    role: safe.role,
    department: safe.department,
    title: safe.title,
    status: safe.status,
    phone: safe.phone,
    points: safe.points,
    projects: safe.projects,
    joinDate: safe.joinDate,
    hasProfileImage: Boolean(safe.profileImageKey),
  };
}

export function hasModuleAccess(role: string, module: string): boolean {
  const perms = getDb().rolePermissions as Record<string, { modules: string[] }>;
  const cfg = perms[role];
  if (!cfg) return false;
  if (cfg.modules.includes('*')) return true;
  return cfg.modules.includes(module);
}

export function getAllowedModules(role: string): string[] {
  const perms = getDb().rolePermissions as Record<string, { modules: string[] }>;
  const cfg = perms[role];
  if (!cfg) return [];
  if (cfg.modules.includes('*')) return ['*'];
  return cfg.modules;
}

const VALID_ROLES = new Set(['employee', 'manager', 'admin', 'sales', 'executive_assistant']);

export function countActiveAdmins() {
  return getDb().users.filter(u => u.role === 'admin' && u.status === 'Active').length;
}

export function assertValidRoleChange(
  target: UserRecord,
  newRole: string,
  res: Response,
): boolean {
  if (!VALID_ROLES.has(newRole)) {
    res.status(400).json({ error: 'Invalid role. Must be employee, sales, executive_assistant, manager, or admin.' });
    return false;
  }
  if (target.role === 'admin' && newRole !== 'admin' && countActiveAdmins() <= 1) {
    res.status(400).json({ error: 'Cannot demote the last active admin' });
    return false;
  }
  return true;
}