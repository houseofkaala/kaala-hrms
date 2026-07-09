export type NotifyRole = 'employee' | 'manager' | 'admin' | 'sales' | 'executive_assistant';
export type NotifyPriority = 'critical' | 'important' | 'reminder' | 'digest';
export type DigestType = 'daily' | 'weekly' | 'monthly';

export interface TriggerDef {
  id: string;
  label: string;
  description: string;
  category: string;
  categoryLabel: string;
  priority: NotifyPriority;
  /** Show in-app notification when this event fires */
  inApp: boolean;
  /** Email enabled by default for matching roles */
  emailDefault: boolean;
  roles: NotifyRole[];
  digestType?: DigestType;
}

export interface TriggerOverride {
  enabled?: boolean;
  roles?: Partial<Record<NotifyRole, boolean>>;
}

export interface DigestSettings {
  dailyAttendance: boolean;
  dailyApprovals: boolean;
  weeklyRecruitment: boolean;
  weeklyTasks: boolean;
  weeklyPerformance: boolean;
  monthlyHrDashboard: boolean;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  fromName: string;
  triggers: Record<string, TriggerOverride>;
  digests: DigestSettings;
}

export interface EmailDigestItem {
  id: string;
  userId: string;
  triggerId: string;
  title: string;
  message: string;
  digestType: DigestType;
  createdAt: string;
}

export interface EmailDigestMeta {
  lastDaily?: string;
  lastWeekly?: string;
  lastMonthly?: string;
}

export interface NotifyOptions {
  triggerId: string;
  userId: string;
  title: string;
  message: string;
  html?: string;
  /** Force in-app even if trigger disables it */
  forceInApp?: boolean;
  /** Skip email (in-app only) */
  inAppOnly?: boolean;
  emailContext?: Record<string, string>;
}