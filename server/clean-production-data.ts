import type { Database } from './db';

export const DATA_VERSION = 3;

/** Remove seeded demo records; keep real users and company settings. */
export function purgeDemoOperationalData(db: Database & { dataVersion?: number }) {
  if (db.dataVersion && db.dataVersion >= DATA_VERSION) return;

  const LEGACY_DEMO_IDS = new Set(['u1', 'u2', 'u3', 'u4', 'm1', 'm2']);
  for (const u of db.users) {
    if (LEGACY_DEMO_IDS.has(u.id) || u.email.endsWith('@kaala.io')) {
      u.status = 'Inactive';
    }
  }

  const activeUserIds = new Set(db.users.filter(u => u.status === 'Active').map(u => u.id));

  db.tasks = [];
  db.kanbanTasks = [];
  db.transactions = [];
  db.assets = [];
  db.leaveRequests = [];
  db.documents = [];
  db.candidates = [];
  db.payrollRecords = [];
  db.projects = [];
  if ('projectTasks' in db) (db as { projectTasks: unknown[] }).projectTasks = [];
  db.courses = [];
  db.surveys = [];
  db.fieldAgents = [];
  db.expenses = [];
  db.tickets = [];
  db.communityPosts = [];
  db.events = [];
  db.polls = [];
  db.chatMessages = [];
  db.aiMessages = {};
  db.performanceGoals = [];
  db.performanceReviews = [];
  db.skills = [];
  db.userBadges = [];
  db.shifts = [];
  db.timesheets = [];
  db.attendanceLogs = [];
  db.attendanceRequests = [];
  db.courseProgress = {};

  db.onboardingTasks = (db.onboardingTasks || []).filter(
    t => activeUserIds.has(t.userId) && !['u1', 'u2', 'u3', 'u4', 'm1', 'm2'].includes(t.userId),
  );

  db.notifications = (db.notifications || []).filter(n => activeUserIds.has(n.userId));

  db.orgSettings = {
    ...db.orgSettings,
    companyName: 'House of Kaala',
    timezone: 'Asia/Kolkata',
    workWeekStart: 'Monday',
    defaultLeaveDays: 18,
    sickLeaveDays: 12,
  };

  db.dataVersion = DATA_VERSION;
  console.log(`[HRMS] Demo operational data cleared (dataVersion ${DATA_VERSION})`);
}