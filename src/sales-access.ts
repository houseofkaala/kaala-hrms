import type { User } from './types';
import { canAccessModule } from './rbac';

const SALES_ROLES = new Set(['sales', 'executive_assistant']);

/** True when the user should see Sales Tools in the employee portal sidebar. */
export function hasSalesToolkit(user: User | null): boolean {
  if (!user) return false;
  return canAccessModule(user, 'crm');
}

export function isSalesRole(user: User | null): boolean {
  if (!user) return false;
  return SALES_ROLES.has(user.role);
}