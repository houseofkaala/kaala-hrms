import { syncSeedUsers, migrateLegacyUserRefs } from './seed-users';
import { hasLegacyUserIds, LEGACY_ID_MAP, resolveUserIds } from './user-ids';
import { ensureProjectSchema } from './project-management';
import { createEmptyOperationalDb } from './db-defaults';
import { purgeDemoOperationalData } from './clean-production-data';
import { seedOperationalContent } from './operational-seed';
import { hasOperationalData, isDataPreserveMode, markDataVersionCurrent } from './data-preserve';
import { ensureRolePermissions, mergeDefaultModuleAccess } from './role-defaults';
import { mergeEmailSettings } from './notifications/registry';
import {
  flushPersistence,
  getStorageBackend,
  initPersistence,
  persistStore,
  readFileStore,
  readPostgresStore,
  type StorageBackend,
} from './persistence';

export { getStorageBackend, type StorageBackend };

export interface TaskRecord {
  id: string;
  title: string;
  ownerId: string;
  status: string;
  value: number;
  deadline: string;
  category?: string;
  priority?: string;
  claimedById?: string | null;
  referenceLink?: string;
  timeStarted?: string;
  timeSpent?: number;
}

export interface UserRecord {
  id: string;
  name: string;
  points: number;
  role: 'employee' | 'manager' | 'admin' | 'sales' | 'executive_assistant';
  department: string;
  status: string;
  email: string;
  password: string;
  phone: string;
  projects: string[];
  title?: string;
  joinDate?: string;
  employmentType?: string;
  emergencyContact?: string;
  managerId?: string | null;
  address?: string;
  bankAccount?: string;
  profileImageKey?: string;
  preferences?: { emailNotifications: boolean; timezone: string };
}

function defaultDb() {
  return createEmptyOperationalDb() as ReturnType<typeof createEmptyOperationalDb> & { users: UserRecord[] };
}

export type Database = ReturnType<typeof defaultDb>;

let db: Database = defaultDb();
let initialized = false;

function dedupeUsers(users: UserRecord[]): UserRecord[] {
  const byId = new Map<string, UserRecord>();
  for (const user of users) {
    const existing = byId.get(user.id);
    if (!existing) {
      byId.set(user.id, user);
      continue;
    }
    const score = (u: UserRecord) =>
      (u.status === 'Active' ? 2 : 0) + (u.email ? 1 : 0) + (u.name ? 1 : 0);
    if (score(user) >= score(existing)) byId.set(user.id, user);
  }
  return [...byId.values()];
}

