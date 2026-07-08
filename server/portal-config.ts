import type { UserRecord } from './db';

export type PortalId = 'employee' | 'admin' | 'sales';

export function portalForRole(role: UserRecord['role'] | string): PortalId {
  if (role === 'employee') return 'employee';
  if (role === 'sales') return 'sales';
  return 'admin';
}

export function portalLabel(role: UserRecord['role'] | string): string {
  if (role === 'sales') return 'Sales';
  if (role === 'employee') return 'Employee';
  return 'Admin';
}