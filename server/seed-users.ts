import crypto from 'crypto';
import type { UserRecord } from './db';
import { LEGACY_ID_MAP } from './user-ids';

const DOMAIN = process.env.SEED_EMAIL_DOMAIN || 'bymarketingonly.com';

function email(local: string) {
  return process.env[`SEED_${local}_EMAIL`] || `${local.toLowerCase()}@${DOMAIN}`;
}

function password(local: string, fallback: string) {
  return process.env[`SEED_${local}_PASSWORD`] || fallback;
}

export function getSeedUsers(): UserRecord[] {
  const adminPass = password('ADMIN', process.env.NODE_ENV === 'production' ? '' : 'ChangeMe-Admin-2026!');
  const managerPass = password('MANAGER', process.env.NODE_ENV === 'production' ? '' : 'ChangeMe-Manager-2026!');
  const employeePass = password('EMPLOYEE', process.env.NODE_ENV === 'production' ? '' : 'ChangeMe-Employee-2026!');

  if (process.env.NODE_ENV === 'production' && (!adminPass || !managerPass || !employeePass)) {
    console.warn(
      '[HRMS] Set SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD, SEED_EMPLOYEE_PASSWORD in production.',
    );
  }

  return [
    {
      id: 'admin-1',
      name: process.env.SEED_ADMIN_NAME || 'House of Kaala Admin',
      points: 1000,
      role: 'admin',
      department: 'Operations',
      status: 'Active',
      email: email('ADMIN'),
      password: adminPass || crypto.randomUUID(),
      phone: '',
      projects: ['Organization'],
      title: 'Administrator',
      joinDate: '2020-01-01',
      employmentType: 'Full-Time',
      managerId: null,
      preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' },
    },
    {
      id: 'mgr-1',
      name: process.env.SEED_MANAGER_NAME || 'HR Manager',
      points: 1000,
      role: 'manager',
      department: 'Human Resources',
      status: 'Active',
      email: email('MANAGER'),
      password: managerPass || crypto.randomUUID(),
      phone: '',
      projects: ['Team Management'],
      title: 'HR Manager',
      joinDate: '2021-01-01',
      employmentType: 'Full-Time',
      managerId: 'admin-1',
      preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' },
    },
    {
      id: 'emp-1',
      name: process.env.SEED_EMPLOYEE_NAME || 'Team Member',
      points: 1000,
      role: 'employee',
      department: 'General',
      status: 'Active',
      email: email('EMPLOYEE'),
      password: employeePass || crypto.randomUUID(),
      phone: '',
      projects: [],
      title: 'Employee',
      joinDate: new Date().toISOString().split('T')[0],
      employmentType: 'Full-Time',
      managerId: 'mgr-1',
      preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' },
    },
  ];
}

const SEED_ENV_KEY: Record<UserRecord['role'], string> = {
  admin: 'SEED_ADMIN_PASSWORD',
  manager: 'SEED_MANAGER_PASSWORD',
  employee: 'SEED_EMPLOYEE_PASSWORD',
  sales: 'SEED_SALES_PASSWORD',
  executive_assistant: 'SEED_EA_PASSWORD',
};