function applyMigrations() {
  db.users = dedupeUsers(syncSeedUsers(db.users));
  for (const user of db.users) {
    if (user.status === 'Offline') user.status = 'Active';
  }
  const shouldMigrateLegacyRefs =
    !isDataPreserveMode() && hasLegacyUserIds(db.users.map(u => u.id));
  if (shouldMigrateLegacyRefs) {
    migrateLegacyUserRefs(db);
  }
  purgeDemoOperationalData(db as Database & { dataVersion?: number });
  db.orgSettings.emailNotifications = mergeEmailSettings(db.orgSettings.emailNotifications);
  if (!db.emailDigestQueue) db.emailDigestQueue = [];
  if (!db.emailDigestMeta) db.emailDigestMeta = {};
  if (!db.surveyResponses) db.surveyResponses = [];
  if (!db.sessions) db.sessions = [];
  if (!(db as Database & { securityAuditLog?: unknown[] }).securityAuditLog) {
    (db as Database & { securityAuditLog: unknown[] }).securityAuditLog = [];
  }
  const lockStates = db as Database & { loginAttemptStates?: Record<string, unknown> };
  if (!lockStates.loginAttemptStates) lockStates.loginAttemptStates = {};
  const exchanges = db as Database & { authExchangeCodes?: unknown[] };
  if (!exchanges.authExchangeCodes) exchanges.authExchangeCodes = [];
  if (!db.chatMessages) db.chatMessages = [];
  if (!db.projectMessages) db.projectMessages = [];
  ensureProjectSchema(db);
  ensureRolePermissions(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  mergeDefaultModuleAccess(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  mergeCrmModuleAccess(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  mergePhase2ModuleAccess(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  mergeSecurityModuleAccess(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  if (!db.crmLeads) db.crmLeads = [];
  const ext = db as Database & {
    jobPostings?: unknown[];
    reviewCycles?: unknown[];
    offboardingTasks?: unknown[];
    policyAcknowledgments?: unknown[];
    shiftRoster?: unknown[];
    fieldVisits?: unknown[];
    salaryStructures?: Record<string, unknown>;
    orgSettings: { officeGeofence?: unknown; geoAttendanceRequired?: boolean };
  };
  if (!ext.jobPostings) ext.jobPostings = [];
  if (!ext.reviewCycles) ext.reviewCycles = [];
  if (!ext.offboardingTasks) ext.offboardingTasks = [];
  if (!ext.policyAcknowledgments) ext.policyAcknowledgments = [];
  if (!ext.shiftRoster) ext.shiftRoster = [];
  if (!ext.fieldVisits) ext.fieldVisits = [];
  if (!ext.salaryStructures) ext.salaryStructures = {};
  if (!ext.orgSettings.officeGeofence) {
    ext.orgSettings.officeGeofence = { name: 'House of Kaala Office', lat: 12.9716, lng: 77.5946, radiusMeters: 500 };
  }
  if (ext.orgSettings.geoAttendanceRequired === undefined) ext.orgSettings.geoAttendanceRequired = false;
  const p2 = db as Database & {
    benefitPlans?: unknown[];
    benefitEnrollments?: unknown[];
    signatureRequests?: unknown[];
    investmentDeclarations?: unknown[];
    form16Records?: unknown[];
    webhooks?: unknown[];
    integrations?: Record<string, unknown>;
  };
  if (!p2.benefitPlans?.length) {
    if (!p2.benefitPlans) p2.benefitPlans = [];
    const defaults = defaultDb().benefitPlans as unknown[];
    for (const plan of defaults) {
      const id = (plan as { id: string }).id;
      if (!(p2.benefitPlans as { id: string }[]).some(p => p.id === id)) {
        (p2.benefitPlans as unknown[]).push(plan);
      }
    }
  }
  if (!p2.benefitEnrollments) p2.benefitEnrollments = [];
  if (!p2.signatureRequests) p2.signatureRequests = [];
  if (!p2.investmentDeclarations) p2.investmentDeclarations = [];
  if (!p2.form16Records) p2.form16Records = [];
  if (!p2.webhooks) p2.webhooks = [];
  if (!p2.integrations) {
    p2.integrations = {
      googleSso: { enabled: false, clientId: '', clientSecret: '', allowedDomain: 'bymarketingonly.com' },
      slack: { enabled: false, webhookUrl: '' },
    };
  }
  seedOperationalContent(db);
}

function mergeCrmModuleAccess(rolePermissions: Record<string, { modules: string[]; description: string }>) {
  for (const role of ['sales', 'executive_assistant', 'manager', 'admin']) {
    const cfg = rolePermissions[role];
    if (!cfg || cfg.modules.includes('*')) continue;
    if (!cfg.modules.includes('crm')) cfg.modules.push('crm');
  }
}

function mergePhase2ModuleAccess(rolePermissions: Record<string, { modules: string[]; description: string }>) {
  for (const role of ['employee', 'sales', 'executive_assistant']) {
    const cfg = rolePermissions[role];
    if (!cfg || cfg.modules.includes('*')) continue;
    for (const mod of ['benefits', 'tax']) {
      if (!cfg.modules.includes(mod)) cfg.modules.push(mod);
    }
  }
}

function mergeSecurityModuleAccess(rolePermissions: Record<string, { modules: string[]; description: string }>) {
  for (const role of ['employee', 'sales', 'executive_assistant']) {
    const cfg = rolePermissions[role];
    if (!cfg || cfg.modules.includes('*')) continue;
    if (!cfg.modules.includes('security')) cfg.modules.push('security');
  }
}

function hydrateStore(raw: Partial<Database> | null) {
  if (!raw) {
    db = defaultDb();
    applyMigrations();
    persistStore(db);
    return;
  }

  db = { ...defaultDb(), ...raw };

  if (!raw.dataVersion) {
    if (hasOperationalData(raw) || isDataPreserveMode()) {
      markDataVersionCurrent(db as Database & { dataVersion?: number });
    } else {
      delete (db as Database & { dataVersion?: number }).dataVersion;
    }
  }

  applyMigrations();
  persistStore(db);
}

/** Load data from PostgreSQL (if configured) or local JSON file. */
export async function initDb() {
  if (initialized) return getStorageBackend();
  const backend = await initPersistence();

  try {
    if (backend === 'postgres') {
      const stored = await readPostgresStore();
      if (stored) {
        hydrateStore(stored);
      } else {
        hydrateStore(readFileStore());
      }
    } else {
      hydrateStore(readFileStore());
    }
  } catch (err) {
    console.error('[HRMS] Database load failed:', err);
    const fallback = readFileStore();
    if (fallback) {
      console.warn('[HRMS] Recovering from last local snapshot.');
      hydrateStore(fallback);
    } else if (isDataPreserveMode()) {
      throw new Error('[HRMS] Refusing to start with empty database while DATA_PRESERVE is enabled.');
    } else {
      hydrateStore(null);
    }
  }

  initialized = true;
  const fileHint = getStorageBackend() === 'file'
    ? ' (local file — persistent on VPS; set DATABASE_URL if using Render)'
    : '';
  console.log(`[HRMS] Storage: ${getStorageBackend()}${fileHint}`);
  return getStorageBackend();
}

/** @deprecated Use initDb() at startup. Kept for compatibility. */
export function loadDb() {
  hydrateStore(readFileStore());
}

export function saveDb(options?: { flush?: boolean }) {
  persistStore(db);
  if (options?.flush) void flushPersistence();
}

export async function flushDb() {
  await flushPersistence();
}

export function getDb() {
  return db;
}

export function sanitizeUser(user: UserRecord) {
  const { password, ...safe } = user;
  return {
    ...safe,
    hasProfileImage: Boolean(user.profileImageKey),
  };
}

export function getUserById(id: string) {
  const direct = db.users.find(u => u.id === id);
  if (direct) return direct;
  const canonical = LEGACY_ID_MAP[id];
  if (canonical) {
    const byCanonical = db.users.find(u => u.id === canonical);
    if (byCanonical) return byCanonical;
  }
  const legacyId = Object.entries(LEGACY_ID_MAP).find(([, canon]) => canon === id)?.[0];
  if (legacyId) return db.users.find(u => u.id === legacyId);
  return undefined;
}

export { resolveUserIds, userIdMatches } from './user-ids';

export interface NotifyCallOptions {
  triggerId?: string;
  inAppOnly?: boolean;
  emailContext?: Record<string, string>;
}

export function pushNotification(userId: string, title: string, message: string, options?: NotifyCallOptions) {
  if (options?.triggerId) {
    void import('./notifications/dispatcher').then(({ notify }) =>
      notify({
        triggerId: options.triggerId!,
        userId,
        title,
        message,
        inAppOnly: options.inAppOnly,
        emailContext: options.emailContext,
      }),
    );
    return;
  }
  db.notifications.unshift({
    id: `n${Date.now()}`,
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();
}

export function addTransaction(userId: string, amount: number, reason: string) {
  db.transactions.push({
    id: `tx${Date.now()}`,
    userId,
    amount,
    reason,
    timestamp: new Date().toISOString(),
  });
  saveDb();
}