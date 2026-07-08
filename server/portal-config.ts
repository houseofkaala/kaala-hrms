import type { UserRecord } from './db';

export type PortalId = 'employee' | 'admin';

/** Sales & EA users use the employee portal with extra sales modules. */
export function portalForRole(role: UserRecord['role'] | string): PortalId {
  if (role === 'manager' || role === 'admin') return 'admin';
  return 'employee';
}

export function portalLabel(role: UserRecord['role'] | string): string {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Admin';
  if (role === 'executive_assistant') return 'Employee (Executive Assistant)';
  if (role === 'sales') return 'Employee (Sales)';
  return 'Employee';
}

export function portalLoginPath(role: UserRecord['role'] | string): string {
  return portalForRole(role);
}