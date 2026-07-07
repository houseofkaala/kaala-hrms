import type { Database } from './db';
import type { UserRecord } from './db';

export function buildAiReply(message: string, user: UserRecord | undefined, db: Database): string {
  const lower = message.toLowerCase().trim();
  const name = user?.name?.split(' ')[0] || 'there';

  const approvedLeave = db.leaveRequests
    .filter(l => l.userId === user?.id && l.status === 'Approved')
    .reduce((s, l) => s + l.days, 0);
  const pendingLeave = db.leaveRequests.filter(l => l.userId === user?.id && l.status === 'Pending').length;
  const allowance = db.orgSettings.defaultLeaveDays;
  const remaining = Math.max(0, allowance - approvedLeave);

  const rank = [...db.users]
    .sort((a, b) => b.points - a.points)
    .findIndex(u => u.id === user?.id) + 1;

  if (!lower) {
    return `Hello ${name}! I am your HR assistant. Ask me about leave balance, attendance, payroll, or Kaala Points.`;
  }

  if (/^(hi|hello|hey|namaste|good morning|good afternoon)/.test(lower)) {
    return `Namaste ${name}! How may I help you today? You can ask about leave, attendance, payroll, holidays, or rewards.`;
  }

  if (lower.includes('leave') || lower.includes('holiday')) {
    if (lower.includes('holiday') && !lower.includes('leave')) {
      const upcoming = (db.holidays || [])
        .filter(h => h.date >= new Date().toISOString().slice(0, 10))
        .slice(0, 3)
        .map(h => `${h.name} (${h.date})`)
        .join(', ');
      return upcoming
        ? `Upcoming holidays: ${upcoming}. Your annual leave balance is ${remaining} of ${allowance} days.`
        : `Your annual leave balance is ${remaining} of ${allowance} days. ${pendingLeave} request(s) pending approval.`;
    }
    return `You have used ${approvedLeave} approved leave days this year. ${remaining} days remaining out of ${allowance}. ${pendingLeave} request(s) awaiting approval.`;
  }

  if (lower.includes('payroll') || lower.includes('salary') || lower.includes('payslip')) {
    const records = db.payrollRecords.filter(p => p.userId === user?.id);
    if (records.length === 0) {
      return `${name}, no payslips are uploaded yet. Please contact HR or check the Payroll section once your salary is processed.`;
    }
    const latest = records[0];
    return `Your latest payslip (${latest.period}) shows net pay of ₹${latest.netPay.toLocaleString('en-IN')}. ${records.length} record(s) on file.`;
  }

  if (lower.includes('point') || lower.includes('reward') || lower.includes('kaala')) {
    return `You have ${user?.points ?? 0} Kaala Points. Your organisation rank is #${rank || '—'}. Visit Rewards to redeem points.`;
  }

  if (lower.includes('attendance') || lower.includes('clock') || lower.includes('punch')) {
    const today = new Date().toISOString().slice(0, 10);
    const log = db.attendanceLogs.find(l => l.userId === user?.id && l.date === today && !l.clockOut);
    return log
      ? `You are checked in since ${new Date(log.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Use Attendance to clock out.`
      : `You are not checked in today. Go to Attendance to mark your punch.`;
  }

  if (lower.includes('policy') || lower.includes('policies')) {
    const count = db.policies?.length ?? 0;
    return `${count} company policies are available in the Policies section — covering attendance, leave, remote work, and conduct.`;
  }

  if (lower.includes('help') || lower.includes('what can you')) {
    return `I can help with:\n• Leave balance and requests\n• Attendance and punch status\n• Payroll and payslips\n• Kaala Points and rewards\n• Company holidays and policies\n\nJust ask in plain English.`;
  }

  return `Thanks ${name}. I could not find a specific answer. Try asking about leave (${remaining} days left), attendance, payroll, or Kaala Points (${user?.points ?? 0} KP). For complex queries, contact your HR manager.`;
}