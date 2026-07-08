import { syncSeedUsers, migrateLegacyUserRefs } from './seed-users';
import { ensureProjectSchema } from './project-management';
import { createEmptyOperationalDb } from './db-defaults';
import { purgeDemoOperationalData } from './clean-production-data';
import { seedOperationalContent } from './operational-seed';
import { hasOperationalData, isDataPreserveMode, markDataVersionCurrent } from './data-preserve';
import { ensureRolePermissions } from './role-defaults';
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

function applyMigrations() {
  db.users = syncSeedUsers(db.users);
  migrateLegacyUserRefs(db);
  purgeDemoOperationalData(db as Database & { dataVersion?: number });
  db.orgSettings.emailNotifications = mergeEmailSettings(db.orgSettings.emailNotifications);
  if (!db.emailDigestQueue) db.emailDigestQueue = [];
  if (!db.emailDigestMeta) db.emailDigestMeta = {};
  if (!db.surveyResponses) db.surveyResponses = [];
  if (!db.sessions) db.sessions = [];
  if (!db.projectMessages) db.projectMessages = [];
  ensureProjectSchema(db);
  ensureRolePermissions(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  mergeCrmModuleAccess(db.rolePermissions as Record<string, { modules: string[]; description: string }>);
  if (!db.crmLeads) db.crmLeads = [];
  seedOperationalContent(db);
}

function mergeCrmModuleAccess(rolePermissions: Record<string, { modules: string[]; description: string }>) {
  for (const role of ['sales', 'executive_assistant', 'manager', 'admin']) {
    const cfg = rolePermissions[role];
    if (!cfg || cfg.modules.includes('*')) continue;
    if (!cfg.modules.includes('crm')) cfg.modules.push('crm');
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

export function saveDb() {
  persistStore(db);
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
  return db.users.find(u => u.id === id);
}

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