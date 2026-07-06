import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'store.json');

export interface TaskRecord {
  id: string;
  title: string;
  ownerId: string;
  status: string;
  value: number;
  deadline: string;
  category?: string;
  priority?: string;
  claimedById?: string | null;
  referenceLink?: string;
  timeStarted?: string;
  timeSpent?: number;
}

export interface UserRecord {
  id: string;
  name: string;
  points: number;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  status: string;
  email: string;
  password: string;
  phone: string;
  projects: string[];
  title?: string;
  joinDate?: string;
  employmentType?: string;
  emergencyContact?: string;
  managerId?: string | null;
  address?: string;
  bankAccount?: string;
  preferences?: { emailNotifications: boolean; timezone: string };
}

function defaultDb() {
  const users: UserRecord[] = [
    { id: 'u1', name: 'John Doe', points: 1000, role: 'employee', department: 'Engineering', status: 'Active', email: 'john.doe@kaala.io', password: 'Demo@123', phone: '+1 (555) 123-4567', projects: ['Website Redesign', 'API Optimization'], title: 'Software Engineer', joinDate: '2023-03-15', employmentType: 'Full-Time', emergencyContact: 'Jane Doe (Spouse) - 555-0199', managerId: 'm1', address: '42 Oak Street, San Francisco', bankAccount: '****4521', preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' } },
    { id: 'u2', name: 'Jane Smith', points: 940, role: 'employee', department: 'Design', status: 'On Leave', email: 'jane.smith@kaala.io', password: 'Demo@123', phone: '+1 (555) 987-6543', projects: ['Q4 Marketing Campaign', 'Brand Refresh'], title: 'UI Designer', joinDate: '2022-08-01', employmentType: 'Full-Time', emergencyContact: 'Tom Smith - 555-0188', managerId: 'm1', preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' } },
    { id: 'u3', name: 'David Lee', points: 1000, role: 'employee', department: 'Marketing', status: 'Active', email: 'david.lee@kaala.io', password: 'Demo@123', phone: '+1 (555) 456-7890', projects: ['Q4 Marketing Campaign', 'Social Media Strategy'], title: 'Marketing Specialist', joinDate: '2024-01-10', employmentType: 'Full-Time', managerId: 'm2', preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' } },
    { id: 'u4', name: 'Sarah Chen', points: 1000, role: 'employee', department: 'Engineering', status: 'Active', email: 'sarah.chen@kaala.io', password: 'Demo@123', phone: '+1 (555) 234-5678', projects: ['Infrastructure Migration'], title: 'DevOps Engineer', joinDate: '2023-11-20', employmentType: 'Full-Time', managerId: 'm1', preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' } },
    { id: 'm1', name: 'Manager Mike', points: 1000, role: 'manager', department: 'Engineering', status: 'Active', email: 'mike.m@kaala.io', password: 'Demo@123', phone: '+1 (555) 345-6789', projects: ['Engineering Leadership', 'Infrastructure Migration'], title: 'Engineering Manager', joinDate: '2021-06-01', employmentType: 'Full-Time', managerId: 'm2', preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' } },
    { id: 'm2', name: 'Admin Alice', points: 1000, role: 'admin', department: 'Operations', status: 'Active', email: 'alice.a@kaala.io', password: 'Admin@123', phone: '+1 (555) 876-5432', projects: ['Office Expansion'], title: 'HR Administrator', joinDate: '2020-02-14', employmentType: 'Full-Time', managerId: null, preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' } },
  ];

  return {
    users,
    tasks: [
      { id: 't1', title: 'Complete Q3 Financial Report', ownerId: 'u1', status: 'pending', value: 0, deadline: new Date(Date.now() + 86400000 * 3).toISOString(), category: 'Admin', priority: 'High' },
      { id: 't2', title: 'Update Client Presentation Deck', ownerId: 'u2', status: 'pending', value: 0, deadline: new Date(Date.now() + 86400000 * 5).toISOString(), category: 'Design', priority: 'Normal' },
      { id: 't3', title: 'Fix Homepage CSS Bug', ownerId: 'u2', status: 'marketplace', value: 10, deadline: new Date().toISOString(), category: 'Development', priority: 'High' },
      { id: 't4', title: 'Write API Documentation', ownerId: 'u1', status: 'claimed', claimedById: 'u2', value: 10, deadline: new Date(Date.now() + 86400000 * 2).toISOString(), category: 'Development', priority: 'Normal' },
      { id: 't5', title: 'Optimize Database Queries', ownerId: 'u2', status: 'under_review', claimedById: 'u1', value: 10, deadline: new Date().toISOString(), category: 'Development', priority: 'High' },
    ] as TaskRecord[],
    kanbanTasks: [
      { id: 'KT-101', title: 'Design new landing page', stage: 'todo', priority: 'High', assigneeId: 'u2' },
      { id: 'KT-102', title: 'API Integration', stage: 'in_progress', priority: 'Normal', assigneeId: 'u1' },
      { id: 'KT-103', title: 'QA regression suite', stage: 'in_review', priority: 'Normal', assigneeId: 'u4' },
      { id: 'KT-104', title: 'Deploy staging environment', stage: 'done', priority: 'High', assigneeId: 'u4' },
    ],
    transactions: [
      { id: 'tx1', userId: 'u2', amount: -60, reason: 'SLA Breach: tasks moved to marketplace', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'tx2', userId: 'u1', amount: 10, reason: 'Completed Marketplace Task: Write API Documentation', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    ] as { id: string; userId: string; amount: number; reason: string; timestamp: string }[],
    assets: [
      { id: 'AST-104', name: 'MacBook Pro 16"', userId: 'u1', user: 'John Doe', status: 'Assigned' },
      { id: 'AST-105', name: 'Dell UltraSharp 27"', userId: 'u2', user: 'Jane Smith', status: 'Assigned' },
      { id: 'AST-106', name: 'ErgoChair Pro', userId: null, user: null, status: 'Available' },
      { id: 'AST-107', name: 'iPad Pro', userId: 'm2', user: 'Admin Alice', status: 'Assigned' },
    ],
    leaveRequests: [
      { id: 'lr1', userId: 'u2', type: 'Vacation', startDate: '2026-07-10', endDate: '2026-07-12', days: 3, reason: 'Family trip', status: 'Approved', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: 'lr2', userId: 'u1', type: 'Sick Leave', startDate: '2026-07-20', endDate: '2026-07-20', days: 1, reason: 'Medical appointment', status: 'Pending', createdAt: new Date().toISOString() },
    ],
    documents: [
      { id: 'doc1', userId: 'u1', name: 'Employment Contract.pdf', category: 'Contract', uploadedAt: '2025-01-15', size: '245 KB' },
      { id: 'doc2', userId: 'u1', name: 'ID Verification.pdf', category: 'Identity', uploadedAt: '2025-01-15', size: '128 KB' },
      { id: 'doc3', userId: 'u2', name: 'Offer Letter.pdf', category: 'Contract', uploadedAt: '2024-08-01', size: '198 KB' },
    ],
    notifications: [
      { id: 'n1', userId: 'u1', title: 'Leave request submitted', message: 'Your sick leave request is pending manager approval.', read: false, createdAt: new Date().toISOString() },
      { id: 'n2', userId: 'u1', title: 'Task moved to marketplace', message: 'Fix Homepage CSS Bug was moved to the Reward Marketplace.', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'n3', userId: 'm1', title: 'Review required', message: 'Optimize Database Queries is awaiting your approval.', read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
    ],
    attendanceLogs: [] as { id: string; userId: string; clockIn: string; clockOut: string | null; date: string }[],
    attendanceRequests: [] as { id: string; userId: string; type: string; date: string; hours?: string; reason?: string; location?: string; time?: string; status: string; createdAt: string }[],
    candidates: [
      { id: 'c1', name: 'Alice Cooper', role: 'Frontend Engineer', stage: 'Interview' },
      { id: 'c2', name: 'Bob Marley', role: 'Product Manager', stage: 'Applied' },
      { id: 'c3', name: 'Charlie Puth', role: 'Backend Engineer', stage: 'Offer' },
    ],
    payrollRecords: [
      { id: 'pr1', userId: 'u1', period: 'June 2026', grossPay: 8500, deductions: 1250, netPay: 7250, status: 'Paid' },
      { id: 'pr2', userId: 'u1', period: 'May 2026', grossPay: 8500, deductions: 1250, netPay: 7250, status: 'Paid' },
      { id: 'pr3', userId: 'u1', period: 'April 2026', grossPay: 8500, deductions: 1250, netPay: 7250, status: 'Paid' },
      { id: 'pr4', userId: 'u1', period: 'March 2026', grossPay: 8500, deductions: 1250, netPay: 7250, status: 'Paid' },
    ],
    projects: [
      { id: 'p1', name: 'Website Redesign', progress: 75, teamSize: 4, memberIds: ['u1', 'u2', 'u4', 'm1'] },
      { id: 'p2', name: 'Q4 Marketing Campaign', progress: 30, teamSize: 6, memberIds: ['u2', 'u3'] },
      { id: 'p3', name: 'Infrastructure Migration', progress: 90, teamSize: 3, memberIds: ['u4', 'm1'] },
    ],
    courses: [
      { id: 'lc1', title: 'Information Security Basics', duration: '45m', required: true, enrolled: ['u1', 'u4'] },
      { id: 'lc2', title: 'Advanced React Patterns', duration: '2h 30m', required: false, enrolled: ['u1'] },
      { id: 'lc3', title: 'Leadership & Management', duration: '1h 15m', required: false, enrolled: ['m1'] },
      { id: 'lc4', title: 'Effective Communication', duration: '50m', required: false, enrolled: [] },
    ],
    surveys: [
      { id: 'sv1', title: 'Q3 Employee Engagement', description: 'Share your thoughts on company culture. Your feedback is anonymous.', dueIn: '2 days', responses: [] as string[] },
    ],
    fieldAgents: [
      { id: 'fa1', name: 'John Doe', location: 'Downtown Office', lat: 12.97, lng: 77.59, status: 'Active' },
      { id: 'fa2', name: 'David Lee', location: 'Client Site A', lat: 12.93, lng: 77.62, status: 'Active' },
    ],
    expenses: [
      { id: 'ex1', userId: 'u3', title: 'Client lunch', amount: 85, status: 'Pending', date: '2026-06-28' },
      { id: 'ex2', userId: 'u1', title: 'Software license', amount: 49, status: 'Approved', date: '2026-06-25' },
    ],
    tickets: [
      { id: 'TKT-101', title: 'Laptop screen flickering', category: 'IT Support', priority: 'High', status: 'Open', date: '2026-06-10', userId: 'u2', user: 'Jane Smith' },
      { id: 'TKT-102', title: 'Payroll discrepancy for June', category: 'Finance', priority: 'Medium', status: 'In Progress', date: '2026-06-09', userId: 'u1', user: 'John Doe' },
      { id: 'TKT-103', title: 'Request for standing desk', category: 'Facilities', priority: 'Low', status: 'Resolved', date: '2026-06-05', userId: 'u4', user: 'Sarah Chen' },
      { id: 'TKT-104', title: 'Cannot access VPN', category: 'IT Support', priority: 'High', status: 'Open', date: '2026-06-11', userId: 'u3', user: 'David Lee' },
    ],
    communityPosts: [
      { id: 'cp1', userId: 'm2', author: 'Sarah from HR', type: 'announcement', title: 'Q3 Company Offsite!', content: "Get ready team! Our Q3 offsite is scheduled for next Friday. We'll be heading to the coastal retreat for a day of team building.", likes: 24, comments: 5, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'cp2', userId: 'u3', author: 'David Lee', type: 'recognition', title: 'Kudos to Sarah Chen!', content: 'Huge shoutout to Sarah for pulling off that incredible client presentation yesterday.', likes: 42, comments: 3, createdAt: new Date(Date.now() - 18000000).toISOString() },
    ],
    events: [
      { id: 'ev1', title: 'Product Launch Townhall', date: '2026-07-15', time: '10:00 AM', location: 'Main Hall' },
      { id: 'ev2', title: 'Q3 Offsite Retreat', date: '2026-07-20', time: 'All Day', location: 'Coastal Resort' },
    ],
    polls: [
      { id: 'poll1', question: 'What should be our next team building activity?', options: [{ label: 'Escape Room', votes: 29 }, { label: 'Cooking Class', votes: 12 }, { label: 'Bowling', votes: 7 }] },
    ],
    chatMessages: [
      { id: 'cm1', fromId: 'u2', toId: 'u1', content: 'Can you review the PR I just opened?', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'cm2', fromId: 'u1', toId: 'u2', content: 'Sure, taking a look now.', createdAt: new Date(Date.now() - 3300000).toISOString() },
    ] as { id: string; fromId: string; toId: string; content: string; createdAt: string }[],
    aiMessages: {} as Record<string, { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }[]>,
    performanceGoals: [
      { id: 'g1', userId: 'u1', title: 'Ship API v2', progress: 65, target: 100, quarter: 'Q3 2026' },
      { id: 'g2', userId: 'u1', title: 'Reduce bug count by 20%', progress: 40, target: 100, quarter: 'Q3 2026' },
    ],
    performanceReviews: [
      { id: 'rv1', userId: 'u1', reviewerId: 'm1', rating: 4, feedback: 'Strong technical contributor.', period: 'H1 2026', status: 'Completed' },
    ],
    skills: [
      { id: 'sk1', userId: 'u1', name: 'React', level: 4, maxLevel: 5 },
      { id: 'sk2', userId: 'u1', name: 'TypeScript', level: 4, maxLevel: 5 },
      { id: 'sk3', userId: 'u1', name: 'Node.js', level: 3, maxLevel: 5 },
    ],
    badges: [
      { id: 'b1', name: 'Quality Champ', icon: 'award' },
      { id: 'b2', name: 'Fast Learner', icon: 'trending' },
      { id: 'b3', name: 'Team Player', icon: 'users' },
    ],
    userBadges: [
      { userId: 'u1', badgeId: 'b1' },
      { userId: 'u1', badgeId: 'b2' },
    ],
    giftCards: [
      { id: 'gc1', name: 'Amazon Gift Card', pointsCost: 500, value: 50, currency: 'USD' },
      { id: 'gc2', name: 'Starbucks Card', pointsCost: 200, value: 20, currency: 'USD' },
    ],
    orgSettings: {
      companyName: 'House of Kaala',
      timezone: 'Asia/Kolkata',
      workWeekStart: 'Monday',
      defaultLeaveDays: 18,
      sickLeaveDays: 12,
      marketplacePenalty: 50,
      fridayScanTime: '18:30',
      notificationsEnabled: true,
      twoFactorRequired: false,
    },
    rolePermissions: {
      employee: { modules: ['dashboard', 'people', 'attendance', 'leave', 'documents', 'assets', 'performance', 'learning', 'surveys', 'community', 'helpdesk', 'marketplace', 'rewards', 'leaderboard', 'chat', 'ai', 'profile', 'notifications', 'expenses', 'timesheets', 'onboarding', 'holidays', 'policies', 'orgchart'], description: 'Standard employee access' },
      manager: { modules: ['*'], description: 'Team management and approvals' },
      admin: { modules: ['*'], description: 'Full system access' },
    },
    holidays: [
      { id: 'h1', name: 'Independence Day', date: '2026-08-15', type: 'Public' },
      { id: 'h2', name: 'Diwali', date: '2026-11-01', type: 'Public' },
      { id: 'h3', name: 'Christmas', date: '2026-12-25', type: 'Public' },
      { id: 'h4', name: 'Company Foundation Day', date: '2026-07-15', type: 'Company' },
    ],
    shifts: [
      { id: 'sh1', userId: 'u1', shiftType: 'Morning (09:00-17:00)', date: '2026-07-18', status: 'Approved', reason: 'Standard shift' },
      { id: 'sh2', userId: 'u2', shiftType: 'Flexible (10:00-18:00)', date: '2026-07-20', status: 'Pending', reason: 'Doctor appointment morning' },
    ],
    policies: [
      { id: 'pol1', title: 'Flexible Timing', description: 'Core hours: 10AM - 4PM. Employees may start between 8-10AM.', category: 'Attendance', status: 'Active' },
      { id: 'pol2', title: 'Late Mark Policy', description: 'More than 3 late marks in a month triggers manager review.', category: 'Attendance', status: 'Active' },
      { id: 'pol3', title: 'Remote Work', description: 'Up to 2 WFH days per week with manager approval.', category: 'Remote', status: 'Active' },
      { id: 'pol4', title: 'Expense Reimbursement', description: 'Submit expenses within 30 days with receipts.', category: 'Finance', status: 'Active' },
      { id: 'pol5', title: 'Code of Conduct', description: 'All employees must adhere to company values and ethics policy.', category: 'HR', status: 'Active' },
    ],
    onboardingTasks: [
      { id: 'ob1', userId: 'u1', title: 'Complete IT setup', description: 'Receive laptop and set up accounts', status: 'Completed', dueDate: '2023-03-20', category: 'IT' },
      { id: 'ob2', userId: 'u1', title: 'Sign employment contract', description: 'Review and sign offer letter', status: 'Completed', dueDate: '2023-03-18', category: 'HR' },
      { id: 'ob3', userId: 'u3', title: 'Complete security training', description: 'Mandatory InfoSec course', status: 'Pending', dueDate: '2026-07-15', category: 'Learning' },
      { id: 'ob4', userId: 'u3', title: 'Meet your team', description: 'Schedule intro with manager and team', status: 'Pending', dueDate: '2026-07-10', category: 'HR' },
    ],
    timesheets: [
      { id: 'ts1', userId: 'u1', projectId: 'p1', projectName: 'Website Redesign', date: '2026-07-01', hours: 6, description: 'Frontend components', status: 'Approved' },
      { id: 'ts2', userId: 'u1', projectId: 'p3', projectName: 'Infrastructure Migration', date: '2026-07-02', hours: 4, description: 'Docker setup', status: 'Pending' },
      { id: 'ts3', userId: 'u4', projectId: 'p3', projectName: 'Infrastructure Migration', date: '2026-07-01', hours: 8, description: 'K8s migration', status: 'Approved' },
    ],
    biometricDevices: [
      { id: 'bio1', name: 'Main Entrance Scanner', location: 'HQ Lobby', status: 'Online', lastSync: new Date(Date.now() - 120000).toISOString() },
      { id: 'bio2', name: 'Floor 2 Scanner', location: 'Engineering Wing', status: 'Online', lastSync: new Date(Date.now() - 300000).toISOString() },
    ],
    courseProgress: {} as Record<string, Record<string, number>>,
  };
}

export type Database = ReturnType<typeof defaultDb>;

let db: Database = defaultDb();

export function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      db = { ...defaultDb(), ...JSON.parse(raw) };
    } else {
      db = defaultDb();
      saveDb();
    }
  } catch {
    db = defaultDb();
    saveDb();
  }
}

export function saveDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function getDb() {
  return db;
}

export function sanitizeUser(user: UserRecord) {
  const { password, ...safe } = user;
  return safe;
}

export function getUserById(id: string) {
  return db.users.find(u => u.id === id);
}

export function pushNotification(userId: string, title: string, message: string) {
  db.notifications.unshift({
    id: `n${Date.now()}`,
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();
}

export function addTransaction(userId: string, amount: number, reason: string) {
  db.transactions.push({
    id: `tx${Date.now()}`,
    userId,
    amount,
    reason,
    timestamp: new Date().toISOString(),
  });
  saveDb();
}