import { getDb, getUserById, saveDb } from '../db';
import { sendEmail, buildEmailHtml } from '../email/transport';
import { mergeEmailSettings, digestEnabled } from './registry';
import type { DigestType, EmailDigestItem, NotifyRole } from './types';

function managersAndAdmins() {
  return getDb().users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.status !== 'Inactive');
}

function buildDailyApprovalsDigest(): { title: string; lines: string[] } {
  const db = getDb();
  const pendingLeave = db.leaveRequests.filter(r => r.status === 'Pending').length;
  const pendingExpenses = db.expenses.filter(e => e.status === 'Pending').length;
  const pendingTimesheets = db.timesheets.filter(t => t.status === 'Pending').length;
  const pendingAttendance = db.attendanceRequests.filter(r => r.status === 'Pending').length;
  const total = pendingLeave + pendingExpenses + pendingTimesheets + pendingAttendance;
  return {
    title: 'Daily pending approvals',
    lines: [
      `You have ${total} item(s) awaiting your review:`,
      `• Leave requests: ${pendingLeave}`,
      `• Expense claims: ${pendingExpenses}`,
      `• Timesheets: ${pendingTimesheets}`,
      `• Attendance regularisation: ${pendingAttendance}`,
      '',
      'Please log in to the admin portal to take action.',
    ],
  };
}

function buildDailyAttendanceDigest(): { title: string; lines: string[] } {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const activeEmployees = db.users.filter(u => u.role === 'employee' && u.status !== 'Inactive');
  const punchedToday = new Set(db.attendanceLogs.filter(l => l.date === today).map(l => l.userId));
  const missing = activeEmployees.filter(e => !punchedToday.has(e.id));
  return {
    title: 'Daily attendance exceptions',
    lines: missing.length === 0
      ? ['All employees have checked in today. No exceptions to report.']
      : [
          `${missing.length} employee(s) have not punched in today:`,
          ...missing.slice(0, 15).map(e => `• ${e.name} (${e.department})`),
          missing.length > 15 ? `…and ${missing.length - 15} more` : '',
        ].filter(Boolean),
  };
}

function buildWeeklyRecruitmentDigest(): { title: string; lines: string[] } {
  const db = getDb();
  const byStage = db.candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {});
  const lines = Object.keys(byStage).length === 0
    ? ['No active candidates in the pipeline this week.']
    : ['Recruitment pipeline summary:', ...Object.entries(byStage).map(([stage, n]) => `• ${stage}: ${n}`)];
  return { title: 'Weekly recruitment pipeline', lines };
}

function buildWeeklyTasksDigest(userId: string): { title: string; lines: string[] } {
  const db = getDb();
  const tasks = db.tasks.filter(t => t.ownerId === userId || t.claimedById === userId);
  const pending = tasks.filter(t => ['pending', 'in_progress', 'claimed', 'under_review'].includes(t.status));
  const overdue = pending.filter(t => new Date(t.deadline) < new Date());
  return {
    title: 'Weekly task summary',
    lines: [
      `Active tasks: ${pending.length}`,
      `Overdue: ${overdue.length}`,
      overdue.length > 0 ? 'Please review overdue items in your dashboard.' : 'You are on track this week.',
    ],
  };
}

function buildWeeklyPerformanceDigest(): { title: string; lines: string[] } {
  const db = getDb();
  const openGoals = db.performanceGoals.filter(g => g.progress < g.target).length;
  const pendingReviews = db.performanceReviews.filter(r => r.status === 'Pending').length;
  return {
    title: 'Weekly performance reminders',
    lines: [
      `Open goals: ${openGoals}`,
      `Pending reviews: ${pendingReviews}`,
      'Log in to complete self-reviews and manager feedback.',
    ],
  };
}

function buildMonthlyHrDigest(): { title: string; lines: string[] } {
  const db = getDb();
  const headcount = db.users.filter(u => u.status !== 'Inactive').length;
  const openTickets = db.tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const pendingLeave = db.leaveRequests.filter(r => r.status === 'Pending').length;
  return {
    title: 'Monthly HR dashboard',
    lines: [
      `Active headcount: ${headcount}`,
      `Open helpdesk tickets: ${openTickets}`,
      `Pending leave requests: ${pendingLeave}`,
      `Payroll records this month: ${db.payrollRecords.length}`,
    ],
  };
}

