import type { User } from './types';

export type Portal = 'employee' | 'manager' | 'admin';

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'bymarketingonly.com';

export const PORTAL_META: Record<Portal, { title: string; subtitle: string; roleLabel: string }> = {
  employee: { title: 'Employee Portal', subtitle: 'Your daily workspace', roleLabel: 'Employees' },
  manager: { title: 'Manager Portal', subtitle: 'Team leadership & approvals', roleLabel: 'Managers' },
  admin: { title: 'Admin Portal', subtitle: 'Organization control center', roleLabel: 'Administrators' },
};

export function getPortal(hostname = window.location.hostname): Portal {
  const params = new URLSearchParams(window.location.search);
  const override = params.get('portal');
  if (override === 'employee' || override === 'manager' || override === 'admin') {
    return override;
  }

  const sub = hostname.split('.')[0].toLowerCase();
  if (sub === 'employee') return 'employee';
  if (sub === 'manager') return 'manager';
  if (sub === 'admin') return 'admin';

  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'employee';
  return 'employee';
}

export function portalForRole(role: User['role']): Portal {
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  return 'employee';
}

export function roleMatchesPortal(role: User['role'], portal: Portal): boolean {
  return portalForRole(role) === portal;
}

export function isDedicatedPortal(hostname = window.location.hostname): boolean {
  const sub = hostname.split('.')[0].toLowerCase();
  return sub === 'employee' || sub === 'manager' || sub === 'admin';
}

export function getPortalUrl(portal: Portal, path = '/'): string {
  const { hostname, protocol, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portSuffix}${path}${path.includes('?') ? '&' : '?'}portal=${portal}`;
  }
  return `https://${portal}.${BASE_DOMAIN}${path}`;
}

export function getPortalLoginUrl(portal: Portal): string {
  return getPortalUrl(portal, '/login');
}

export function viewModeForPortal(portal: Portal): 'manager' | 'employee' {
  return portal === 'employee' ? 'employee' : 'manager';
}