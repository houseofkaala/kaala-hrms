import { syncSeedUsers, migrateLegacyUserRefs } from './seed-users';
import { createEmptyOperationalDb } from './db-defaults';
import { purgeDemoOperationalData } from './clean-production-data';
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
  role: 'employee' | 'manager' | 'admin';
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
}

function hydrateStore(raw: Partial<Database> | null) {
  db = { ...defaultDb(), ...(raw || {}) };
  // Do not treat default dataVersion as "already migrated" when loading legacy stores.
  if (!raw?.dataVersion) {
    delete (db as Database & { dataVersion?: number }).dataVersion;
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
    console.error('[HRMS] Database load failed, using defaults:', err);
    hydrateStore(null);
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
  return safe;
}

export function getUserById(id: string) {
  return db.users.find(u => u.id === id);
}

export function pushNotification(userId: string, title: string, message: string) {
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