/** Upsert portal accounts and retire legacy demo users. */
export function syncSeedUsers(users: UserRecord[]): UserRecord[] {
  const preserve = process.env.DATA_PRESERVE?.trim().toLowerCase();
  const preserveEnabled = preserve !== 'false' && preserve !== '0' && preserve !== 'no';

  if (preserveEnabled) {
    const next = [...users];
    for (const seed of getSeedUsers()) {
      const hasRole = next.some(u => u.role === seed.role && u.status === 'Active');
      const hasId = next.some(u => u.id === seed.id);
      if (!hasRole && !hasId) {
        next.push({ ...seed, password: seed.password || crypto.randomUUID() });
      }
    }
    return next;
  }

  const seeds = getSeedUsers();
  const next = [...users];

  for (const seed of seeds) {
    const envPassword = process.env[SEED_ENV_KEY[seed.role]];
    const seedUser = { ...seed };
    // Only rotate password when explicitly configured in env; otherwise keep stored password.
    if (!envPassword) delete (seedUser as Partial<UserRecord>).password;

    const idx = next.findIndex(u => u.role === seed.role && (u.email === seed.email || u.id === seed.id));
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...seedUser, id: next[idx].id };
    } else {
      const roleIdx = next.findIndex(u => u.role === seed.role && u.status === 'Active');
      if (roleIdx >= 0) {
        next[roleIdx] = { ...next[roleIdx], ...seedUser, id: next[roleIdx].id };
      } else {
        next.push(seedUser.password ? seedUser : { ...seedUser, password: seed.password });
      }
    }
  }

  for (const u of next) {
    if (u.email.endsWith('@kaala.io')) {
      u.status = 'Inactive';
      u.password = crypto.randomUUID();
    }
  }

  return next;
}

function remapId(id: string | null | undefined): string | null | undefined {
  if (!id) return id;
  return LEGACY_ID_MAP[id] || id;
}

/** Point sample data at the new seed user IDs. */
export function migrateLegacyUserRefs(data: {
  tasks: { ownerId: string; claimedById?: string | null }[];
  kanbanTasks: { assigneeId?: string }[];
  transactions: { userId: string }[];
  assets: { userId: string | null }[];
  leaveRequests: { userId: string }[];
  documents: { userId: string }[];
  notifications: { userId: string }[];
  payrollRecords: { userId: string }[];
  projects: { memberIds: string[] }[];
  courses: { enrolled: string[] }[];
  expenses: { userId: string }[];
  tickets: { userId: string }[];
  communityPosts: { userId: string }[];
  chatMessages: { fromId: string; toId: string }[];
  performanceGoals: { userId: string }[];
  performanceReviews: { userId: string; reviewerId: string }[];
  skills: { userId: string }[];
  userBadges: { userId: string }[];
  shifts: { userId: string }[];
  onboardingTasks: { userId: string }[];
  timesheets: { userId: string }[];
  fieldAgents: { id: string }[];
}) {
  for (const t of data.tasks) {
    t.ownerId = remapId(t.ownerId)!;
    if (t.claimedById) t.claimedById = remapId(t.claimedById);
  }
  for (const t of data.kanbanTasks) {
    if (t.assigneeId) t.assigneeId = remapId(t.assigneeId)!;
  }
  for (const r of data.transactions) r.userId = remapId(r.userId)!;
  for (const a of data.assets) if (a.userId) a.userId = remapId(a.userId)!;
  for (const r of data.leaveRequests) r.userId = remapId(r.userId)!;
  for (const d of data.documents) d.userId = remapId(d.userId)!;
  for (const n of data.notifications) n.userId = remapId(n.userId)!;
  for (const p of data.payrollRecords) p.userId = remapId(p.userId)!;
  for (const p of data.projects) p.memberIds = p.memberIds.map(id => remapId(id)!);
  for (const c of data.courses) c.enrolled = c.enrolled.map(id => remapId(id)!);
  for (const e of data.expenses) e.userId = remapId(e.userId)!;
  for (const t of data.tickets) t.userId = remapId(t.userId)!;
  for (const p of data.communityPosts) p.userId = remapId(p.userId)!;
  for (const m of data.chatMessages) {
    m.fromId = remapId(m.fromId)!;
    m.toId = remapId(m.toId)!;
  }
  for (const g of data.performanceGoals) g.userId = remapId(g.userId)!;
  for (const r of data.performanceReviews) {
    r.userId = remapId(r.userId)!;
    r.reviewerId = remapId(r.reviewerId)!;
  }
  for (const s of data.skills) s.userId = remapId(s.userId)!;
  for (const b of data.userBadges) b.userId = remapId(b.userId)!;
  for (const s of data.shifts) s.userId = remapId(s.userId)!;
  for (const o of data.onboardingTasks) o.userId = remapId(o.userId)!;
  for (const t of data.timesheets) t.userId = remapId(t.userId)!;
}