import type { User } from './types';

const ROUTE_MODULE: Record<string, string> = {
  dashboard: 'dashboard',
  marketplace: 'marketplace',
  leaderboard: 'leaderboard',
  recruit: 'recruit',
  employees: 'employees',
  onboarding: 'onboarding',
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
  finance: 'finance',
  ai: 'ai',
  community: 'community',
  helpdesk: 'helpdesk',
  reports: 'reports',
  rewards: 'rewards',
  profile: 'profile',
  settings: 'settings',
  roles: 'roles',
  notifications: 'notifications',
  policies: 'policies',
};

const EMPLOYEE_MODULES = new Set([
  'dashboard', 'people', 'attendance', 'leave', 'documents', 'assets',
  'performance', 'learning', 'surveys', 'community', 'helpdesk', 'marketplace',
  'rewards', 'leaderboard', 'chat', 'ai', 'profile', 'notifications',
  'expenses', 'timesheets', 'onboarding', 'holidays', 'policies', 'orgchart',
  'projects', 'tasks', 'settings',
]);

export function moduleForRoute(route: string): string {
  if (route.startsWith('projects/')) return 'projects';
  return ROUTE_MODULE[route] || route;
}

export function canAccessModule(user: User | null, route: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'manager') return true;
  const mod = moduleForRoute(route);
  return EMPLOYEE_MODULES.has(mod);
}

export function filterNavByRole(user: User | null, route: string): boolean {
  return canAccessModule(user, route);
}