async function sendDigestEmail(userId: string, title: string, lines: string[]): Promise<void> {
  const user = getUserById(userId);
  if (!user?.email || user.preferences?.emailNotifications === false) return;
  const db = getDb();
  const settings = mergeEmailSettings(db.orgSettings.emailNotifications);
  if (!settings.enabled) return;
  const company = db.orgSettings.companyName || 'House of Kaala';
  const message = lines.join('\n');
  await sendEmail({
    to: user.email,
    subject: `[${company}] ${title}`,
    text: message,
    html: buildEmailHtml(title, message, company),
    fromName: settings.fromName,
  }, settings);
}

function flushQueuedDigests(type: DigestType): void {
  const db = getDb();
  if (!db.emailDigestQueue?.length) return;
  const remaining: EmailDigestItem[] = [];
  const grouped = new Map<string, EmailDigestItem[]>();

  for (const item of db.emailDigestQueue) {
    if (item.digestType !== type) {
      remaining.push(item);
      continue;
    }
    const list = grouped.get(item.userId) || [];
    list.push(item);
    grouped.set(item.userId, list);
  }

  db.emailDigestQueue = remaining;
  saveDb();

  for (const [userId, items] of grouped) {
    const lines = items.map(i => `• ${i.title}: ${i.message}`);
    void sendDigestEmail(userId, `${type.charAt(0).toUpperCase() + type.slice(1)} digest`, lines);
  }
}

function shouldRunDigest(type: DigestType, hour: number, dayOfWeek: number, dayOfMonth: number): boolean {
  if (type === 'daily') return hour === 9;
  if (type === 'weekly') return dayOfWeek === 1 && hour === 9;
  if (type === 'monthly') return dayOfMonth === 1 && hour === 9;
  return false;
}

function alreadyRan(type: DigestType, key: string): boolean {
  const meta = getDb().emailDigestMeta || {};
  if (type === 'daily') return meta.lastDaily === key;
  if (type === 'weekly') return meta.lastWeekly === key;
  return meta.lastMonthly === key;
}

function markRan(type: DigestType, key: string): void {
  const db = getDb();
  db.emailDigestMeta = { ...db.emailDigestMeta, [`last${type.charAt(0).toUpperCase() + type.slice(1)}`]: key };
  saveDb();
}

export async function runScheduledDigests(): Promise<void> {
  const db = getDb();
  if (!db.orgSettings.notificationsEnabled) return;
  const settings = mergeEmailSettings(db.orgSettings.emailNotifications);
  if (!settings.enabled) return;

  const now = new Date();
  const hour = now.getHours();
  const dayKey = now.toISOString().split('T')[0];
  const weekKey = `${now.getFullYear()}-W${Math.ceil((now.getDate()) / 7)}`;
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  if (shouldRunDigest('daily', hour, now.getDay(), now.getDate()) && !alreadyRan('daily', dayKey)) {
    if (digestEnabled('dailyApprovals', settings.digests)) {
      const digest = buildDailyApprovalsDigest();
      for (const u of managersAndAdmins()) {
        await sendDigestEmail(u.id, digest.title, digest.lines);
      }
    }
    if (digestEnabled('dailyAttendance', settings.digests)) {
      const digest = buildDailyAttendanceDigest();
      for (const u of managersAndAdmins()) {
        await sendDigestEmail(u.id, digest.title, digest.lines);
      }
    }
    flushQueuedDigests('daily');
    markRan('daily', dayKey);
  }

  if (shouldRunDigest('weekly', hour, now.getDay(), now.getDate()) && !alreadyRan('weekly', weekKey)) {
    if (digestEnabled('weeklyRecruitment', settings.digests)) {
      const digest = buildWeeklyRecruitmentDigest();
      for (const u of managersAndAdmins()) await sendDigestEmail(u.id, digest.title, digest.lines);
    }
    if (digestEnabled('weeklyTasks', settings.digests)) {
      for (const u of db.users.filter(x => x.status !== 'Inactive')) {
        const digest = buildWeeklyTasksDigest(u.id);
        await sendDigestEmail(u.id, digest.title, digest.lines);
      }
    }
    if (digestEnabled('weeklyPerformance', settings.digests)) {
      const digest = buildWeeklyPerformanceDigest();
      for (const u of managersAndAdmins()) await sendDigestEmail(u.id, digest.title, digest.lines);
    }
    flushQueuedDigests('weekly');
    markRan('weekly', weekKey);
  }

  if (shouldRunDigest('monthly', hour, now.getDay(), now.getDate()) && !alreadyRan('monthly', monthKey)) {
    if (digestEnabled('monthlyHrDashboard', settings.digests)) {
      const digest = buildMonthlyHrDigest();
      for (const u of managersAndAdmins()) await sendDigestEmail(u.id, digest.title, digest.lines);
    }
    flushQueuedDigests('monthly');
    markRan('monthly', monthKey);
  }
}