import type { User } from './types';

export type Portal = 'employee' | 'admin' | 'sales';

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'bymarketingonly.com';

export const PORTAL_META: Record<Portal, { title: string; subtitle: string; roleLabel: string }> = {
  employee: { title: 'Employee Portal', subtitle: 'Sign in to access your HR account', roleLabel: 'Employees' },
  admin: { title: 'Admin Portal', subtitle: 'Sign in to manage your organisation', roleLabel: 'Managers & Admins' },
  sales: { title: 'Sales Portal', subtitle: 'Sign in to your sales workspace', roleLabel: 'Sales team' },
};

const PORTAL_HOSTS: Record<Portal, string[]> = {
  employee: ['employee'],
  admin: ['admin', 'manager'],
  sales: ['sales'],
};

export function getPortal(hostname = window.location.hostname): Portal {
  const params = new URLSearchParams(window.location.search);
  const override = params.get('portal');
  if (override === 'employee' || override === 'admin' || override === 'sales') return override;
  if (override === 'manager') return 'admin';

  const sub = hostname.split('.')[0].toLowerCase();
  for (const [portal, hosts] of Object.entries(PORTAL_HOSTS) as [Portal, string[]][]) {
    if (hosts.includes(sub)) return portal;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'employee';
  return 'employee';
}

export function portalForRole(role: User['role']): Portal {
  if (role === 'employee') return 'employee';
  if (role === 'sales' || role === 'executive_assistant') return 'sales';
  return 'admin';
}

export function roleMatchesPortal(role: User['role'], portal: Portal): boolean {
  return portalForRole(role) === portal;
}

export function getPortalUrl(portal: Portal, path = '/'): string {
  const { hostname, protocol, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const portSuffix = port ? `:${port}` : '';
    const sep = path.includes('?') ? '&' : '?';
    return `${protocol}//${hostname}${portSuffix}${path}${sep}portal=${portal}`;
  }
  return `https://${portal}.${BASE_DOMAIN}${path}`;
}

export function getPortalLoginUrl(portal: Portal): string {
  return getPortalUrl(portal, '/login');
}

export function viewModeForPortal(portal: Portal): 'manager' | 'employee' {
  return portal === 'admin' ? 'manager' : 'employee';
}