import type { User } from './types';
import { getPortal } from './portal';

const ROUTE_MODULE: Record<string, string> = {
  dashboard: 'dashboard',
  marketplace: 'marketplace',
  leaderboard: 'leaderboard',
  recruit: 'recruit',
  employees: 'employees',
  onboarding: 'onboarding',
  offboarding: 'offboarding',
  orgchart: 'orgchart',
  people: 'people',
  leave: 'leave',
  holidays: 'holidays',
  attendance: 'attendance',
  timesheets: 'timesheets',
  documents: 'documents',
  payroll: 'payroll',
  expenses: 'expenses',
  assets: 'assets',
  projects: 'projects',
  tasks: 'tasks',
  performance: 'performance',
  learning: 'learning',
  chat: 'chat',
  survey: 'surveys',
  field: 'field',
  crm: 'crm',
  finance: 'finance',
  ai: 'ai',
  community: 'community',
  helpdesk: 'helpdesk',
  reports: 'reports',
  rewards: 'rewards',
  profile: 'profile',
  settings: 'settings',
  security: 'security',
  roles: 'roles',
  notifications: 'notifications',
  policies: 'policies',
  benefits: 'benefits',
  tax: 'tax',
};

const EMPLOYEE_PORTAL_MODULES = new Set([
  'dashboard', 'people', 'attendance', 'leave', 'documents', 'assets',
  'performance', 'learning', 'surveys', 'community', 'helpdesk', 'marketplace',
  'rewards', 'leaderboard', 'chat', 'ai', 'profile', 'notifications',
  'timesheets', 'holidays', 'policies', 'projects', 'tasks', 'onboarding', 'orgchart',
  'settings', 'security', 'benefits', 'tax', 'expenses', 'field', 'crm',
]);

const SALES_MODULES = new Set([
  'dashboard', 'crm', 'projects', 'tasks', 'field', 'people', 'documents', 'expenses',
  'attendance', 'leave', 'timesheets', 'marketplace', 'rewards', 'leaderboard',
  'chat', 'ai', 'profile', 'notifications', 'settings', 'security', 'benefits', 'tax',
  'holidays', 'policies',
]);

export function moduleForRoute(route: string): string {
  if (route.startsWith('projects/')) return 'projects';
  return ROUTE_MODULE[route] || route;
}

function fallbackModulesForRole(role: User['role']): Set<string> {
  if (role === 'sales' || role === 'executive_assistant') return SALES_MODULES;
  return EMPLOYEE_PORTAL_MODULES;
}

export function canAccessModule(user: User | null, route: string): boolean {
  if (!user) return false;
  const mod = moduleForRoute(route);
  const portal = getPortal();

  if (portal === 'admin') {
    return user.role === 'admin' || user.role === 'manager';
  }

  const allowed = user.allowedModules;
  if (allowed?.includes('*')) {
    return fallbackModulesForRole(user.role).has(mod);
  }
  if (allowed?.length) {
    return allowed.includes(mod);
  }

  return fallbackModulesForRole(user.role).has(mod);
}

export function filterNavByRole(user: User | null, route: string): boolean {
  return canAccessModule(user, route);
}