import { Express } from 'express';
import {
  loadDb, saveDb, getDb, sanitizeUser, getUserById, pushNotification, addTransaction, UserRecord,
} from './db';
import { AuthedRequest, authMiddleware, requireRole, createSession, deleteSession } from './middleware';
import { registerExtraRoutes } from './extra-routes';

export type { AuthedRequest } from './middleware';

const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 30;

function formatLog(log: { id: string; userId: string; clockIn: string; clockOut: string | null; date: string }) {
  const user = getUserById(log.userId) || { name: 'Unknown' };
  const dateObj = new Date(log.date);
  const dateStr = isNaN(dateObj.getTime()) ? log.date : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  let total = '--';
  let status = 'Working';
  let statusType = 'working';
  if (log.clockOut) {
    const diff = new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    total = `${h}h ${m}m`;
    const clockIn = new Date(log.clockIn);
    const isLate = clockIn.getHours() > WORK_START_HOUR || (clockIn.getHours() === WORK_START_HOUR && clockIn.getMinutes() > WORK_START_MINUTE);
    const hoursWorked = diff / 3600000;
    if (hoursWorked < 4) { status = 'Absent'; statusType = 'absent'; }
    else if (isLate) { status = 'Late'; statusType = 'late'; }
    else { status = 'On Time'; statusType = 'ontime'; }
  }
  return { id: log.id, name: user.name, userId: log.userId, date: dateStr, in: log.clockIn ? new Date(log.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:-- --', out: log.clockOut ? new Date(log.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:-- --', rawClockIn: log.clockIn, rawClockOut: log.clockOut, total, status, statusType };
}

function weeklySummary(userId: string) {
  const db = getDb();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const chart = days.map((day, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const logs = db.attendanceLogs.filter(l => l.userId === userId && l.date === dateStr && l.clockOut);
    const hours = logs.reduce((sum, l) => sum + (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000, 0);
    return { day, hours: Math.round(hours * 10) / 10 };
  });
  const completed = db.attendanceLogs.filter(l => l.userId === userId && l.clockOut);
  let onTime = 0;
  let late = 0;
  completed.forEach(l => {
    const clockIn = new Date(l.clockIn);
    const isLate = clockIn.getHours() > WORK_START_HOUR || (clockIn.getHours() === WORK_START_HOUR && clockIn.getMinutes() > WORK_START_MINUTE);
    const hoursWorked = (new Date(l.clockOut!).getTime() - clockIn.getTime()) / 3600000;
    if (hoursWorked < 4) return;
    if (isLate) late++;
    else onTime++;
  });
  return { chart, onTime, late };
}

export function registerRoutes(app: Express) {
  loadDb();
  const db = () => getDb();

  app.post('/api/auth/login', (req, res) => {
    const user = db().users.find(u => u.email === req.body.email && u.password === req.body.password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const rawPortal = req.headers['x-portal'] || req.body.portal;
    const portal = rawPortal === 'manager' ? 'admin' : rawPortal;
    const rolePortal = user.role === 'employee' ? 'employee' : 'admin';
    if (portal && ['employee', 'admin'].includes(portal) && portal !== rolePortal) {
      return res.status(403).json({
        error: `Wrong portal. Use the ${rolePortal} portal for this account.`,
        correctPortal: rolePortal,
      });
    }

    const token = createSession(user.id);
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/logout', authMiddleware, (req: AuthedRequest, res) => {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) deleteSession(h.slice(7));
    res.json({ success: true });
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'connected', uptime: process.uptime() }));

  app.use('/api', authMiddleware);

  app.get('/api/me', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user));
  });

  app.patch('/api/me', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { phone, name, preferences, emergencyContact, address, bankAccount } = req.body;
    if (phone) user.phone = phone;
    if (name) user.name = name;
    if (emergencyContact) user.emergencyContact = emergencyContact;
    if (address) user.address = address;
    if (bankAccount) user.bankAccount = bankAccount;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    saveDb();
    res.json(sanitizeUser(user));
  });

  app.get('/api/users', (_req, res) => res.json(db().users.map(sanitizeUser)));

  app.get('/api/users/:id', (req, res) => {
    const user = getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ...sanitizeUser(user), employmentType: user.employmentType, emergencyContact: user.emergencyContact });
  });

  app.get('/api/employees', requireRole('manager', 'admin'), (_req, res) => {
    res.json(db().users.map(u => ({ ...sanitizeUser(u), employeeCode: `EMP-${u.id.toUpperCase()}`, designation: u.title })));
  });

  app.post('/api/employees', requireRole('admin'), (req, res) => {
    const { name, email, department, role, title } = req.body;
    const newUser: UserRecord = { id: `u${Date.now()}`, name, email, department: department || 'General', role: role || 'employee', title: title || 'Employee', password: 'Demo@123', points: 1000, status: 'Active', phone: '', projects: [], joinDate: new Date().toISOString().split('T')[0] };
    db().users.push(newUser);
    saveDb();
    res.json({ success: true, employee: sanitizeUser(newUser) });
  });

  // Leave
  app.get('/api/leave-requests', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    const isMgr = user?.role === 'manager' || user?.role === 'admin';
    const list = isMgr ? db().leaveRequests : db().leaveRequests.filter(l => l.userId === req.userId);
    res.json(list.map(l => ({ ...l, employee: sanitizeUser(getUserById(l.userId)!) })));
  });

  app.get('/api/leave-balance', (req: AuthedRequest, res) => {
    const approved = db().leaveRequests.filter(l => l.userId === req.userId && l.status === 'Approved');
    const annualUsed = approved.filter(l => l.type !== 'Sick Leave').reduce((s, l) => s + l.days, 0);
    const sickUsed = approved.filter(l => l.type === 'Sick Leave').reduce((s, l) => s + l.days, 0);
    res.json({
      annual: db().orgSettings.defaultLeaveDays,
      sick: db().orgSettings.sickLeaveDays,
      used: annualUsed,
      sickUsed,
      annualRemaining: Math.max(0, db().orgSettings.defaultLeaveDays - annualUsed),
      sickRemaining: Math.max(0, db().orgSettings.sickLeaveDays - sickUsed),
      pending: db().leaveRequests.filter(l => l.userId === req.userId && l.status === 'Pending').length,
    });
  });

  app.post('/api/leave-requests', (req: AuthedRequest, res) => {
    const { type, startDate, endDate, reason } = req.body;
    const days = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    const r = { id: `lr${Date.now()}`, userId: req.userId!, type, startDate, endDate, days, reason, status: 'Pending', createdAt: new Date().toISOString() };
    db().leaveRequests.unshift(r);
    pushNotification(req.userId!, 'Leave request submitted', `Your ${type} request (${days} days) is pending approval.`);
    saveDb();
    res.json({ success: true, request: r });
  });

  app.patch('/api/leave-requests/:id', requireRole('manager', 'admin'), (req, res) => {
    const r = db().leaveRequests.find(l => l.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    r.status = req.body.status;
    pushNotification(r.userId, `Leave ${req.body.status.toLowerCase()}`, `Your ${r.type} request has been ${req.body.status.toLowerCase()}.`);
    saveDb();
    res.json({ success: true, request: r });
  });

  // Documents
  app.get('/api/documents', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    const uid = (req.query.userId as string) || req.userId!;
    if (uid !== req.userId && user?.role !== 'manager' && user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(db().documents.filter(d => d.userId === uid));
  });

  app.post('/api/documents', (req: AuthedRequest, res) => {
    const doc = { id: `doc${Date.now()}`, userId: req.userId!, name: req.body.name, category: req.body.category || 'General', uploadedAt: new Date().toISOString().split('T')[0], size: req.body.size || '128 KB' };
    db().documents.unshift(doc);
    saveDb();
    res.json({ success: true, document: doc });
  });

  // Notifications
  app.get('/api/notifications', (req: AuthedRequest, res) => {
    const data = db().notifications.filter(n => n.userId === req.userId);
    res.json({ data, unread: data.filter(n => !n.read).length });
  });

  app.patch('/api/notifications/:id/read', (req: AuthedRequest, res) => {
    const n = db().notifications.find(x => x.id === req.params.id && x.userId === req.userId);
    if (!n) return res.status(404).json({ error: 'Not found' });
    n.read = true; saveDb();
    res.json({ success: true });
  });

  app.patch('/api/notifications/read-all', (req: AuthedRequest, res) => {
    db().notifications.forEach(n => { if (n.userId === req.userId) n.read = true; });
    saveDb();
    res.json({ success: true });
  });

  // Settings & roles
  app.get('/api/settings', requireRole('manager', 'admin'), (_req, res) => res.json(db().orgSettings));
  app.patch('/api/settings', requireRole('admin'), (req, res) => { Object.assign(db().orgSettings, req.body); saveDb(); res.json({ success: true, settings: db().orgSettings }); });
  app.get('/api/roles', requireRole('admin'), (_req, res) => res.json(db().rolePermissions));
  app.get('/api/roles/users', requireRole('admin'), (_req, res) => res.json(db().users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, department: u.department }))));
  app.patch('/api/roles/users/:id', requireRole('admin'), (req, res) => {
    const u = getUserById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    u.role = req.body.role; saveDb();
    res.json({ success: true, user: sanitizeUser(u) });
  });

  // Assets
  app.get('/api/assets', (_req, res) => res.json(db().assets));
  app.post('/api/assets', requireRole('manager', 'admin'), (req, res) => {
    const a = { id: 'AST-' + Math.floor(Math.random() * 1000), name: req.body.name, userId: null, user: null, status: 'Available' };
    db().assets.push(a); saveDb();
    res.json({ success: true, asset: a });
  });

  app.patch('/api/assets/:id/assign', requireRole('manager', 'admin'), (req, res) => {
    const a = db().assets.find(x => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.body.userId);
    a.userId = req.body.userId; a.user = u?.name || null; a.status = 'Assigned';
    saveDb();
    res.json({ success: true, asset: a });
  });

  // Marketplace tasks
  app.get('/api/tasks', (_req, res) => res.json(db().tasks));
  app.post('/api/tasks', (req: AuthedRequest, res) => {
    const t = { id: `t${Date.now()}`, title: req.body.title, ownerId: req.userId!, status: 'pending', value: Number(req.body.value) || 10, deadline: req.body.deadline || new Date(Date.now() + 7 * 86400000).toISOString(), referenceLink: req.body.referenceLink, category: req.body.category, priority: req.body.priority || 'Normal' };
    db().tasks.push(t); saveDb();
    res.json({ success: true, task: t });
  });
  app.put('/api/tasks/:id', (req: AuthedRequest, res) => {
    const t = db().tasks.find(x => x.id === req.params.id);
    if (!t || t.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    Object.assign(t, { title: req.body.title ?? t.title, referenceLink: req.body.referenceLink ?? t.referenceLink, category: req.body.category ?? t.category });
    saveDb();
    res.json({ success: true, task: t });
  });
  app.post('/api/marketplace/claim', (req: AuthedRequest, res) => {
    const t = db().tasks.find(x => x.id === req.body.taskId);
    if (!t || t.status !== 'marketplace' || t.ownerId === req.userId) return res.status(400).json({ error: 'Cannot claim' });
    t.status = 'claimed'; t.claimedById = req.userId; saveDb();
    res.json({ success: true, task: t });
  });
  app.post('/api/tasks/timer', (req: AuthedRequest, res) => {
    const t = db().tasks.find(x => x.id === req.body.taskId);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (req.body.action === 'start') { t.status = 'in_progress'; t.timeStarted = new Date().toISOString(); }
    else if (req.body.action === 'stop') { t.timeSpent = (t.timeSpent || 0) + req.body.durationMs; t.timeStarted = undefined; }
    saveDb();
    res.json({ success: true, task: t });
  });
  app.post('/api/tasks/complete', (req: AuthedRequest, res) => {
    const t = db().tasks.find(x => x.id === req.body.taskId);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if ((t.claimedById && t.claimedById !== req.userId) || (!t.claimedById && t.ownerId !== req.userId)) return res.status(400).json({ error: 'Forbidden' });
    if (t.status === 'in_progress' && t.timeStarted) { t.timeSpent = (t.timeSpent || 0) + Date.now() - new Date(t.timeStarted).getTime(); t.timeStarted = undefined; }
    t.status = 'under_review'; saveDb();
    pushNotification('m1', 'Review required', `"${t.title}" is awaiting approval.`);
    res.json({ success: true, task: t });
  });
  app.post('/api/tasks/approve', requireRole('manager', 'admin'), (req, res) => {
    const t = db().tasks.find(x => x.id === req.body.taskId);
    if (!t || t.status !== 'under_review') return res.status(400).json({ error: 'Invalid' });
    t.status = 'completed';
    const c = getUserById(t.claimedById);
    if (c) { c.points += 10; addTransaction(c.id, 10, `Completed: "${t.title}"`); pushNotification(c.id, 'Task approved', `+10 KP for "${t.title}"`); }
    saveDb();
    res.json({ success: true, task: t });
  });
  app.post('/api/tasks/reject', requireRole('manager', 'admin'), (req, res) => {
    const t = db().tasks.find(x => x.id === req.body.taskId);
    if (!t || t.status !== 'under_review') return res.status(400).json({ error: 'Invalid' });
    t.status = 'marketplace'; t.claimedById = null; saveDb();
    res.json({ success: true, task: t });
  });

  // Kanban
  app.get('/api/kanban', (_req, res) => res.json(db().kanbanTasks));
  app.post('/api/kanban', (req: AuthedRequest, res) => {
    const t = { id: `KT-${Date.now()}`, title: req.body.title, stage: 'todo', priority: req.body.priority || 'Normal', assigneeId: req.userId! };
    db().kanbanTasks.push(t); saveDb();
    res.json({ success: true, task: t });
  });
  app.patch('/api/kanban/:id', (req, res) => {
    const t = db().kanbanTasks.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (req.body.stage) t.stage = req.body.stage;
    saveDb();
    res.json({ success: true, task: t });
  });

  app.get('/api/transactions/:userId', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    if (req.params.userId !== req.userId && u?.role !== 'manager' && u?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(db().transactions.filter(t => t.userId === req.params.userId).reverse());
  });

  app.get('/api/rewards/summary', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    const tx = db().transactions.filter(t => t.userId === req.userId);
    const earned = tx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spent = Math.abs(tx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    const sorted = [...db().users].sort((a, b) => b.points - a.points);
    const rank = sorted.findIndex(u => u.id === req.userId) + 1;
    const badges = db().userBadges.filter(b => b.userId === req.userId).map(b => db().badges.find(x => x.id === b.badgeId)).filter(Boolean);
    res.json({ balance: user?.points || 0, lifetimeEarned: earned + (user?.points || 0), lifetimeSpent: spent, rank, badges, giftCards: db().giftCards });
  });

  app.post('/api/rewards/redeem/:id', (req: AuthedRequest, res) => {
    const card = db().giftCards.find(c => c.id === req.params.id);
    const user = getUserById(req.userId!);
    if (!card || !user || user.points < card.pointsCost) return res.status(400).json({ error: 'Insufficient points' });
    user.points -= card.pointsCost;
    addTransaction(user.id, -card.pointsCost, `Redeemed: ${card.name}`);
    saveDb();
    res.json({ success: true });
  });

  // Admin crons
  app.post('/api/admin/trigger-friday', requireRole('admin'), (_req, res) => {
    let affected = 0;
    db().tasks.forEach(t => {
      if (t.status === 'pending') {
        t.status = 'marketplace'; t.value = 10;
        const o = getUserById(t.ownerId);
        if (o) { o.points -= 10; addTransaction(o.id, -10, `SLA Breach: "${t.title}"`); pushNotification(o.id, 'Task to marketplace', `"${t.title}" moved (-10 KP)`); affected++; }
      }
    });
    saveDb();
    res.json({ success: true, message: `Friday Cron: ${affected} tasks moved.` });
  });
  app.post('/api/admin/trigger-sunday', requireRole('admin'), (_req, res) => {
    let affected = 0;
    db().tasks.forEach(t => {
      if (t.status === 'claimed') {
        t.status = 'marketplace';
        const c = getUserById(t.claimedById);
        if (c) { c.points -= 50; addTransaction(c.id, -50, `Failed: "${t.title}"`); pushNotification(c.id, 'Penalty applied', `-50 KP for "${t.title}"`); }
        t.claimedById = null; affected++;
      }
    });
    saveDb();
    res.json({ success: true, message: `Sunday Cron: ${affected} tasks failed.` });
  });

  // Attendance
  app.post('/api/attendance/toggle', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const active = db().attendanceLogs.find(l => l.userId === req.userId && !l.clockOut);
    let checkedIn = false;
    if (active) { active.clockOut = new Date().toISOString(); user.status = 'Offline'; }
    else {
      db().attendanceLogs.push({ id: `att_${Date.now()}`, userId: req.userId!, clockIn: new Date().toISOString(), clockOut: null, date: new Date().toISOString().split('T')[0] });
      user.status = 'Active'; checkedIn = true;
    }
    saveDb();
    res.json({ success: true, user: sanitizeUser(user), checkedIn });
  });

  app.post('/api/attendance/request', (req: AuthedRequest, res) => {
    const r = { id: `ar${Date.now()}`, userId: req.userId!, type: req.body.type, date: req.body.date, hours: req.body.hours, reason: req.body.reason, location: req.body.location, time: req.body.time, status: 'Pending', createdAt: new Date().toISOString() };
    db().attendanceRequests.push(r);
    pushNotification(req.userId!, 'Attendance request submitted', `Your ${req.body.type} request is pending review.`);
    saveDb();
    res.json({ success: true, request: r });
  });

  app.get('/api/attendance/requests', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const list = (u?.role === 'manager' || u?.role === 'admin') ? db().attendanceRequests : db().attendanceRequests.filter(r => r.userId === req.userId);
    res.json(list.map(r => ({ ...r, employee: sanitizeUser(getUserById(r.userId)!) })));
  });

  app.get('/api/attendance/summary', (req: AuthedRequest, res) => res.json(weeklySummary(req.userId!)));

  app.get('/api/attendance/logs', requireRole('manager', 'admin'), (_req, res) => res.json(db().attendanceLogs.map(formatLog).reverse()));
  app.get('/api/attendance/logs/:userId', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    if (req.params.userId !== req.userId && u?.role !== 'manager' && u?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(db().attendanceLogs.filter(l => l.userId === req.params.userId).map(formatLog).reverse());
  });

  // Recruit
  app.get('/api/recruit/candidates', (_req, res) => res.json(db().candidates));
  app.post('/api/recruit/candidates', requireRole('manager', 'admin'), (req, res) => {
    const c = { id: `c${Date.now()}`, name: req.body.name, role: req.body.role, stage: 'Applied' };
    db().candidates.push(c); saveDb();
    res.json({ success: true, candidate: c });
  });
  app.patch('/api/recruit/candidates/:id', requireRole('manager', 'admin'), (req, res) => {
    const c = db().candidates.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (req.body.stage) c.stage = req.body.stage;
    saveDb();
    res.json({ success: true, candidate: c });
  });

  // Payroll
  app.get('/api/payroll', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const uid = (u?.role === 'manager' || u?.role === 'admin') && req.query.all ? undefined : req.userId;
    res.json(uid ? db().payrollRecords.filter(p => p.userId === uid) : db().payrollRecords);
  });
  app.post('/api/payroll/run', requireRole('manager', 'admin'), (_req, res) => {
    const period = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const salaryByRole: Record<string, number> = { employee: 7500, manager: 10500, admin: 12000 };
    db().users.filter(u => u.status !== 'Inactive').forEach(u => {
      const gross = salaryByRole[u.role] || 7500;
      const deductions = Math.round(gross * 0.15);
      db().payrollRecords.unshift({ id: `pr${Date.now()}_${u.id}`, userId: u.id, period, grossPay: gross, deductions, netPay: gross - deductions, status: 'Paid' });
      pushNotification(u.id, 'Payroll processed', `Your ${period} payslip is ready.`);
    });
    saveDb();
    res.json({ success: true, message: `Payroll run for ${period}` });
  });

  // Projects
  app.get('/api/projects', (_req, res) => res.json(db().projects));

  // Learning
  app.get('/api/learning/courses', (_req, res) => res.json(db().courses));
  app.post('/api/learning/enroll/:id', (req: AuthedRequest, res) => {
    const c = db().courses.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (!c.enrolled.includes(req.userId!)) c.enrolled.push(req.userId!);
    saveDb();
    res.json({ success: true });
  });

  // Surveys
  app.get('/api/surveys', (_req, res) => res.json(db().surveys));
  app.post('/api/surveys/:id/respond', (req: AuthedRequest, res) => {
    const s = db().surveys.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (!s.responses.includes(req.userId!)) s.responses.push(req.userId!);
    saveDb();
    res.json({ success: true });
  });

  // Field
  app.get('/api/field/agents', (_req, res) => res.json({ agents: db().fieldAgents, count: db().fieldAgents.filter(a => a.status === 'Active').length }));

  // Finance
  app.get('/api/finance/summary', (_req, res) => {
    const payroll = db().payrollRecords.reduce((s, p) => s + p.netPay, 0);
    const approvedExpenses = db().expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);
    res.json({
      monthlyPayroll: payroll,
      softwareExpenses: approvedExpenses,
      pendingReimbursements: db().expenses.filter(e => e.status === 'Pending').length,
      expenses: db().expenses,
    });
  });

  // Help desk
  app.get('/api/helpdesk/tickets', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const list = (u?.role === 'manager' || u?.role === 'admin') ? db().tickets : db().tickets.filter(t => t.userId === req.userId);
    const stats = { total: db().tickets.length, open: db().tickets.filter(t => t.status === 'Open').length, inProgress: db().tickets.filter(t => t.status === 'In Progress').length, resolved: db().tickets.filter(t => t.status === 'Resolved').length };
    res.json({ tickets: list, stats });
  });
  app.post('/api/helpdesk/tickets', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const t = { id: `TKT-${Date.now()}`, title: req.body.title, category: req.body.category, priority: req.body.priority || 'Medium', status: 'Open', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), userId: req.userId!, user: u?.name || 'Unknown', description: req.body.description };
    db().tickets.unshift(t);
    pushNotification(req.userId!, 'Ticket created', `"${t.title}" has been submitted.`);
    saveDb();
    res.json({ success: true, ticket: t });
  });
  app.patch('/api/helpdesk/tickets/:id', requireRole('manager', 'admin'), (req, res) => {
    const t = db().tickets.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (req.body.status) t.status = req.body.status;
    saveDb();
    res.json({ success: true, ticket: t });
  });

  // Community
  app.get('/api/community', (_req, res) => res.json({ posts: db().communityPosts, events: db().events, polls: db().polls }));
  app.post('/api/community/posts', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const p = { id: `cp${Date.now()}`, userId: req.userId!, author: u?.name || 'User', type: 'post', title: '', content: req.body.content, likes: 0, comments: 0, createdAt: new Date().toISOString() };
    db().communityPosts.unshift(p); saveDb();
    res.json({ success: true, post: p });
  });
  app.post('/api/community/posts/:id/like', (req: AuthedRequest, res) => {
    const p = db().communityPosts.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    p.likes++; saveDb();
    res.json({ success: true, likes: p.likes });
  });
  app.post('/api/community/polls/:id/vote', (req: AuthedRequest, res) => {
    const poll = db().polls.find(x => x.id === req.params.id);
    if (!poll) return res.status(404).json({ error: 'Not found' });
    const opt = poll.options.find(o => o.label === req.body.option);
    if (opt) opt.votes++;
    saveDb();
    res.json({ success: true, poll });
  });

  // Reports
  app.get('/api/reports/:type', (req: AuthedRequest, res) => {
    const type = req.params.type;
    let data: unknown = {};
    if (type === 'attendance') data = { logs: db().attendanceLogs.length, activeToday: db().users.filter(u => u.status === 'Active').length, chart: db().attendanceLogs.slice(-30) };
    else if (type === 'leave') data = { requests: db().leaveRequests, approved: db().leaveRequests.filter(l => l.status === 'Approved').length, pending: db().leaveRequests.filter(l => l.status === 'Pending').length };
    else if (type === 'performance') data = { goals: db().performanceGoals, reviews: db().performanceReviews, avgRating: 4.2 };
    else if (type === 'attrition') data = { headcount: db().users.length, onLeave: db().users.filter(u => u.status === 'On Leave').length, departures: 2 };
    else data = { message: 'Custom report generated', modules: Object.keys(db().rolePermissions) };
    res.json({ type, generatedAt: new Date().toISOString(), data });
  });

  // Performance
  app.get('/api/performance', (req: AuthedRequest, res) => {
    const uid = req.query.userId as string || req.userId!;
    const completedTasks = db().tasks.filter(t => t.status === 'completed' && (t.claimedById === uid || t.ownerId === uid));
    const logs = db().attendanceLogs.filter(l => l.userId === uid && l.clockOut);
    const avgHours = logs.length ? Math.round(logs.reduce((s, l) => s + (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000, 0) / logs.length * 10) / 10 : 0;
    const qualityScore = Math.min(100, Math.round(70 + completedTasks.length * 2 + (db().performanceReviews.filter(r => r.userId === uid).reduce((s, r) => s + (r.rating || 0), 0) / Math.max(1, db().performanceReviews.filter(r => r.userId === uid).length)) * 5));
    res.json({
      goals: db().performanceGoals.filter(g => g.userId === uid),
      reviews: db().performanceReviews.filter(r => r.userId === uid),
      skills: db().skills.filter(s => s.userId === uid),
      productivity: { tasksCompleted: completedTasks.length, avgHours, qualityScore },
      teamStats: (getUserById(req.userId!)?.role === 'manager' || getUserById(req.userId!)?.role === 'admin') ? { directReports: db().users.filter(u => u.managerId === req.userId || (u.department === getUserById(req.userId!)?.department && u.role === 'employee')).length, pendingReviews: db().tasks.filter(t => t.status === 'under_review').length } : null,
    });
  });
  app.post('/api/performance/reviews', requireRole('manager', 'admin'), (req, res) => {
    const r = { id: `rv${Date.now()}`, userId: req.body.userId, reviewerId: (req as AuthedRequest).userId!, rating: req.body.rating, feedback: req.body.feedback, period: req.body.period || 'Current', status: 'Completed' };
    db().performanceReviews.unshift(r);
    pushNotification(req.body.userId, 'Performance review', 'A new performance review has been submitted.');
    saveDb();
    res.json({ success: true, review: r });
  });
  app.post('/api/performance/goals', (req: AuthedRequest, res) => {
    const g = { id: `g${Date.now()}`, userId: req.userId!, title: req.body.title, progress: 0, target: 100, quarter: req.body.quarter || 'Q3 2026' };
    db().performanceGoals.push(g); saveDb();
    res.json({ success: true, goal: g });
  });

  // Chat
  app.get('/api/chat/conversations', (req: AuthedRequest, res) => {
    const msgs = db().chatMessages.filter(m => m.fromId === req.userId || m.toId === req.userId);
    const partnerIds = [...new Set(msgs.map(m => m.fromId === req.userId ? m.toId : m.fromId))];
    res.json(partnerIds.map(id => {
      const u = getUserById(id);
      const last = msgs.filter(m => (m.fromId === id && m.toId === req.userId) || (m.fromId === req.userId && m.toId === id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return { userId: id, name: u?.name, lastMessage: last?.content, lastAt: last?.createdAt };
    }));
  });
  app.get('/api/chat/:userId/messages', (req: AuthedRequest, res) => {
    const msgs = db().chatMessages.filter(m => (m.fromId === req.userId && m.toId === req.params.userId) || (m.fromId === req.params.userId && m.toId === req.userId)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(msgs);
  });
  app.post('/api/chat/:userId/messages', (req: AuthedRequest, res) => {
    const m = { id: `cm${Date.now()}`, fromId: req.userId!, toId: req.params.userId, content: req.body.content, createdAt: new Date().toISOString() };
    db().chatMessages.push(m);
    pushNotification(req.params.userId, 'New message', `${getUserById(req.userId!)?.name}: ${req.body.content.slice(0, 50)}`);
    saveDb();
    res.json({ success: true, message: m });
  });

  // AI
  app.post('/api/ai/chat', async (req: AuthedRequest, res) => {
    const { message } = req.body;
    const uid = req.userId!;
    if (!db().aiMessages[uid]) db().aiMessages[uid] = [];
    db().aiMessages[uid].push({ id: `ai${Date.now()}`, role: 'user', content: message, createdAt: new Date().toISOString() });

    let reply = '';
    const lower = message.toLowerCase();
    const user = getUserById(uid);
    const bal = db().leaveRequests.filter(l => l.userId === uid && l.status === 'Approved').reduce((s, l) => s + l.days, 0);

    if (lower.includes('leave')) reply = `You have used ${bal} approved leave days. ${db().leaveRequests.filter(l => l.userId === uid && l.status === 'Pending').length} request(s) pending. Annual allowance: ${db().orgSettings.defaultLeaveDays} days.`;
    else if (lower.includes('payroll') || lower.includes('salary')) reply = `Your latest payslip shows net pay of $7,250. ${db().payrollRecords.filter(p => p.userId === uid).length} records on file.`;
    else if (lower.includes('point') || lower.includes('reward')) reply = `You have ${user?.points || 0} Kaala Points. Rank #${[...db().users].sort((a, b) => b.points - a.points).findIndex(u => u.id === uid) + 1} in the organization.`;
    else if (lower.includes('attendance')) reply = user?.status === 'Active' ? 'You are currently checked in and marked Active.' : 'You are currently off duty. Use Attendance to check in.';
    else {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const key = process.env.GEMINI_API_KEY;
        if (key && key !== 'MY_GEMINI_API_KEY') {
          const ai = new GoogleGenAI({ apiKey: key });
          const resp = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: `You are Kaala HRMS assistant for ${user?.name}. Answer briefly about HR topics: ${message}` });
          reply = resp.text || 'I could not generate a response.';
        } else {
          reply = `I'm Kaala AI, your HR assistant. I can help with leave (${db().orgSettings.defaultLeaveDays - bal} days remaining), payroll, attendance, and rewards (${user?.points} KP). How can I help?`;
        }
      } catch {
        reply = `I'm Kaala AI. You have ${user?.points} KP and ${db().orgSettings.defaultLeaveDays - bal} leave days available. Ask me about leave, payroll, attendance, or rewards.`;
      }
    }

    db().aiMessages[uid].push({ id: `ai${Date.now() + 1}`, role: 'assistant', content: reply, createdAt: new Date().toISOString() });
    saveDb();
    res.json({ reply, history: db().aiMessages[uid] });
  });

  app.get('/api/ai/history', (req: AuthedRequest, res) => {
    res.json(db().aiMessages[req.userId!] || []);
  });

  registerExtraRoutes(app);
}