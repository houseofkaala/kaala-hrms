import type { getDb } from './db';

type Db = ReturnType<typeof getDb>;

export const LEAVE_TYPES = new Set(['Sick Leave', 'Vacation', 'Personal']);

export interface LeaveBalance {
  annualRemaining: number;
  sickRemaining: number;
  pendingDays: number;
}

export function getLeaveBalance(db: Db, userId: string): LeaveBalance {
  const approved = db.leaveRequests.filter(l => l.userId === userId && l.status === 'Approved');
  const pending = db.leaveRequests.filter(l => l.userId === userId && l.status === 'Pending');
  const annualUsed = approved.filter(l => l.type !== 'Sick Leave').reduce((s, l) => s + l.days, 0);
  const sickUsed = approved.filter(l => l.type === 'Sick Leave').reduce((s, l) => s + l.days, 0);
  const pendingAnnual = pending.filter(l => l.type !== 'Sick Leave').reduce((s, l) => s + l.days, 0);
  const pendingSick = pending.filter(l => l.type === 'Sick Leave').reduce((s, l) => s + l.days, 0);
  return {
    annualRemaining: Math.max(0, db.orgSettings.defaultLeaveDays - annualUsed - pendingAnnual),
    sickRemaining: Math.max(0, db.orgSettings.sickLeaveDays - sickUsed - pendingSick),
    pendingDays: pending.reduce((s, l) => s + l.days, 0),
  };
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function validateLeaveSubmission(
  db: Db,
  userId: string,
  type: string,
  startDate: string,
  endDate: string,
  days: number,
): string | null {
  if (!LEAVE_TYPES.has(type)) return 'Invalid leave type. Use Sick Leave, Vacation, or Personal.';

  const balance = getLeaveBalance(db, userId);
  const isSick = type === 'Sick Leave';
  const remaining = isSick ? balance.sickRemaining : balance.annualRemaining;
  if (days > remaining) {
    return `Insufficient ${isSick ? 'sick' : 'annual'} leave balance. ${remaining} day(s) remaining.`;
  }

  const active = db.leaveRequests.filter(
    l => l.userId === userId && (l.status === 'Pending' || l.status === 'Approved'),
  );
  for (const l of active) {
    if (datesOverlap(startDate, endDate, l.startDate, l.endDate)) {
      return `Dates overlap with an existing ${l.status.toLowerCase()} ${l.type} request (${l.startDate} – ${l.endDate}).`;
    }
  }
  return null;
}

export function validateLeaveApproval(
  db: Db,
  request: { id: string; userId: string; type: string; days: number; status: string },
  newStatus: string,
): string | null {
  if (request.status !== 'Pending') {
    return 'Only pending requests can be updated.';
  }
  if (newStatus !== 'Approved') return null;

  const approved = db.leaveRequests.filter(
    l => l.userId === request.userId && l.status === 'Approved' && l.id !== request.id,
  );
  const annualUsed = approved.filter(l => l.type !== 'Sick Leave').reduce((s, l) => s + l.days, 0);
  const sickUsed = approved.filter(l => l.type === 'Sick Leave').reduce((s, l) => s + l.days, 0);
  const isSick = request.type === 'Sick Leave';
  const limit = isSick ? db.orgSettings.sickLeaveDays : db.orgSettings.defaultLeaveDays;
  const used = isSick ? sickUsed : annualUsed;
  if (used + request.days > limit) {
    return `Approval would exceed ${isSick ? 'sick' : 'annual'} leave balance.`;
  }
  return null;
}