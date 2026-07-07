import type { DigestSettings, EmailNotificationSettings, NotifyRole, TriggerDef } from './types';

const C = {
  lifecycle: 'Employee Lifecycle',
  leave: 'Leave Management',
  attendance: 'Attendance',
  payroll: 'Payroll',
  recruitment: 'Recruitment',
  performance: 'Performance',
  tasks: 'Tasks & Projects',
  assets: 'Assets',
  documents: 'Documents',
  expenses: 'Expense Claims',
  training: 'Training',
  helpdesk: 'Helpdesk',
  security: 'Security',
  announcements: 'Announcements',
  admin: 'Admin Alerts',
  digests: 'Digests',
} as const;

function t(
  id: string,
  label: string,
  description: string,
  category: keyof typeof C,
  priority: TriggerDef['priority'],
  roles: NotifyRole[],
  opts?: Partial<Pick<TriggerDef, 'inApp' | 'emailDefault' | 'digestType'>>,
): TriggerDef {
  return {
    id,
    label,
    description,
    category,
    categoryLabel: C[category],
    priority,
    inApp: opts?.inApp ?? true,
    emailDefault: opts?.emailDefault ?? (priority === 'critical' || priority === 'important'),
    roles,
    digestType: opts?.digestType,
  };
}

/** All configurable email triggers (50+). In-app is separate; routine events default to in-app only. */
export const EMAIL_TRIGGERS: TriggerDef[] = [
  // Employee Lifecycle
  t('lifecycle.welcome', 'Welcome email', 'Sent after account creation with login details', 'lifecycle', 'critical', ['employee'], { emailDefault: true }),
  t('lifecycle.offer_letter', 'Offer letter issued', 'Candidate offer letter published', 'lifecycle', 'critical', ['employee']),
  t('lifecycle.joining_instructions', 'Joining instructions', 'Pre-joining checklist and instructions', 'lifecycle', 'important', ['employee']),
  t('lifecycle.probation_reminder', 'Probation ending reminder', 'Reminder before probation period ends', 'lifecycle', 'reminder', ['employee', 'manager']),
  t('lifecycle.confirmed', 'Employment confirmed', 'Permanent employment confirmation', 'lifecycle', 'important', ['employee']),
  t('lifecycle.exit_initiated', 'Exit process initiated', 'Offboarding process started', 'lifecycle', 'important', ['employee', 'manager']),
  t('lifecycle.exit_interview', 'Exit interview scheduled', 'Exit interview date and time', 'lifecycle', 'important', ['employee']),
  t('lifecycle.experience_letter', 'Experience letter available', 'Experience letter ready to download', 'lifecycle', 'important', ['employee']),
  t('lifecycle.fnf_completed', 'Full & final settlement', 'F&F settlement completed', 'lifecycle', 'critical', ['employee']),

  // Leave
  t('leave.submitted_manager', 'Leave request submitted', 'Notify manager of new leave request', 'leave', 'important', ['manager'], { emailDefault: true }),
  t('leave.approved', 'Leave approved', 'Employee leave request approved', 'leave', 'critical', ['employee'], { emailDefault: true }),
  t('leave.rejected', 'Leave rejected', 'Employee leave request rejected', 'leave', 'critical', ['employee'], { emailDefault: true }),
  t('leave.cancelled', 'Leave cancelled', 'Leave request cancelled', 'leave', 'important', ['employee', 'manager']),
  t('leave.balance_low', 'Leave balance low', 'Annual leave balance running low', 'leave', 'reminder', ['employee']),
  t('leave.absent_without_leave', 'Absent without leave', 'Employee absent without approved leave', 'leave', 'important', ['employee', 'manager']),
  t('leave.holiday_updated', 'Holiday calendar updated', 'Company holiday calendar changed', 'leave', 'important', ['employee'], { inApp: true, emailDefault: false }),

  // Attendance
  t('attendance.missed_punch', 'Missed clock-in/out', 'Reminder to complete attendance punch', 'attendance', 'reminder', ['employee']),
  t('attendance.regularization_submitted', 'Regularization submitted', 'Attendance correction request submitted', 'attendance', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('attendance.regularization_decided', 'Regularization approved/rejected', 'Attendance correction decision', 'attendance', 'important', ['employee'], { emailDefault: true }),
  t('attendance.overtime_approved', 'Overtime approved', 'Overtime request approved', 'attendance', 'important', ['employee']),
  t('attendance.monthly_summary', 'Monthly attendance summary', 'Monthly attendance digest', 'attendance', 'digest', ['employee'], { inApp: false, emailDefault: true, digestType: 'monthly' }),

  // Payroll
  t('payroll.salary_processed', 'Salary processed', 'Payroll run completed', 'payroll', 'critical', ['employee'], { emailDefault: true }),
  t('payroll.payslip_generated', 'Payslip generated', 'Payslip available to view', 'payroll', 'critical', ['employee'], { emailDefault: true }),
  t('payroll.salary_credited', 'Salary credited', 'Salary credited to bank account', 'payroll', 'critical', ['employee']),
  t('payroll.tax_window_opened', 'Tax declaration window', 'Tax declaration period opened', 'payroll', 'important', ['employee']),
  t('payroll.tax_pending', 'Tax declaration reminder', 'Pending tax declaration reminder', 'payroll', 'reminder', ['employee']),
  t('payroll.correction_completed', 'Payroll correction', 'Payroll correction completed', 'payroll', 'important', ['employee']),
  t('payroll.reimbursement_approved', 'Reimbursement approved', 'Expense reimbursement approved', 'payroll', 'important', ['employee'], { emailDefault: true }),
  t('payroll.reimbursement_paid', 'Reimbursement paid', 'Reimbursement payment processed', 'payroll', 'important', ['employee']),

  // Recruitment
  t('recruitment.application_received', 'Application received', 'New job application received', 'recruitment', 'important', ['manager']),
  t('recruitment.interview_scheduled', 'Interview scheduled', 'Interview date confirmed', 'recruitment', 'critical', ['manager']),
  t('recruitment.interview_reminder', 'Interview reminder (24h)', 'Interview reminder one day before', 'recruitment', 'reminder', ['manager']),
  t('recruitment.feedback_pending', 'Interview feedback pending', 'Pending interview feedback', 'recruitment', 'reminder', ['manager']),
  t('recruitment.candidate_selected', 'Candidate selected', 'Candidate selected for offer', 'recruitment', 'important', ['manager']),
  t('recruitment.candidate_rejected', 'Candidate rejected', 'Candidate not selected', 'recruitment', 'important', ['manager'], { inApp: true, emailDefault: false }),
  t('recruitment.offer_accepted', 'Offer accepted', 'Candidate accepted offer', 'recruitment', 'critical', ['manager', 'admin']),
  t('recruitment.onboarding_started', 'Onboarding started', 'New hire onboarding initiated', 'recruitment', 'important', ['manager']),

  // Performance
  t('performance.goal_assigned', 'Goal assigned', 'New performance goal assigned', 'performance', 'important', ['employee'], { emailDefault: true }),
  t('performance.goal_deadline', 'Goal deadline reminder', 'Performance goal due soon', 'performance', 'reminder', ['employee']),
  t('performance.self_review_opened', 'Self-review opened', 'Self-assessment period opened', 'performance', 'important', ['employee']),
  t('performance.manager_review_pending', 'Manager review pending', 'Pending manager performance review', 'performance', 'reminder', ['manager']),
  t('performance.review_completed', 'Review completed', 'Performance review finalised', 'performance', 'important', ['employee']),
  t('performance.promotion_approved', 'Promotion approved', 'Promotion approved', 'performance', 'critical', ['employee']),
  t('performance.increment_approved', 'Salary increment approved', 'Salary increment approved', 'performance', 'critical', ['employee']),

  // Tasks & Projects
  t('tasks.assigned', 'Task assigned', 'New task assigned to you', 'tasks', 'important', ['employee', 'manager'], { emailDefault: true }),
  t('tasks.deadline_approaching', 'Task deadline approaching', 'Task due soon', 'tasks', 'reminder', ['employee']),
  t('tasks.overdue', 'Task overdue', 'Task past deadline', 'tasks', 'reminder', ['employee']),
  t('tasks.review_required', 'Task pending approval', 'Task awaiting manager review', 'tasks', 'important', ['manager'], { inApp: true, emailDefault: false }),
  t('tasks.approved', 'Task approved', 'Task completion approved', 'tasks', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('tasks.marketplace', 'Task to marketplace', 'Task moved to marketplace after SLA breach', 'tasks', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('projects.assigned', 'Project assigned', 'Assigned to a new project', 'tasks', 'important', ['employee']),
  t('projects.completed', 'Project completed', 'Project marked complete', 'tasks', 'important', ['employee', 'manager'], { inApp: true, emailDefault: false }),

  // Assets
  t('assets.assigned', 'Asset assigned', 'Company asset assigned to you', 'assets', 'important', ['employee'], { emailDefault: true }),
  t('assets.return_reminder', 'Asset return reminder', 'Reminder to return assigned asset', 'assets', 'reminder', ['employee']),
  t('assets.overdue', 'Asset overdue', 'Asset return overdue', 'assets', 'reminder', ['employee', 'manager']),
  t('assets.damaged_reported', 'Asset damage reported', 'Asset damage or loss reported', 'assets', 'important', ['manager', 'admin']),

  // Documents
  t('documents.uploaded', 'New document uploaded', 'New document available', 'documents', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('documents.approval_required', 'Document approval required', 'Document needs your approval', 'documents', 'important', ['manager'], { emailDefault: true }),
  t('documents.decided', 'Document approved/rejected', 'Document approval decision', 'documents', 'important', ['employee']),
  t('documents.expiring', 'Document expiring soon', 'Passport, visa, or ID expiring', 'documents', 'reminder', ['employee', 'manager']),
  t('documents.policy_updated', 'Policy updated', 'Company policy requires acknowledgment', 'documents', 'important', ['employee']),

  // Expenses
  t('expenses.submitted', 'Expense submitted', 'Expense claim submitted for approval', 'expenses', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('expenses.approved', 'Expense approved', 'Expense claim approved', 'expenses', 'important', ['employee'], { emailDefault: true }),
  t('expenses.rejected', 'Expense rejected', 'Expense claim rejected', 'expenses', 'important', ['employee'], { emailDefault: true }),
  t('expenses.reimbursed', 'Expense reimbursed', 'Expense reimbursement processed', 'expenses', 'important', ['employee']),

  // Training
  t('training.course_assigned', 'Course assigned', 'Training course assigned', 'training', 'important', ['employee'], { emailDefault: true }),
  t('training.course_due', 'Course due reminder', 'Training course due soon', 'training', 'reminder', ['employee']),
  t('training.course_completed', 'Course completed', 'Training course completed', 'training', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('training.certificate_issued', 'Certificate issued', 'Training certificate available', 'training', 'important', ['employee']),

  // Helpdesk
  t('helpdesk.ticket_created', 'Ticket created', 'Support ticket created', 'helpdesk', 'important', ['employee'], { inApp: true, emailDefault: false }),
  t('helpdesk.ticket_assigned', 'Ticket assigned', 'Ticket assigned to agent', 'helpdesk', 'important', ['manager']),
  t('helpdesk.ticket_replied', 'Ticket replied', 'New reply on your ticket', 'helpdesk', 'important', ['employee']),
  t('helpdesk.ticket_resolved', 'Ticket resolved', 'Support ticket resolved', 'helpdesk', 'important', ['employee']),
  t('helpdesk.ticket_closed', 'Ticket closed', 'Support ticket closed', 'helpdesk', 'important', ['employee'], { inApp: true, emailDefault: false }),

  // Security
  t('security.password_changed', 'Password changed', 'Account password was changed', 'security', 'critical', ['employee', 'manager', 'admin'], { emailDefault: true }),
  t('security.password_reset', 'Password reset requested', 'Password reset initiated', 'security', 'critical', ['employee', 'manager', 'admin']),
  t('security.new_device_login', 'New device login', 'Login from a new device', 'security', 'critical', ['employee', 'manager', 'admin']),
  t('security.unusual_location', 'Unusual location login', 'Login from unusual location', 'security', 'critical', ['employee', 'manager', 'admin']),
  t('security.2fa_changed', '2FA enabled/disabled', 'Two-factor authentication changed', 'security', 'critical', ['employee', 'manager', 'admin']),
  t('security.failed_attempts', 'Failed login attempts', 'Multiple failed login attempts', 'security', 'critical', ['employee', 'manager', 'admin']),
  t('security.account_locked', 'Account locked', 'Account locked due to security policy', 'security', 'critical', ['employee', 'manager', 'admin']),
  t('security.account_unlocked', 'Account unlocked', 'Account unlocked by administrator', 'security', 'important', ['employee', 'manager', 'admin']),

  // Announcements
  t('announcements.company_wide', 'Company announcement', 'Company-wide announcement', 'announcements', 'important', ['employee', 'manager', 'admin']),
  t('announcements.department', 'Department announcement', 'Department-level announcement', 'announcements', 'important', ['employee', 'manager']),
  t('announcements.emergency', 'Emergency announcement', 'Urgent company announcement', 'announcements', 'critical', ['employee', 'manager', 'admin'], { emailDefault: true }),
  t('announcements.office_closure', 'Office closure', 'Office closure notification', 'announcements', 'critical', ['employee', 'manager', 'admin']),
  t('announcements.holiday', 'Holiday announcement', 'Upcoming holiday announcement', 'announcements', 'important', ['employee']),

  // Admin alerts
  t('admin.profile_incomplete', 'Profile incomplete', 'Employee profile missing required fields', 'admin', 'reminder', ['admin', 'manager']),
  t('admin.missing_documents', 'Missing mandatory documents', 'Required documents not uploaded', 'admin', 'reminder', ['admin', 'manager']),
  t('admin.license_expiring', 'License expiring', 'Employee certification expiring', 'admin', 'reminder', ['admin', 'manager']),
  t('admin.payroll_failed', 'Payroll processing failed', 'Payroll run failed', 'admin', 'critical', ['admin']),
  t('admin.attendance_sync_failed', 'Attendance sync failed', 'Biometric sync failure', 'admin', 'critical', ['admin']),
  t('admin.backup_failed', 'Backup failed', 'System backup failed', 'admin', 'critical', ['admin']),
  t('admin.integration_failure', 'Integration failure', 'Third-party integration error', 'admin', 'critical', ['admin']),
  t('admin.maintenance_scheduled', 'Maintenance scheduled', 'Planned system maintenance', 'admin', 'important', ['admin', 'manager']),

  // Digests (aggregated emails — not fired individually)
  t('digest.daily_attendance', 'Daily attendance exceptions', 'Daily summary of attendance issues', 'digests', 'digest', ['manager', 'admin'], { inApp: false, emailDefault: true, digestType: 'daily' }),
  t('digest.daily_approvals', 'Daily pending approvals', 'Leave, expenses, and timesheets pending', 'digests', 'digest', ['manager', 'admin'], { inApp: false, emailDefault: true, digestType: 'daily' }),
  t('digest.weekly_recruitment', 'Weekly recruitment pipeline', 'Recruitment pipeline summary', 'digests', 'digest', ['manager', 'admin'], { inApp: false, emailDefault: true, digestType: 'weekly' }),
  t('digest.weekly_tasks', 'Weekly task summary', 'Team task progress summary', 'digests', 'digest', ['manager', 'employee'], { inApp: false, emailDefault: true, digestType: 'weekly' }),
  t('digest.weekly_performance', 'Weekly performance reminders', 'Goals and reviews due this week', 'digests', 'digest', ['manager', 'employee'], { inApp: false, emailDefault: true, digestType: 'weekly' }),
  t('digest.monthly_hr_dashboard', 'Monthly HR dashboard', 'Monthly HR metrics summary', 'digests', 'digest', ['admin', 'manager'], { inApp: false, emailDefault: true, digestType: 'monthly' }),
];

export const TRIGGER_MAP = Object.fromEntries(EMAIL_TRIGGERS.map(tr => [tr.id, tr])) as Record<string, TriggerDef>;

export const TRIGGER_CATEGORIES = [...new Set(EMAIL_TRIGGERS.map(tr => tr.category))].map(cat => ({
  id: cat,
  label: C[cat as keyof typeof C] || cat,
}));

export function defaultEmailNotificationSettings(): EmailNotificationSettings {
  const triggers: EmailNotificationSettings['triggers'] = {};
  for (const tr of EMAIL_TRIGGERS) {
    triggers[tr.id] = {
      enabled: tr.emailDefault,
      roles: Object.fromEntries(tr.roles.map(r => [r, true])) as Partial<Record<NotifyRole, boolean>>,
    };
  }
  return {
    enabled: true,
    fromName: 'House of Kaala HR',
    triggers,
    digests: {
      dailyAttendance: true,
      dailyApprovals: true,
      weeklyRecruitment: true,
      weeklyTasks: true,
      weeklyPerformance: true,
      monthlyHrDashboard: true,
    },
  };
}

export function mergeEmailSettings(raw?: Partial<EmailNotificationSettings> | null): EmailNotificationSettings {
  const defaults = defaultEmailNotificationSettings();
  if (!raw) return defaults;
  return {
    enabled: raw.enabled ?? defaults.enabled,
    fromName: raw.fromName || defaults.fromName,
    triggers: { ...defaults.triggers, ...raw.triggers },
    digests: { ...defaults.digests, ...raw.digests },
  };
}

export function digestEnabled(key: keyof DigestSettings, digests: DigestSettings): boolean {
  return digests[key] ?? false;
}