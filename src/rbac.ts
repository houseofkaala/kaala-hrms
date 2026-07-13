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
  'timesheets', 'holidays', 'policies', 'projects', 'settings', 'security', 'benefits', 'tax',
]);

export function moduleForRoute(route: string): string {
  if (route.startsWith('projects/')) return 'projects';
  return ROUTE_MODULE[route] || route;
}

const SALES_MODULES = new Set([
  'dashboard', 'crm', 'projects', 'tasks', 'field', 'people', 'documents', 'expenses',
  'attendance', 'leave', 'timesheets', 'marketplace', 'rewards', 'leaderboard',
  'chat', 'ai', 'profile', 'notifications', 'settings', 'security',
]);

export function canAccessModule(user: User | null, route: string): boolean {
  if (!user) return false;
  const mod = moduleForRoute(route);
  const portal = getPortal();

  if (portal === 'admin') {
    return user.role === 'admin' || user.role === 'manager';
  }

  if (user.role === 'sales' || user.role === 'executive_assistant') {
    return SALES_MODULES.has(mod) || mod === 'crm';
  }

  if (user.allowedModules?.includes('*')) return EMPLOYEE_PORTAL_MODULES.has(mod);
  if (user.allowedModules?.length) {
    return user.allowedModules.includes(mod) && EMPLOYEE_PORTAL_MODULES.has(mod);
  }
  return EMPLOYEE_PORTAL_MODULES.has(mod);
}

export function filterNavByRole(user: User | null, route: string): boolean {
  return canAccessModule(user, route);
}