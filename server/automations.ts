import { getDb, saveDb, pushNotification } from './db';
import { employeePerformanceScore, recordPerformanceSnapshots } from './performance-tracking';

export interface AutomationLog {
  id: string;
  rule: string;
  message: string;
  ranAt: string;
  affected: number;
}

let automationLogs: AutomationLog[] = [];

export function getAutomationLogs() {
  return automationLogs.slice(-50).reverse();
}

function log(rule: string, message: string, affected: number) {
  automationLogs.push({
    id: `auto${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    rule,
    message,
    ranAt: new Date().toISOString(),
    affected,
  });
  if (automationLogs.length > 100) automationLogs = automationLogs.slice(-100);
}

/** Run daily HR automations. */
export function runDailyAutomations(): number {
  const db = getDb();
  let total = 0;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Remind managers of pending leave requests
  const pendingLeave = db.leaveRequests.filter(l => l.status === 'Pending');
  if (pendingLeave.length > 0) {
    const managers = db.users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.status === 'Active');
    for (const m of managers) {
      pushNotification(m.id, 'Leave approvals pending', `${pendingLeave.length} leave request(s) need your review.`, { triggerId: 'leave.submitted_manager' });
    }
    log('leave_reminder', `Notified ${managers.length} managers about ${pendingLeave.length} pending leaves`, managers.length);
    total += managers.length;
  }

  // Flag employees with no clock-in by 10:30 AM IST (server TZ)
  if (now.getHours() >= 10) {
    const activeEmployees = db.users.filter(u => u.role === 'employee' && u.status === 'Active');
    let absent = 0;
    for (const emp of activeEmployees) {
      const clocked = db.attendanceLogs.some(l => l.userId === emp.id && l.date === today);
      if (!clocked) {
        pushNotification(emp.id, 'Attendance reminder', 'You have not clocked in today. Please mark your attendance.', { triggerId: 'attendance.regularization_submitted' });
        absent++;
      }
    }
    if (absent > 0) {
      log('attendance_reminder', `Reminded ${absent} employees to clock in`, absent);
      total += absent;
    }
  }

  // Low performance score alert for managers
  const lowPerformers = db.users
    .filter(u => u.role === 'employee' && u.status === 'Active')
    .filter(u => employeePerformanceScore(u.id) < 50);
  if (lowPerformers.length > 0) {
    const managers = db.users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.status === 'Active');
    for (const m of managers) {
      pushNotification(m.id, 'Performance alert', `${lowPerformers.length} team member(s) have performance scores below 50%.`, { triggerId: 'performance.review_completed' });
    }
    log('performance_alert', `Flagged ${lowPerformers.length} low performers`, lowPerformers.length);
    total += lowPerformers.length;
  }

  // Project deadline warnings (due within 7 days)
  const soon = db.projects.filter(p => {
    if (!p.endDate || p.status === 'completed' || p.status === 'archived') return false;
    const days = (new Date(p.endDate).getTime() - now.getTime()) / 86400000;
    return days >= 0 && days <= 7;
  });
  for (const p of soon) {
    for (const uid of p.memberIds || []) {
      pushNotification(uid, 'Project deadline soon', `"${p.name}" is due within 7 days.`, { triggerId: 'projects.assigned' });
    }
    log('project_deadline', `Warned team for project "${p.name}"`, p.memberIds?.length || 0);
    total += p.memberIds?.length || 0;
  }

  // Monthly performance snapshots (first week of month, once per label)
  const monthLabel = now.toISOString().slice(0, 7);
  if (now.getDate() <= 7) {
    const recorded = recordPerformanceSnapshots(monthLabel);
    if (recorded > 0) {
      log('performance_snapshot', `Recorded ${recorded} performance snapshots for ${monthLabel}`, recorded);
      total += recorded;
    }
  }

  if (total > 0) saveDb();
  return total;
}

let started = false;

export function startAutomationScheduler() {
  if (started) return;
  started = true;

  const run = () => {
    try {
      const n = runDailyAutomations();
      if (n > 0) console.log(`[HRMS Automations] Ran ${n} actions`);
    } catch (err) {
      console.error('[HRMS Automations]', err);
    }
  };

  // Run once at startup (after 1 min) and every 6 hours
  setTimeout(run, 60_000);
  setInterval(run, 6 * 60 * 60 * 1000);
  console.log('[HRMS] Automation scheduler started');
}