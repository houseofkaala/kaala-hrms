import { Express } from 'express';
import { getDb, saveDb, sanitizeUser, getUserById, pushNotification } from './db';
import { AuthedRequest, requireRole } from './middleware';
import { deleteSessionsForUser } from './sessions';
import { hashPassword } from './password';
import { assertValidRoleChange } from './security';
import { portalForRole } from './portal-config';
import { deleteDocumentFile } from './document-storage';
import { logSecurityEvent, requestContext } from './security-audit';

export function registerExtraRoutes(app: Express) {
  const db = () => getDb();

  // Attendance request approval
  app.patch('/api/attendance/requests/:id', requireRole('manager', 'admin'), (req, res) => {
    const r = db().attendanceRequests.find(x => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });

    const status = String(req.body.status || r.status);
    const allowed = new Set(['Approved', 'Rejected', 'Pending']);
    if (!allowed.has(status)) return res.status(400).json({ error: 'Invalid status' });
    r.status = status;

    if (r.type === 'early_clock_out' && r.status === 'Approved') {
      const logId = (r as { attendanceLogId?: string }).attendanceLogId;
      const log = logId
        ? db().attendanceLogs.find(l => l.id === logId)
        : db().attendanceLogs.find(l => l.userId === r.userId && !l.clockOut);
      if (log) log.earlyClockOutApproved = true;
    }

    if (r.status === 'Approved' && r.type === 'regularization' && r.date && r.time) {
      const clockIn = new Date(`${r.date}T${r.time}`);
      const hours = parseFloat(r.hours || '8') || 8;
      const clockOut = new Date(clockIn.getTime() + hours * 3600000);
      db().attendanceLogs.push({
        id: `att_reg_${Date.now()}`,
        userId: r.userId,
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        date: r.date,
        earlyClockOutApproved: true,
        source: 'regularization',
      } as never);
    }

    pushNotification(r.userId, `Attendance ${r.status.toLowerCase()}`, `Your ${r.type.replace(/_/g, ' ')} request has been ${r.status.toLowerCase()}.`, { triggerId: 'attendance.regularization_decided' });
    saveDb();
    res.json({ success: true, request: r });
  });

  app.get('/api/attendance/ot-summary', (req: AuthedRequest, res) => {
    const uid = req.userId!;
    const ot = db().attendanceRequests.filter(r => r.userId === uid && r.type === 'overtime');
    const approved = ot.filter(r => r.status === 'Approved').reduce((s, r) => s + parseFloat(r.hours || '0'), 0);
    const pending = ot.filter(r => r.status === 'Pending').reduce((s, r) => s + parseFloat(r.hours || '0'), 0);
    res.json({ approvedHours: approved, pendingHours: pending });
  });

  // Employee CRUD
  app.patch('/api/employees/:id', requireRole('admin'), (req, res) => {
    const u = getUserById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const { name, department, role, title, status, phone, managerId, emergencyContact, employmentType } = req.body;
    if (name) u.name = name;
    if (department) u.department = department;
    if (role) {
      if (!assertValidRoleChange(u, String(role), res)) return;
      u.role = role;
    }
    if (title) u.title = title;
    if (status) {
      u.status = status;
      if (status === 'Inactive') deleteSessionsForUser(u.id);
    }
    if (phone) u.phone = phone;
    if (managerId !== undefined) u.managerId = managerId;
    if (emergencyContact) u.emergencyContact = emergencyContact;
    if (employmentType) u.employmentType = employmentType;
    saveDb();
    res.json({ success: true, employee: sanitizeUser(u) });
  });

  app.delete('/api/employees/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const u = getUserById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (u.id === req.userId) return res.status(400).json({ error: 'Cannot deactivate your own account' });
    if (u.role === 'admin' && db().users.filter(x => x.role === 'admin' && x.status === 'Active').length <= 1) {
      return res.status(400).json({ error: 'Cannot deactivate the last active admin' });
    }
    u.status = 'Inactive';
    deleteSessionsForUser(u.id);
    const templates = [
      { title: 'Exit interview scheduled', category: 'HR', days: 3 },
      { title: 'Return company laptop & assets', category: 'IT', days: 1 },
      { title: 'Revoke system access', category: 'IT', days: 0 },
      { title: 'Full & final settlement', category: 'Finance', days: 15 },
      { title: 'Experience letter issued', category: 'HR', days: 10 },
    ];
    const offTasks = (db() as ReturnType<typeof getDb> & { offboardingTasks?: { id: string; userId: string; title: string; description: string; status: string; dueDate: string; category: string }[] }).offboardingTasks;
    if (offTasks) {
      for (const t of templates) {
        offTasks.push({
          id: `off${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: u.id,
          title: t.title,
          description: `Offboarding for ${u.name}`,
          status: 'Pending',
          dueDate: new Date(Date.now() + t.days * 86400000).toISOString().split('T')[0],
          category: t.category,
        });
      }
    }
    saveDb();
    res.json({ success: true });
  });

  app.post('/api/employees/:id/reset-password', requireRole('admin'), (req: AuthedRequest, res) => {
    const u = getUserById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const { password } = req.body;
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    u.password = hashPassword(String(password));
    deleteSessionsForUser(u.id);
    logSecurityEvent('admin_password_reset', {
      userId: u.id,
      actorId: req.userId,
      ...requestContext(req),
      detail: u.email,
    });
    saveDb();
    pushNotification(u.id, 'Password updated', 'Your login password was reset by an administrator.', { triggerId: 'security.password_changed' });
    const baseDomain = process.env.VITE_BASE_DOMAIN || 'bymarketingonly.com';
    const portal = portalForRole(u.role);
    res.json({
      success: true,
      email: u.email,
      loginUrl: `https://${portal}.${baseDomain}/login`,
      message: 'Password reset. Employee has been notified — deliver the new password securely.',
    });
  });

  // Expenses
  app.get('/api/expenses', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const list = (u?.role === 'manager' || u?.role === 'admin') && req.query.all
      ? db().expenses
      : db().expenses.filter(e => e.userId === req.userId);
    res.json(list.map(e => ({ ...e, employee: sanitizeUser(getUserById(e.userId)!) })));
  });

  app.post('/api/expenses', (req: AuthedRequest, res) => {
    const e = { id: `ex${Date.now()}`, userId: req.userId!, title: req.body.title, amount: Number(req.body.amount), status: 'Pending', date: req.body.date || new Date().toISOString().split('T')[0], category: req.body.category || 'General' };
    db().expenses.unshift(e);
    pushNotification(req.userId!, 'Expense submitted', `"${e.title}" (₹${e.amount}) is pending approval.`, { triggerId: 'expenses.submitted' });
    saveDb();
    res.json({ success: true, expense: e });
  });

  app.patch('/api/expenses/:id', requireRole('manager', 'admin'), (req, res) => {
    const e = db().expenses.find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    e.status = req.body.status;
    const expStatus = String(req.body.status);
    const expTrigger = expStatus === 'Approved' ? 'expenses.approved' : expStatus === 'Rejected' ? 'expenses.rejected' : 'expenses.reimbursed';
    pushNotification(e.userId, `Expense ${expStatus.toLowerCase()}`, `Your expense "${e.title}" has been ${expStatus.toLowerCase()}.`, { triggerId: expTrigger });
    saveDb();
    res.json({ success: true, expense: e });
  });

  // Holidays
  app.get('/api/holidays', (_req, res) => res.json(db().holidays));

  app.post('/api/holidays', requireRole('admin'), (req, res) => {
    const h = { id: `h${Date.now()}`, name: req.body.name, date: req.body.date, type: req.body.type || 'Company' };
    db().holidays.push(h);
    saveDb();
    res.json({ success: true, holiday: h });
  });

  // Shifts
  app.get('/api/shifts', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const list = (u?.role === 'manager' || u?.role === 'admin') ? db().shifts : db().shifts.filter(s => s.userId === req.userId);
    res.json(list.map(s => ({ ...s, employee: sanitizeUser(getUserById(s.userId)!) })));
  });

  app.post('/api/shifts', (req: AuthedRequest, res) => {
    const s = { id: `sh${Date.now()}`, userId: req.userId!, shiftType: req.body.shiftType, date: req.body.date, status: 'Pending', reason: req.body.reason || '' };
    db().shifts.push(s);
    pushNotification(req.userId!, 'Shift request submitted', `Your shift change for ${s.date} is pending.`);
    saveDb();
    res.json({ success: true, shift: s });
  });

  app.patch('/api/shifts/:id', requireRole('manager', 'admin'), (req, res) => {
    const s = db().shifts.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    s.status = req.body.status;
    pushNotification(s.userId, `Shift ${req.body.status.toLowerCase()}`, `Your shift request has been ${req.body.status.toLowerCase()}.`);
    saveDb();
    res.json({ success: true, shift: s });
  });

  // Policies — map title → name for frontend compatibility
  app.get('/api/policies', (_req, res) => {
    res.json(db().policies.map(p => {
      const pol = p as { id: string; title: string; description: string; category: string; status: string; requiresAck?: boolean };
      return { ...pol, name: pol.title };
    }));
  });

  // Onboarding
  app.get('/api/onboarding', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const uid = (req.query.userId as string) || req.userId!;
    if (uid !== req.userId && u?.role !== 'manager' && u?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(db().onboardingTasks.filter(t => t.userId === uid));
  });

  app.post('/api/onboarding', requireRole('manager', 'admin'), (req, res) => {
    const t = { id: `ob${Date.now()}`, userId: req.body.userId, title: req.body.title, description: req.body.description || '', status: 'Pending', dueDate: req.body.dueDate, category: req.body.category || 'HR' };
    db().onboardingTasks.push(t);
    pushNotification(req.body.userId, 'Onboarding task assigned', t.title, { triggerId: 'training.course_assigned' });
    saveDb();
    res.json({ success: true, task: t });
  });

  app.patch('/api/onboarding/:id', (req: AuthedRequest, res) => {
    const t = db().onboardingTasks.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (t.userId !== req.userId && u?.role !== 'manager' && u?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    if (req.body.status) t.status = req.body.status;
    saveDb();
    res.json({ success: true, task: t });
  });

  // Timesheets
  app.get('/api/timesheets', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const list = (u?.role === 'manager' || u?.role === 'admin') && req.query.all
      ? db().timesheets
      : db().timesheets.filter(t => t.userId === req.userId);
    res.json(list.map(t => ({ ...t, employee: sanitizeUser(getUserById(t.userId)!) })));
  });

  app.post('/api/timesheets', (req: AuthedRequest, res) => {
    const project = db().projects.find(p => p.id === req.body.projectId);
    const t = { id: `ts${Date.now()}`, userId: req.userId!, projectId: req.body.projectId, projectName: project?.name || req.body.projectName || 'General', date: req.body.date, hours: Number(req.body.hours), description: req.body.description || '', status: 'Pending' };
    db().timesheets.unshift(t);
    saveDb();
    res.json({ success: true, timesheet: t });
  });

  app.patch('/api/timesheets/:id', requireRole('manager', 'admin'), (req, res) => {
    const t = db().timesheets.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    t.status = req.body.status;
    pushNotification(t.userId, `Timesheet ${req.body.status.toLowerCase()}`, `Your timesheet for ${t.date} has been ${req.body.status.toLowerCase()}.`);
    saveDb();
    res.json({ success: true, timesheet: t });
  });

  // Org chart
  app.get('/api/org-chart', (_req, res) => {
    const nodes = db().users.filter(u => u.status !== 'Inactive').map(u => ({
      id: u.id, name: u.name, title: u.title, department: u.department, role: u.role,
      managerId: u.managerId, status: u.status,
    }));
    res.json({ nodes });
  });

  // Biometric devices
  app.get('/api/biometric-devices', requireRole('manager', 'admin'), (_req, res) => res.json(db().biometricDevices));

  app.post('/api/biometric-devices', requireRole('admin'), (req, res) => {
    const d = { id: `bio${Date.now()}`, name: req.body.name, location: req.body.location, status: 'Online', lastSync: new Date().toISOString() };
    db().biometricDevices.push(d);
    saveDb();
    res.json({ success: true, device: d });
  });

  // Documents delete
  app.delete('/api/documents/:id', (req: AuthedRequest, res) => {
    const me = getUserById(req.userId!);
    const idx = db().documents.findIndex(d => {
      if (d.id !== req.params.id) return false;
      return d.userId === req.userId || me?.role === 'manager' || me?.role === 'admin';
    });
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const [removed] = db().documents.splice(idx, 1);
    deleteDocumentFile(removed.storageKey);
    saveDb();
    res.json({ success: true });
  });

  // Payslip
  app.get('/api/payroll/:id/payslip', (req: AuthedRequest, res) => {
    const pr = db().payrollRecords.find(p => p.id === req.params.id);
    if (!pr) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (pr.userId !== req.userId && u?.role !== 'manager' && u?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const emp = getUserById(pr.userId);
    res.json({ ...pr, employee: emp ? { name: emp.name, email: emp.email, department: emp.department, title: emp.title } : null, company: db().orgSettings.companyName });
  });

  // Learning progress
  app.post('/api/learning/complete/:id', (req: AuthedRequest, res) => {
    const c = db().courses.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (!db().courseProgress[req.userId!]) db().courseProgress[req.userId!] = {};
    db().courseProgress[req.userId!][c.id] = 100;
    if (!c.enrolled.includes(req.userId!)) c.enrolled.push(req.userId!);
    saveDb();
    res.json({ success: true });
  });

  app.get('/api/learning/progress', (req: AuthedRequest, res) => {
    res.json(db().courseProgress[req.userId!] || {});
  });

  // Role permissions update
  const KNOWN_MODULES = new Set([
    'dashboard', 'people', 'attendance', 'leave', 'documents', 'assets', 'performance', 'learning',
    'surveys', 'community', 'helpdesk', 'marketplace', 'rewards', 'leaderboard', 'chat', 'ai',
    'profile', 'notifications', 'expenses', 'timesheets', 'onboarding', 'offboarding', 'holidays',
    'policies', 'orgchart', 'projects', 'tasks', 'settings', 'benefits', 'tax', 'recruit',
    'employees', 'payroll', 'finance', 'reports', 'roles', 'crm', 'field', 'security', '*',
  ]);

  app.patch('/api/roles', requireRole('admin'), (req, res) => {
    const { role, modules } = req.body;
    const perms = db().rolePermissions as Record<string, { modules: string[]; description: string }>;
    if (!role || !perms[role]) return res.status(400).json({ error: 'Invalid role' });
    if (!Array.isArray(modules)) return res.status(400).json({ error: 'modules must be an array' });
    const cleaned = modules.map(String).filter(m => KNOWN_MODULES.has(m));
    if (cleaned.length === 0) return res.status(400).json({ error: 'At least one valid module is required' });
    if (role === 'admin' && !cleaned.includes('*') && !cleaned.includes('settings')) {
      return res.status(400).json({ error: 'Admin role must include settings or *' });
    }
    perms[role].modules = cleaned;
    saveDb();
    res.json({ success: true, permissions: db().rolePermissions });
  });

  // Recruit hire -> create onboarding
  app.post('/api/recruit/candidates/:id/hire', requireRole('manager', 'admin'), (req, res) => {
    const c = db().candidates.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    c.stage = 'Hired';
    const tasks = [
      { title: 'Sign employment contract', category: 'HR', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
      { title: 'Complete IT setup', category: 'IT', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] },
      { title: 'Security training', category: 'Learning', dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] },
    ];
    tasks.forEach(t => {
      db().onboardingTasks.push({ id: `ob${Date.now()}_${Math.random()}`, userId: req.body.userId || 'pending', title: t.title, description: `Onboarding for ${c.name}`, status: 'Pending', dueDate: t.dueDate, category: t.category });
    });
    saveDb();
    res.json({ success: true, candidate: c });
  });

  // Community events
  app.post('/api/community/events', requireRole('manager', 'admin'), (req, res) => {
    const e = { id: `ev${Date.now()}`, title: req.body.title, date: req.body.date, time: req.body.time, location: req.body.location };
    db().events.push(e);
    saveDb();
    res.json({ success: true, event: e });
  });

  // Performance goal progress update
  app.patch('/api/performance/goals/:id', (req: AuthedRequest, res) => {
    const g = db().performanceGoals.find(x => x.id === req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    if (g.userId !== req.userId) {
      const u = getUserById(req.userId!);
      if (u?.role !== 'manager' && u?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.body.progress !== undefined) g.progress = req.body.progress;
    if (req.body.title) g.title = req.body.title;
    saveDb();
    res.json({ success: true, goal: g });
  });
}