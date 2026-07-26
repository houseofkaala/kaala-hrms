import type { UserRecord } from './db';
import { hashPassword } from './password';
import { COMPANY_DOMAIN, TEMP_EMPLOYEE_PASSWORD } from './company-brand';

type RosterEntry = {
  name: string;
  title: string;
  department: string;
  isHead?: boolean;
};

/** Full By Marketing Only team roster (50 people across 6 departments). */
export const BMO_ROSTER: RosterEntry[] = [
  // Performance (14)
  { name: 'Hardik M. Makwana', title: 'Head – Performance', department: 'Performance', isHead: true },
  { name: 'Ketan R. Gajjar', title: 'Meta Ads Manager', department: 'Performance' },
  { name: 'Yuvraj Solanki', title: 'Google Ads Manager', department: 'Performance' },
  { name: 'Bhavik Dhandhukiya', title: 'Marketplace Ads Mgr', department: 'Performance' },
  { name: 'Riya A. Shah', title: 'Performance Strategist', department: 'Performance' },
  { name: 'Darshan P. Patel', title: 'Performance Strategist', department: 'Performance' },
  { name: 'Nirali Vyas', title: 'Funnel Copywriter', department: 'Performance' },
  { name: 'Jenil D. Desai', title: 'Copywriter', department: 'Performance' },
  { name: 'Parth Kachhad', title: 'CRO Analyst', department: 'Performance' },
  { name: 'Manan Doshi', title: 'Marketing Analyst', department: 'Performance' },
  { name: 'Sanket Baraiya', title: 'Jr. Media Buyer', department: 'Performance' },
  { name: 'Meet S. Savaliya', title: 'Jr. Media Buyer', department: 'Performance' },
  { name: 'Aditi Mehta', title: 'Account Manager', department: 'Performance' },
  { name: 'Jigar Pithadiya', title: 'Perf Ops Manager', department: 'Performance' },

  // Web & Tech (9)
  { name: 'Hetal Bhalala', title: 'Head – Web Dev', department: 'Web & Tech', isHead: true },
  { name: 'Jaimin Trambadiya', title: 'Frontend Developer', department: 'Web & Tech' },
  { name: 'Krunal Pansuriya', title: 'Frontend Developer', department: 'Web & Tech' },
  { name: 'Mahesh Lakhani', title: 'Backend Developer', department: 'Web & Tech' },
  { name: 'Dhaval Kachhiya', title: 'Backend Developer', department: 'Web & Tech' },
  { name: 'Kunal Gohil', title: 'DevOps Engineer', department: 'Web & Tech' },
  { name: 'Hiren Mandaliya', title: 'Web Perf Engineer', department: 'Web & Tech' },
  { name: 'Riddhi Thummar', title: 'QA Engineer', department: 'Web & Tech' },
  { name: 'Kruti Vora', title: 'UX Coordinator', department: 'Web & Tech' },

  // Brand & Design (7)
  { name: 'Rupal Shah', title: 'Brand Head', department: 'Brand & Design', isHead: true },
  { name: 'Aashna Desai', title: 'Graphic Designer', department: 'Brand & Design' },
  { name: 'Darshit Vora', title: 'Graphic Designer', department: 'Brand & Design' },
  { name: 'Neelam Joshi', title: 'Brand Strategist', department: 'Brand & Design' },
  { name: 'Tanishka Mehta', title: 'Content Strategist', department: 'Brand & Design' },
  { name: 'Krupal Gohil', title: 'Motion Designer', department: 'Brand & Design' },
  { name: 'Bhumi Makwana', title: 'Packaging Designer', department: 'Brand & Design' },

  // E-Commerce (8)
  { name: 'Aakash Patel', title: 'E-Commerce Manager', department: 'E-Commerce', isHead: true },
  { name: 'Yash Kothari', title: 'Shopify Developer', department: 'E-Commerce' },
  { name: 'Vishal Savaliya', title: 'Shopify Developer', department: 'E-Commerce' },
  { name: 'Palak Jain', title: 'CRO Specialist', department: 'E-Commerce' },
  { name: 'Kavita Solanki', title: 'Integrations Lead', department: 'E-Commerce' },
  { name: 'Suresh Gohil', title: 'Operations Manager', department: 'E-Commerce' },
  { name: 'Naina Shah', title: 'UX Designer', department: 'E-Commerce' },
  { name: 'Harshil Moradiya', title: 'CRM Manager', department: 'E-Commerce' },

  // Social Media (6)
  { name: 'Aarav Patel', title: 'Social Media Head', department: 'Social Media', isHead: true },
  { name: 'Jinal Parekh', title: 'Content Strategist', department: 'Social Media' },
  { name: 'Mitul Dhedhi', title: 'Video Editor', department: 'Social Media' },
  { name: 'Rupal Kalsariya', title: 'Community Manager', department: 'Social Media' },
  { name: 'Vivek Chotaliya', title: 'Social Exec', department: 'Social Media' },
  { name: 'Mansi Thakkar', title: 'Influencer Manager', department: 'Social Media' },

  // SEO (6)
  { name: 'Rohit Mehta', title: 'SEO Head', department: 'SEO', isHead: true },
  { name: 'Parth Dholakia', title: 'Tech SEO Exec', department: 'SEO' },
  { name: 'Sneha Gandhi', title: 'SEO Content Spec.', department: 'SEO' },
  { name: 'Manav Vora', title: 'SEO Analyst', department: 'SEO' },
  { name: 'Ankit Radadiya', title: 'Link Building Spec.', department: 'SEO' },
  { name: 'Pooja Jhaveri', title: 'SEO Strategist', department: 'SEO' },
];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function emailFromName(name: string, used: Set<string>): string {
  const parts = name
    .replace(/\./g, '')
    .split(/\s+/)
    .map(p => p.trim())
    .filter(Boolean);
  const first = (parts[0] || 'user').toLowerCase();
  const last = (parts[parts.length - 1] || 'employee').toLowerCase();
  let local = `${first}.${last}`;
  let email = `${local}@${COMPANY_DOMAIN}`;
  let n = 2;
  while (used.has(email)) {
    local = `${first}.${last}${n}`;
    email = `${local}@${COMPANY_DOMAIN}`;
    n += 1;
  }
  used.add(email);
  return email;
}

