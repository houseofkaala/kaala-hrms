import type { AttendanceLog } from './attendance-rules';

export type AttendanceLogRecord = AttendanceLog & {
  clockInLat?: number;
  clockInLng?: number;
  editedBy?: string;
  editedAt?: string;
  adminNote?: string;
};

export function parseDateTimeLocal(date: string, time: string): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Valid date (YYYY-MM-DD) is required');
  }
  const t = time && /^\d{2}:\d{2}$/.test(time) ? time : '09:00';
  const iso = new Date(`${date}T${t}:00`);
  if (isNaN(iso.getTime())) throw new Error('Invalid date/time');
  return iso.toISOString();
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function toTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toTimeString().slice(0, 5);
}

export function validateAttendancePatch(
  patch: { clockIn?: string; clockOut?: string | null; date?: string },
): void {
  const clockIn = patch.clockIn;
  const clockOut = patch.clockOut;
  if (clockIn && clockOut) {
    const inMs = new Date(clockIn).getTime();
    const outMs = new Date(clockOut).getTime();
    if (isNaN(inMs) || isNaN(outMs)) throw new Error('Invalid clock-in or clock-out time');
    if (outMs <= inMs) throw new Error('Clock-out must be after clock-in');
  }
  if (patch.date && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) {
    throw new Error('Date must be YYYY-MM-DD');
  }
}

export function applyAttendancePatch(
  log: AttendanceLogRecord,
  body: {
    clockIn?: string;
    clockInDate?: string;
    clockInTime?: string;
    clockOut?: string | null;
    clockOutDate?: string;
    clockOutTime?: string;
    date?: string;
    adminNote?: string;
  },
  editorId: string,
): void {
  const patch: { clockIn?: string; clockOut?: string | null; date?: string } = {};

  if (body.clockIn) patch.clockIn = body.clockIn;
  else if (body.clockInDate) {
    patch.clockIn = parseDateTimeLocal(body.clockInDate, body.clockInTime || toTimeInput(log.clockIn));
  }

  if (body.clockOut === null) patch.clockOut = null;
  else if (body.clockOut) patch.clockOut = body.clockOut;
  else if (body.clockOutDate) {
    patch.clockOut = parseDateTimeLocal(body.clockOutDate, body.clockOutTime || '18:00');
  }

  if (body.date) patch.date = body.date;

  validateAttendancePatch({
    clockIn: patch.clockIn ?? log.clockIn,
    clockOut: patch.clockOut !== undefined ? patch.clockOut : log.clockOut,
    date: patch.date ?? log.date,
  });

  if (patch.clockIn) log.clockIn = patch.clockIn;
  if (patch.clockOut !== undefined) log.clockOut = patch.clockOut;
  if (patch.date) log.date = patch.date;
  if (body.adminNote !== undefined) log.adminNote = body.adminNote;
  log.editedBy = editorId;
  log.editedAt = new Date().toISOString();
}

export function filterAttendanceLogs(
  logs: AttendanceLogRecord[],
  opts: { userId?: string; from?: string; to?: string },
): AttendanceLogRecord[] {
  return logs.filter(l => {
    if (opts.userId && l.userId !== opts.userId) return false;
    const day = l.date?.split('T')[0] || l.date;
    if (opts.from && day < opts.from) return false;
    if (opts.to && day > opts.to) return false;
    return true;
  });
}

export function attendanceCounts(logs: AttendanceLogRecord[]) {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => (l.date?.split('T')[0] || l.date) === today);
  const clockedInNow = logs.filter(l => !l.clockOut).length;
  const byUser = new Map<string, number>();
  for (const l of todayLogs) {
    byUser.set(l.userId, (byUser.get(l.userId) || 0) + 1);
  }
  return {
    total: logs.length,
    todayEntries: todayLogs.length,
    clockedInNow,
    employeesToday: byUser.size,
  };
}