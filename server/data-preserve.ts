import type { Database } from './db';

export const DATA_VERSION = 3;

/** When true (default), startup migrations must not delete or overwrite live records. */
export function isDataPreserveMode(): boolean {
  const flag = process.env.DATA_PRESERVE?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  return true;
}

/** True when the loaded store already has real company data worth protecting. */
export function hasOperationalData(raw: Partial<Database> | null | undefined): boolean {
  if (!raw) return false;
  const users = raw.users ?? [];
  const nonSeedUsers = users.filter(
    u => u.status === 'Active' && !['admin-1', 'mgr-1', 'emp-1'].includes(u.id),
  );
  return Boolean(
    nonSeedUsers.length > 0 ||
    (raw.tasks?.length ?? 0) > 0 ||
    (raw.projects?.length ?? 0) > 0 ||
    (raw.attendanceLogs?.length ?? 0) > 0 ||
    (raw.leaveRequests?.length ?? 0) > 0 ||
    (raw.documents?.length ?? 0) > 0 ||
    (raw.payrollRecords?.length ?? 0) > 0 ||
    (raw.chatMessages?.length ?? 0) > 0 ||
    (raw.expenses?.length ?? 0) > 0,
  );
}

/** Bump version without running destructive cleanup. */
export function markDataVersionCurrent(db: Database & { dataVersion?: number }) {
  if (!db.dataVersion || db.dataVersion < DATA_VERSION) {
    db.dataVersion = DATA_VERSION;
  }
}