export function applyCompanyBranding(orgSettings: {
  companyName?: string;
  officeGeofence?: { name?: string; lat?: number; lng?: number; radiusMeters?: number };
  emailNotifications?: { fromName?: string };
}): void {
  orgSettings.companyName = 'By Marketing Only LLP';
  if (orgSettings.officeGeofence) {
    orgSettings.officeGeofence.name = 'By Marketing Only Office';
  }
  if (orgSettings.emailNotifications) {
    orgSettings.emailNotifications.fromName = 'By Marketing Only HR';
  }
}

/**
 * Upsert the full BMO roster into the user list without removing existing accounts.
 */
export function syncBmoRoster(users: UserRecord[]): { added: number; updated: number; users: UserRecord[] } {
  const next = [...users];
  const usedEmails = new Set(
    next.map(u => u.email?.toLowerCase()).filter(Boolean) as string[],
  );

  const adminId =
    next.find(u => u.role === 'admin' && u.status === 'Active')?.id ||
    next.find(u => u.role === 'admin')?.id ||
    null;
  const hrManagerId =
    next.find(u => u.role === 'manager' && u.status === 'Active')?.id || adminId;

  const headIdsByDept = new Map<string, string>();
  let added = 0;
  let updated = 0;

  const ordered = [
    ...BMO_ROSTER.filter(r => r.isHead),
    ...BMO_ROSTER.filter(r => !r.isHead),
  ];

  for (const entry of ordered) {
    const id = `bmo-${slugifyName(entry.name)}`;
    const existing = next.find(u => u.id === id);
    const managerId = entry.isHead
      ? hrManagerId
      : headIdsByDept.get(entry.department) || hrManagerId;

    if (existing) {
      existing.name = entry.name;
      existing.title = entry.title;
      existing.department = entry.department;
      if (existing.status === 'Inactive' || existing.status === 'Offline') existing.status = 'Active';
      if (!existing.managerId) existing.managerId = managerId;
      if (entry.isHead) headIdsByDept.set(entry.department, existing.id);
      if (existing.email) usedEmails.add(existing.email.toLowerCase());
      updated += 1;
      continue;
    }

    const email = emailFromName(entry.name, usedEmails);
    const user: UserRecord = {
      id,
      name: entry.name,
      email,
      password: hashPassword(TEMP_EMPLOYEE_PASSWORD),
      role: 'employee',
      department: entry.department,
      title: entry.title,
      status: 'Active',
      points: 1000,
      phone: '',
      projects: [],
      joinDate: new Date().toISOString().split('T')[0],
      employmentType: 'Full-Time',
      managerId,
      preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' },
    };
    next.push(user);
    if (entry.isHead) headIdsByDept.set(entry.department, user.id);
    added += 1;
  }

  for (const entry of BMO_ROSTER.filter(r => !r.isHead)) {
    const id = `bmo-${slugifyName(entry.name)}`;
    const user = next.find(u => u.id === id);
    const headId = headIdsByDept.get(entry.department);
    if (user && headId) user.managerId = headId;
  }

  return { added, updated, users: next };
}