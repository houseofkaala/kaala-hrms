export const MIN_CLOCK_OUT_HOURS = 4;
export const FULL_DAY_HOURS = 8;

export type AttendanceLog = {
  id: string;
  userId: string;
  clockIn: string;
  clockOut: string | null;
  date: string;
  earlyClockOutApproved?: boolean;
};

export function hoursSince(clockIn: string): number {
  return (Date.now() - new Date(clockIn).getTime()) / 3_600_000;
}

export function evaluateClockOut(log: AttendanceLog) {
  const hoursWorked = hoursSince(log.clockIn);
  const earlyApproved = Boolean(log.earlyClockOutApproved);

  if (hoursWorked < MIN_CLOCK_OUT_HOURS) {
    return {
      allowed: false,
      hoursWorked,
      needsAdminApproval: false,
      canClockOut: false,
      code: 'MIN_HOURS',
      message: `You must complete at least ${MIN_CLOCK_OUT_HOURS} hours before clocking out. ${(MIN_CLOCK_OUT_HOURS - hoursWorked).toFixed(1)} hour(s) remaining.`,
    };
  }

  if (hoursWorked >= FULL_DAY_HOURS || earlyApproved) {
    return {
      allowed: true,
      hoursWorked,
      needsAdminApproval: false,
      canClockOut: true,
      code: 'OK',
      message: hoursWorked >= FULL_DAY_HOURS ? 'Full day completed. You may clock out.' : 'Early clock-out approved.',
    };
  }

  return {
    allowed: false,
    hoursWorked,
    needsAdminApproval: true,
    canClockOut: false,
    code: 'NEEDS_APPROVAL',
    message: `You need admin approval to clock out before ${FULL_DAY_HOURS} hours, or wait ${(FULL_DAY_HOURS - hoursWorked).toFixed(1)} more hour(s).`,
  };
}

export function attendanceStatusPayload(log: AttendanceLog | undefined, checkedIn: boolean) {
  if (!log || !checkedIn) {
    return {
      checkedIn: false,
      clockIn: null as string | null,
      hoursWorked: 0,
      canClockOut: true,
      needsAdminApproval: false,
      minHours: MIN_CLOCK_OUT_HOURS,
      fullDayHours: FULL_DAY_HOURS,
      hoursUntilMin: MIN_CLOCK_OUT_HOURS,
      hoursUntilFullDay: FULL_DAY_HOURS,
      earlyClockOutApproved: false,
    };
  }

  const ev = evaluateClockOut(log);
  return {
    checkedIn: true,
    clockIn: log.clockIn,
    hoursWorked: Math.round(ev.hoursWorked * 10) / 10,
    canClockOut: ev.canClockOut,
    needsAdminApproval: ev.needsAdminApproval,
    minHours: MIN_CLOCK_OUT_HOURS,
    fullDayHours: FULL_DAY_HOURS,
    hoursUntilMin: Math.max(0, Math.round((MIN_CLOCK_OUT_HOURS - ev.hoursWorked) * 10) / 10),
    hoursUntilFullDay: Math.max(0, Math.round((FULL_DAY_HOURS - ev.hoursWorked) * 10) / 10),
    earlyClockOutApproved: Boolean(log.earlyClockOutApproved),
    message: ev.message,
  };
}