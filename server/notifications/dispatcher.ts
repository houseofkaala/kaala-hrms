import { getDb, getUserById, saveDb } from '../db';
import { sendEmail, buildEmailHtml, isEmailConfigured } from '../email/transport';
import { createInAppNotification } from './in-app';
import { TRIGGER_MAP, mergeEmailSettings } from './registry';
import type { NotifyOptions, NotifyRole, TriggerDef } from './types';

function triggerEnabled(trigger: TriggerDef, role: NotifyRole, settings: ReturnType<typeof mergeEmailSettings>): boolean {
  const override = settings.triggers[trigger.id];
  const enabled = override?.enabled ?? trigger.emailDefault;
  if (!enabled) return false;
  const roleEnabled = override?.roles?.[role];
  if (roleEnabled === false) return false;
  if (roleEnabled === true) return true;
  return trigger.roles.includes(role);
}

function shouldSendEmail(opts: NotifyOptions): boolean {
  if (opts.inAppOnly) return false;
  const db = getDb();
  if (!db.orgSettings.notificationsEnabled) return false;
  const emailSettings = mergeEmailSettings(db.orgSettings.emailNotifications);
  if (!emailSettings.enabled) return false;
  if (!isEmailConfigured()) return false;

  const user = getUserById(opts.userId);
  if (!user || user.status === 'Inactive') return false;
  if (user.preferences?.emailNotifications === false) return false;

  const trigger = TRIGGER_MAP[opts.triggerId];
  if (!trigger) return false;
  if (trigger.priority === 'digest') return false;

  return triggerEnabled(trigger, user.role, emailSettings);
}

function shouldShowInApp(opts: NotifyOptions): boolean {
  if (opts.forceInApp) return true;
  const trigger = TRIGGER_MAP[opts.triggerId];
  return trigger?.inApp ?? true;
}

function queueDigest(opts: NotifyOptions): void {
  const trigger = TRIGGER_MAP[opts.triggerId];
  if (!trigger?.digestType) return;
  const db = getDb();
  if (!db.emailDigestQueue) db.emailDigestQueue = [];
  db.emailDigestQueue.push({
    id: `ed${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    userId: opts.userId,
    triggerId: opts.triggerId,
    title: opts.title,
    message: opts.message,
    digestType: trigger.digestType,
    createdAt: new Date().toISOString(),
  });
}

function writeInApp(userId: string, title: string, message: string, triggerId?: string): void {
  createInAppNotification(userId, title, message, { triggerId });
}

function welcomeHtml(name: string, email: string, loginUrl: string, password: string | undefined, company: string): string {
  const lines = [
    `Dear ${name},`,
    '',
    'Your House of Kaala HRMS account has been created.',
    '',
    `Sign in at: ${loginUrl}`,
    `Email: ${email}`,
    password ? `Temporary password: ${password}` : 'Use the password shared with you by HR.',
    '',
    'Please change your password after your first login.',
    '',
    'Regards,',
    'HR Team',
  ];
  return buildEmailHtml('Welcome to House of Kaala', lines.join('\n'), company);
}

/** Central notification dispatcher — in-app + optional email based on trigger config. */
export async function notify(opts: NotifyOptions): Promise<void> {
  const trigger = TRIGGER_MAP[opts.triggerId];
  if (!trigger) {
    console.warn('[HRMS Notify] Unknown trigger:', opts.triggerId);
    writeInApp(opts.userId, opts.title, opts.message, opts.triggerId);
    saveDb();
    return;
  }

  if (shouldShowInApp(opts)) {
    writeInApp(opts.userId, opts.title, opts.message, opts.triggerId);
  }

  if (trigger.priority === 'digest') {
    queueDigest(opts);
    saveDb();
    return;
  }

  saveDb();

  if (!shouldSendEmail(opts)) return;

  const user = getUserById(opts.userId);
  if (!user?.email) return;

  const db = getDb();
  const emailSettings = mergeEmailSettings(db.orgSettings.emailNotifications);
  const company = db.orgSettings.companyName || 'House of Kaala';

  let html = opts.html;
  if (!html && opts.triggerId === 'lifecycle.welcome' && opts.emailContext) {
    html = welcomeHtml(
      opts.emailContext.name || user.name,
      opts.emailContext.email || user.email,
      opts.emailContext.loginUrl || '',
      opts.emailContext.password,
      company,
    );
  } else if (!html) {
    html = buildEmailHtml(opts.title, opts.message, company);
  }

  await sendEmail({
    to: user.email,
    subject: `[${company}] ${opts.title}`,
    text: opts.message,
    html,
    fromName: emailSettings.fromName,
  }, emailSettings);
}

/** Notify a user's manager (or first active manager). */
export async function notifyManager(
  employeeUserId: string,
  opts: Omit<NotifyOptions, 'userId'>,
): Promise<void> {
  const employee = getUserById(employeeUserId);
  const db = getDb();
  const manager = employee?.managerId
    ? getUserById(employee.managerId)
    : db.users.find(u => u.role === 'manager' && u.status === 'Active');
  if (!manager) return;
  await notify({ ...opts, userId: manager.id });
}