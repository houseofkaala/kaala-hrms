import { getDb, saveDb } from '../db';
import { TRIGGER_MAP } from './registry';

export interface InAppNotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  triggerId?: string;
  link?: string;
  category?: string;
}

const TRIGGER_LINKS: Record<string, string> = {
  'lifecycle.welcome': '/profile',
  'leave.submitted_manager': '/leave',
  'leave.approved': '/leave',
  'leave.rejected': '/leave',
  'leave.cancelled': '/leave',
  'leave.balance_low': '/leave',
  'leave.holiday_updated': '/holidays',
  'attendance.missed_punch': '/attendance',
  'attendance.regularization_submitted': '/attendance',
  'attendance.regularization_decided': '/attendance',
  'attendance.overtime_approved': '/attendance',
  'payroll.salary_processed': '/payroll',
  'payroll.payslip_generated': '/payroll',
  'payroll.tax_window_opened': '/tax',
  'payroll.tax_pending': '/tax',
  'payroll.reimbursement_approved': '/expenses',
  'recruitment.application_received': '/recruit',
  'recruitment.onboarding_started': '/onboarding',
  'performance.goal_assigned': '/performance',
  'performance.self_review_opened': '/performance',
  'performance.review_completed': '/performance',
  'tasks.assigned': '/tasks',
  'tasks.deadline_approaching': '/tasks',
  'tasks.overdue': '/tasks',
  'tasks.review_required': '/tasks',
  'tasks.approved': '/tasks',
  'tasks.marketplace': '/marketplace',
  'projects.assigned': '/projects',
  'projects.completed': '/projects',
  'assets.assigned': '/assets',
  'documents.uploaded': '/documents',
  'documents.approval_required': '/documents',
  'documents.policy_updated': '/policies',
  'expenses.submitted': '/expenses',
  'expenses.approved': '/expenses',
  'expenses.rejected': '/expenses',
  'training.course_assigned': '/learning',
  'training.course_due': '/learning',
  'training.course_completed': '/learning',
  'helpdesk.ticket_created': '/helpdesk',
  'helpdesk.ticket_assigned': '/helpdesk',
  'helpdesk.ticket_replied': '/helpdesk',
  'helpdesk.ticket_resolved': '/helpdesk',
  'helpdesk.ticket_closed': '/helpdesk',
  'security.password_changed': '/security',
  'security.password_reset': '/security',
  'security.new_device_login': '/security',
  'security.account_locked': '/security',
  'security.account_unlocked': '/security',
  'announcements.company_wide': '/community',
  'announcements.department': '/community',
  'announcements.emergency': '/community',
  'admin.profile_incomplete': '/employees',
  'admin.payroll_failed': '/payroll',
  'admin.attendance_sync_failed': '/employee-timesheets',
  'digest.daily_approvals': '/notifications',
};

export function linkForTrigger(triggerId?: string): string | undefined {
  if (!triggerId) return '/notifications';
  if (TRIGGER_LINKS[triggerId]) return TRIGGER_LINKS[triggerId];
  const prefix = triggerId.split('.')[0];
  const prefixLinks: Record<string, string> = {
    leave: '/leave',
    attendance: '/attendance',
    payroll: '/payroll',
    recruitment: '/recruit',
    performance: '/performance',
    tasks: '/tasks',
    projects: '/projects',
    assets: '/assets',
    documents: '/documents',
    expenses: '/expenses',
    training: '/learning',
    helpdesk: '/helpdesk',
    security: '/security',
    announcements: '/community',
    admin: '/settings',
    lifecycle: '/profile',
  };
  return prefixLinks[prefix] || '/notifications';
}

export function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  opts?: { triggerId?: string; link?: string },
): InAppNotificationRecord {
  const trigger = opts?.triggerId ? TRIGGER_MAP[opts.triggerId] : undefined;
  const record: InAppNotificationRecord = {
    id: `n${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    triggerId: opts?.triggerId,
    link: opts?.link || linkForTrigger(opts?.triggerId),
    category: trigger?.categoryLabel,
  };
  const db = getDb();
  db.notifications.unshift(record as never);
  return record;
}

export function writeInApp(
  userId: string,
  title: string,
  message: string,
  triggerId?: string,
): void {
  createInAppNotification(userId, title, message, { triggerId });
  saveDb();
}

export function serializeNotification(n: InAppNotificationRecord) {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    triggerId: n.triggerId,
    link: n.link || linkForTrigger(n.triggerId),
    category: n.category,
  };
}