/** Default module access per role — merged into live DB without overwriting custom configs. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { modules: string[]; description: string }> = {
  employee: {
    modules: [
      'dashboard', 'people', 'attendance', 'leave', 'documents', 'assets',
      'performance', 'learning', 'surveys', 'community', 'helpdesk', 'marketplace',
      'rewards', 'leaderboard', 'chat', 'ai', 'profile', 'notifications',
      'expenses', 'timesheets', 'onboarding', 'holidays', 'policies', 'orgchart',
      'projects', 'tasks', 'settings', 'security', 'benefits', 'tax',
    ],
    description: 'Standard employee access',
  },
  sales: {
    modules: [
      'dashboard', 'crm', 'projects', 'tasks', 'field', 'people', 'documents', 'expenses',
      'attendance', 'leave', 'timesheets', 'marketplace', 'rewards', 'leaderboard',
      'chat', 'ai', 'profile', 'notifications', 'settings', 'security', 'benefits', 'tax',
    ],
    description: 'Sales team — CRM, deals, field ops, pipeline, and core HR',
  },
  executive_assistant: {
    modules: [
      'dashboard', 'crm', 'people', 'documents', 'tasks', 'projects', 'field', 'expenses',
      'chat', 'ai', 'attendance', 'leave', 'timesheets', 'profile', 'notifications', 'settings', 'security',
    ],
    description: 'Executive Assistant — CRM, pipeline, and executive support',
  },
  manager: { modules: ['*'], description: 'Team management and approvals' },
  admin: { modules: ['*'], description: 'Full system access' },
};

export function ensureRolePermissions(
  rolePermissions: Record<string, { modules: string[]; description: string }>,
) {
  for (const [role, config] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    if (!rolePermissions[role]) {
      rolePermissions[role] = { ...config, modules: [...config.modules] };
    }
  }
}

/** Backfill missing modules on live roles without removing custom grants. */
export function mergeDefaultModuleAccess(
  rolePermissions: Record<string, { modules: string[]; description: string }>,
) {
  for (const [role, defaults] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const cfg = rolePermissions[role];
    if (!cfg || cfg.modules.includes('*')) continue;
    for (const mod of defaults.modules) {
      if (!cfg.modules.includes(mod)) cfg.modules.push(mod);
    }
  }
}