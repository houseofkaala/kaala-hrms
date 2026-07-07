import { Express } from 'express';
import {
  initDb, saveDb, getDb, sanitizeUser, getUserById, pushNotification, addTransaction, getStorageBackend, UserRecord,
} from './db';
import { AuthedRequest, authMiddleware, requireRole, createSession, deleteSession, moduleAccessMiddleware } from './middleware';
import { checkLoginRateLimit, clearLoginRateLimit } from './rate-limit';
import { getAllowedModules, assertValidRoleChange } from './security';
import { saveDocumentFile, getDocumentFilePath, deleteDocumentFile, mimeFromFilename } from './document-storage';
import { registerExtraRoutes } from './extra-routes';
import { registerProjectRoutes } from './project-routes';
import { provisionNewEmployee, portalLoginPath } from './employee-onboard';
import { EMAIL_TRIGGERS, TRIGGER_CATEGORIES, mergeEmailSettings } from './notifications/registry';
import { isEmailConfigured, sendEmail } from './email/transport';
import { notify, notifyManager } from './notifications/dispatcher';
import { attendanceStatusPayload, evaluateClockOut, MIN_CLOCK_OUT_HOURS, FULL_DAY_HOURS } from './attendance-rules';
import { verifyPassword, hashPassword, upgradePasswordIfNeeded } from './password';
import {
  activeUsers, assertManager, assertSelfOrManager, canAccessTask, canAccessKanbanTask,
  directoryUser, isManagerOrAdmin,
} from './security';

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

export async function registerRoutes(app: Express) {
  await initDb();
  const db = () => getDb();

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const clientIp = String(req.ip || req.socket.remoteAddress || 'unknown');
    const rate = checkLoginRateLimit(clientIp, email);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Too many login attempts. Try again in ${rate.retryAfterSec} seconds.`,
      });
    }
    const user = db().users.find(u => u.email?.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    clearLoginRateLimit(clientIp, email);
    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'Account is inactive. Contact HR.' });
    }
    if (upgradePasswordIfNeeded(user, password)) saveDb();

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
    res.json({ token, user: { ...sanitizeUser(user), allowedModules: getAllowedModules(user.role) } });
  });

  app.post('/api/auth/logout', authMiddleware, (req: AuthedRequest, res) => {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) deleteSession(h.slice(7));
    res.json({ success: true });
  });

  app.get('/api/health', (_req, res) => {
    const storage = getStorageBackend();
    res.json({
      status: 'ok',
      database: storage === 'postgres' ? 'postgres' : 'file',
      persistent: storage === 'postgres',
      uptime: process.uptime(),
    });
  });

  app.use('/api', authMiddleware);
  app.use('/api', moduleAccessMiddleware);

  app.get('/api/me', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...sanitizeUser(user), allowedModules: getAllowedModules(user.role) });
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

  app.get('/api/users', (req: AuthedRequest, res) => {
    const me = getUserById(req.userId!);
    const list = activeUsers();
    if (isManagerOrAdmin(me)) {
      return res.json(list.map(sanitizeUser));
    }
    res.json(list.map(directoryUser));
  });

  app.get('/api/users/:id', (req: AuthedRequest, res) => {
    if (!assertSelfOrManager(req, res, req.params.id)) return;
    const user = getUserById(req.params.id);
    if (!user || user.status === 'Inactive') return res.status(404).json({ error: 'Not found' });
    const me = getUserById(req.userId!);
    if (isManagerOrAdmin(me)) {
      return res.json({ ...sanitizeUser(user), employmentType: user.employmentType, emergencyContact: user.emergencyContact });
    }
    res.json(directoryUser(user));
  });

  app.get('/api/employees', requireRole('manager', 'admin'), (req, res) => {
    const roleFilter = typeof req.query.role === 'string' ? req.query.role : null;
    let users = db().users.filter(u => u.status === 'Active' || u.status === undefined);
    if (roleFilter) users = users.filter(u => u.role === roleFilter);
    res.json(users.map(u => ({ ...sanitizeUser(u), employeeCode: `EMP-${u.id.toUpperCase()}`, designation: u.title })));
  });

  app.post('/api/employees', requireRole('manager', 'admin'), (req, res) => {
    const {
      name, email, department, role, title, password, phone,
      joinDate, employmentType, emergencyContact, address, managerId,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Full name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (db().users.some(u => u.email?.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userRole = (['employee', 'manager', 'admin'].includes(role) ? role : 'employee') as UserRecord['role'];
    const resolvedManager =
      managerId ||
      (userRole === 'employee'
        ? db().users.find(u => u.role === 'manager' && u.status === 'Active')?.id
        : userRole === 'manager'
          ? db().users.find(u => u.role === 'admin' && u.status === 'Active')?.id
          : null) ||
      null;

    const newUser: UserRecord = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      department: department || 'General',
      role: userRole,
      title: title?.trim() || 'Employee',
      password: hashPassword(String(password)),
      points: 1000,
      status: 'Active',
      phone: phone?.trim() || '',
      projects: [],
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      employmentType: employmentType || 'Full-Time',
      emergencyContact: emergencyContact?.trim() || '',
      address: address?.trim() || '',
      managerId: resolvedManager,
      preferences: { emailNotifications: true, timezone: 'Asia/Kolkata' },
    };

    const database = db();
    database.users.push(newUser);
    provisionNewEmployee(database, newUser);
    saveDb();

    const baseDomain = process.env.VITE_BASE_DOMAIN || 'bymarketingonly.com';
    const portalSubdomain = portalLoginPath(userRole);

    const loginUrl = `https://${portalSubdomain}.${baseDomain}/login`;
    void notify({
      triggerId: 'lifecycle.welcome',
      userId: newUser.id,
      title: 'Welcome to House of Kaala',
      message: `Your account is ready.\n\nSign in at: ${loginUrl}\nEmail: ${normalizedEmail}\nTemporary password: ${String(password)}\n\nPlease change your password after first login.`,
      emailContext: {
        name: newUser.name,
        email: normalizedEmail,
        loginUrl,
        password: String(password),
      },
    });
    res.status(201).json({
      success: true,
      employee: sanitizeUser(newUser),
      access: {
        email: normalizedEmail,
        portal: portalSubdomain,
        loginUrl,
        role: userRole,
        message: `${newUser.name} can sign in now at the ${userRole === 'employee' ? 'Employee' : 'Admin'} portal.`,
      },
    });
  });

  app.patch('/api/me/password', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Current password and new password (8+ chars) required' });
    }
    if (!verifyPassword(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    user.password = hashPassword(String(newPassword));
    saveDb();
    res.json({ success: true });
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
    const employee = getUserById(req.userId!);
    void notifyManager(req.userId!, {
      triggerId: 'leave.submitted_manager',
      title: 'Leave request submitted',
      message: `${employee?.name} requested ${type} leave (${days} days) from ${startDate} to ${endDate}.`,
    });
    saveDb();
    res.json({ success: true, request: r });
  });

  app.patch('/api/leave-requests/:id', requireRole('manager', 'admin'), (req, res) => {
    const r = db().leaveRequests.find(l => l.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    r.status = req.body.status;
    const status = String(req.body.status);
    const triggerId = status === 'Approved' ? 'leave.approved' : status === 'Rejected' ? 'leave.rejected' : 'leave.cancelled';
    pushNotification(r.userId, `Leave ${status.toLowerCase()}`, `Your ${r.type} request has been ${status.toLowerCase()}.`, { triggerId });
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
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Document name is required' });

    const docId = `doc${Date.now()}`;
    const doc: {
      id: string; userId: string; name: string; category: string;
      uploadedAt: string; size: string; storageKey?: string; mimeType?: string;
    } = {
      id: docId,
      userId: req.userId!,
      name,
      category: req.body.category || 'General',
      uploadedAt: new Date().toISOString().split('T')[0],
      size: req.body.size || '0 KB',
    };

    if (req.body.contentBase64) {
      try {
        const mimeType = req.body.mimeType || mimeFromFilename(name);
        const saved = saveDocumentFile(docId, String(req.body.contentBase64), mimeType);
        doc.storageKey = saved.storageKey;
        doc.mimeType = mimeType;
        doc.size = saved.size;
      } catch (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
      }
    }

    db().documents.unshift(doc);
    saveDb();
    res.json({ success: true, document: doc });
  });

  app.get('/api/documents/:id/file', (req: AuthedRequest, res) => {
    const doc = db().documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const me = getUserById(req.userId!);
    if (doc.userId !== req.userId && !isManagerOrAdmin(me)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!doc.storageKey) return res.status(404).json({ error: 'No file attached to this document' });
    const filePath = getDocumentFilePath(doc.storageKey);
    if (!filePath) return res.status(404).json({ error: 'File not found on server' });
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.sendFile(filePath);
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
  app.patch('/api/settings', requireRole('admin'), (req, res) => {
    const { emailNotifications, ...rest } = req.body;
    Object.assign(db().orgSettings, rest);
    if (emailNotifications) {
      db().orgSettings.emailNotifications = mergeEmailSettings({
        ...db().orgSettings.emailNotifications,
        ...emailNotifications,
        triggers: { ...db().orgSettings.emailNotifications?.triggers, ...emailNotifications.triggers },
        digests: { ...db().orgSettings.emailNotifications?.digests, ...emailNotifications.digests },
      });
    }
    saveDb();
    res.json({ success: true, settings: db().orgSettings });
  });

  app.get('/api/settings/email-triggers', requireRole('admin'), (_req, res) => {
    res.json({
      triggers: EMAIL_TRIGGERS,
      categories: TRIGGER_CATEGORIES,
      config: mergeEmailSettings(db().orgSettings.emailNotifications),
      smtpConfigured: isEmailConfigured(),
    });
  });

  app.post('/api/admin/email/test', requireRole('admin'), async (req: AuthedRequest, res) => {
    const admin = getUserById(req.userId!);
    if (!admin?.email) return res.status(400).json({ error: 'Admin email not found' });
    const settings = mergeEmailSettings(db().orgSettings.emailNotifications);
    const result = await sendEmail({
      to: req.body.email || admin.email,
      subject: 'HRMS email test',
      text: 'Email notifications are configured correctly for House of Kaala HRMS.',
    }, settings);
    if (!result.ok) return res.status(503).json({ error: result.error || 'Email send failed' });
    res.json({ success: true, message: `Test email sent to ${req.body.email || admin.email}` });
  });
  app.get('/api/roles', requireRole('admin'), (_req, res) => res.json(db().rolePermissions));
  app.get('/api/roles/users', requireRole('admin'), (_req, res) => res.json(db().users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, department: u.department }))));
  app.patch('/api/roles/users/:id', requireRole('admin'), (req, res) => {
    const u = getUserById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const newRole = String(req.body.role || '').trim();
    if (!newRole) return res.status(400).json({ error: 'Role is required' });
    if (!assertValidRoleChange(u, newRole, res)) return;
    u.role = newRole as UserRecord['role'];
    saveDb();
    res.json({ success: true, user: sanitizeUser(u) });
  });

  // Assets
  app.get('/api/assets', (req: AuthedRequest, res) => {
    const me = getUserById(req.userId!);
    if (isManagerOrAdmin(me)) return res.json(db().assets);
    res.json(db().assets.filter(a => a.userId === req.userId));
  });
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
    if (req.body.userId) {
      pushNotification(req.body.userId, 'Asset assigned', `${a.name} has been assigned to you.`, { triggerId: 'assets.assigned' });
    }
    saveDb();
    res.json({ success: true, asset: a });
  });

  // Marketplace tasks
  app.get('/api/tasks', (req: AuthedRequest, res) => {
    const me = getUserById(req.userId!);
    if (isManagerOrAdmin(me)) return res.json(db().tasks);
    res.json(db().tasks.filter(t =>
      t.ownerId === req.userId ||
      t.claimedById === req.userId ||
      t.status === 'marketplace',
    ));
  });
  app.post('/api/tasks', requireRole('manager', 'admin'), (req: AuthedRequest, res) => {
    const t = { id: `t${Date.now()}`, title: req.body.title, ownerId: req.userId!, status: 'pending', value: Number(req.body.value) || 10, deadline: req.body.deadline || new Date(Date.now() + 7 * 86400000).toISOString(), referenceLink: req.body.referenceLink, category: req.body.category, priority: req.body.priority || 'Normal' };
    db().tasks.push(t);
    if (req.body.assigneeId && req.body.assigneeId !== req.userId) {
      pushNotification(req.body.assigneeId, 'Task assigned', `You have been assigned: "${t.title}"`, { triggerId: 'tasks.assigned' });
    }
    saveDb();
    res.json({ success: true, task: t });
  });
  app.put('/api/tasks/:id', (req: AuthedRequest, res) => {
    const t = db().tasks.find(x => x.id === req.params.id);
    const me = getUserById(req.userId!);
    if (!t || !me || !canAccessTask(t, req.userId!, me.role) || (t.ownerId !== req.userId && !isManagerOrAdmin(me))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
    const me = getUserById(req.userId!);
    if (!t || !me) return res.status(404).json({ error: 'Not found' });
    if (!canAccessTask(t, req.userId!, me.role)) return res.status(403).json({ error: 'Forbidden' });
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
    const managers = db().users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.status !== 'Inactive');
    for (const m of managers) {
      pushNotification(m.id, 'Review required', `"${t.title}" is awaiting approval.`, { triggerId: 'tasks.review_required' });
    }
    res.json({ success: true, task: t });
  });
  app.post('/api/tasks/approve', requireRole('manager', 'admin'), (req, res) => {
    const t = db().tasks.find(x => x.id === req.body.taskId);
    if (!t || t.status !== 'under_review') return res.status(400).json({ error: 'Invalid' });
    t.status = 'completed';
    const c = getUserById(t.claimedById);
    if (c) { c.points += 10; addTransaction(c.id, 10, `Completed: "${t.title}"`); pushNotification(c.id, 'Task approved', `+10 KP for "${t.title}"`, { triggerId: 'tasks.approved' }); }
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
  app.get('/api/kanban', (req: AuthedRequest, res) => {
    const me = getUserById(req.userId!);
    if (isManagerOrAdmin(me)) return res.json(db().kanbanTasks);
    res.json(db().kanbanTasks.filter(t => !t.assigneeId || t.assigneeId === req.userId));
  });
  app.post('/api/kanban', requireRole('manager', 'admin'), (req: AuthedRequest, res) => {
    const assigneeId = req.body.assigneeId || req.userId!;
    const t = { id: `KT-${Date.now()}`, title: req.body.title, stage: 'todo', priority: req.body.priority || 'Normal', assigneeId };
    db().kanbanTasks.push(t); saveDb();
    res.json({ success: true, task: t });
  });
  app.patch('/api/kanban/:id', (req: AuthedRequest, res) => {
    const t = db().kanbanTasks.find(x => x.id === req.params.id);
    const me = getUserById(req.userId!);
    if (!t || !me) return res.status(404).json({ error: 'Not found' });
    if (!canAccessKanbanTask(t, req.userId!, me.role)) return res.status(403).json({ error: 'Forbidden' });
    if (req.body.stage) t.stage = req.body.stage;
    if (req.body.title) t.title = req.body.title;
    if (req.body.priority) t.priority = req.body.priority;
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
        if (o) { o.points -= 10; addTransaction(o.id, -10, `SLA Breach: "${t.title}"`); pushNotification(o.id, 'Task to marketplace', `"${t.title}" moved (-10 KP)`, { triggerId: 'tasks.marketplace' }); affected++; }
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
  app.get('/api/attendance/status', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const active = db().attendanceLogs.find(l => l.userId === req.userId && !l.clockOut);
    const checkedIn = Boolean(active) || user.status === 'Active';
    res.json(attendanceStatusPayload(active, checkedIn));
  });

  app.post('/api/attendance/toggle', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const active = db().attendanceLogs.find(l => l.userId === req.userId && !l.clockOut);
    let checkedIn = false;

    if (active) {
      const ev = evaluateClockOut(active);
      if (!ev.allowed) {
        return res.status(403).json({
          error: ev.message,
          code: ev.code,
          needsAdminApproval: ev.needsAdminApproval,
          hoursWorked: ev.hoursWorked,
          minHours: MIN_CLOCK_OUT_HOURS,
          fullDayHours: FULL_DAY_HOURS,
        });
      }
      active.clockOut = new Date().toISOString();
      user.status = 'Offline';
    } else {
      db().attendanceLogs.push({
        id: `att_${Date.now()}`,
        userId: req.userId!,
        clockIn: new Date().toISOString(),
        clockOut: null,
        date: new Date().toISOString().split('T')[0],
        earlyClockOutApproved: false,
      });
      user.status = 'Active';
      checkedIn = true;
    }
    saveDb();
    res.json({ success: true, user: sanitizeUser(user), checkedIn });
  });

  app.post('/api/attendance/request-early-clockout', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const active = db().attendanceLogs.find(l => l.userId === req.userId && !l.clockOut);
    if (!active) return res.status(400).json({ error: 'You are not clocked in.' });

    const ev = evaluateClockOut(active);
    if (ev.hoursWorked < MIN_CLOCK_OUT_HOURS) {
      return res.status(400).json({ error: `Minimum ${MIN_CLOCK_OUT_HOURS} hours must be completed before requesting early clock-out.` });
    }
    if (ev.hoursWorked >= FULL_DAY_HOURS) {
      return res.status(400).json({ error: 'You can clock out directly after a full work day.' });
    }
    if (active.earlyClockOutApproved) {
      return res.status(400).json({ error: 'Early clock-out is already approved.' });
    }

    const pending = db().attendanceRequests.find(
      r => r.userId === req.userId && r.type === 'early_clock_out' && r.status === 'Pending',
    );
    if (pending) return res.status(409).json({ error: 'You already have a pending early clock-out request.' });

    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Reason is required.' });

    const r = {
      id: `ar${Date.now()}`,
      userId: req.userId!,
      type: 'early_clock_out',
      date: new Date().toISOString().split('T')[0],
      hours: String(Math.round(ev.hoursWorked * 10) / 10),
      reason,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      attendanceLogId: active.id,
    };
    db().attendanceRequests.push(r);
    pushNotification(req.userId!, 'Early clock-out requested', 'Your request is pending admin approval.', { triggerId: 'attendance.regularization_submitted' });

    for (const a of db().users.filter(u => (u.role === 'admin' || u.role === 'manager') && u.status !== 'Inactive')) {
      pushNotification(a.id, 'Early clock-out request', `${user.name} requested early clock-out (${ev.hoursWorked.toFixed(1)}h): ${reason}`, { triggerId: 'attendance.regularization_submitted' });
    }

    saveDb();
    res.json({ success: true, request: r });
  });

  app.post('/api/attendance/request', (req: AuthedRequest, res) => {
    const r = { id: `ar${Date.now()}`, userId: req.userId!, type: req.body.type, date: req.body.date, hours: req.body.hours, reason: req.body.reason, location: req.body.location, time: req.body.time, status: 'Pending', createdAt: new Date().toISOString() };
    db().attendanceRequests.push(r);
    pushNotification(req.userId!, 'Attendance request submitted', `Your ${req.body.type} request is pending review.`, { triggerId: 'attendance.regularization_submitted' });
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
  app.get('/api/recruit/candidates', requireRole('manager', 'admin'), (_req, res) => res.json(db().candidates));
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
      pushNotification(u.id, 'Payroll processed', `Your ${period} payslip is ready.`, { triggerId: 'payroll.payslip_generated' });
    });
    saveDb();
    res.json({ success: true, message: `Payroll run for ${period}` });
  });

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
    if (s.responses.includes(req.userId!)) return res.status(400).json({ error: 'You have already completed this survey' });
    const feedback = String(req.body.feedback || '').trim();
    if (!feedback) return res.status(400).json({ error: 'Feedback is required' });
    const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 4));
    if (!db().surveyResponses) db().surveyResponses = [];
    db().surveyResponses.push({
      id: `sr${Date.now()}`,
      surveyId: s.id,
      userId: req.userId!,
      rating,
      feedback,
      createdAt: new Date().toISOString(),
    });
    s.responses.push(req.userId!);
    saveDb();
    res.json({ success: true });
  });

  // Field
  app.get('/api/field/agents', requireRole('manager', 'admin'), (_req, res) => res.json({ agents: db().fieldAgents, count: db().fieldAgents.filter(a => a.status === 'Active').length }));
  app.post('/api/field/agents', requireRole('manager', 'admin'), (req, res) => {
    const a = {
      id: `fa${Date.now()}`,
      name: req.body.name || 'Field Agent',
      location: req.body.location || '',
      lat: Number(req.body.lat) || 12.97,
      lng: Number(req.body.lng) || 77.59,
      status: req.body.status || 'Active',
    };
    db().fieldAgents.push(a);
    saveDb();
    res.json({ success: true, agent: a });
  });
  app.patch('/api/field/agents/:id', requireRole('manager', 'admin'), (req, res) => {
    const a = db().fieldAgents.find(x => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (req.body.name) a.name = req.body.name;
    if (req.body.location) a.location = req.body.location;
    if (req.body.status) a.status = req.body.status;
    if (req.body.lat !== undefined) a.lat = Number(req.body.lat);
    if (req.body.lng !== undefined) a.lng = Number(req.body.lng);
    saveDb();
    res.json({ success: true, agent: a });
  });

  // Finance
  app.get('/api/finance/summary', requireRole('manager', 'admin'), (_req, res) => {
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
    pushNotification(req.userId!, 'Ticket created', `"${t.title}" has been submitted.`, { triggerId: 'helpdesk.ticket_created' });
    saveDb();
    res.json({ success: true, ticket: t });
  });
  app.patch('/api/helpdesk/tickets/:id', requireRole('manager', 'admin'), (req, res) => {
    const t = db().tickets.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (req.body.status) {
      t.status = req.body.status;
      const triggerId = req.body.status === 'Resolved' ? 'helpdesk.ticket_resolved' : req.body.status === 'Closed' ? 'helpdesk.ticket_closed' : 'helpdesk.ticket_assigned';
      pushNotification(t.userId, `Ticket ${req.body.status.toLowerCase()}`, `Your ticket "${t.title}" is now ${req.body.status.toLowerCase()}.`, { triggerId });
    }
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
    const poll = db().polls.find(x => x.id === req.params.id) as { id: string; question: string; options: { label: string; votes: number }[]; voters?: string[] };
    if (!poll) return res.status(404).json({ error: 'Not found' });
    if (!poll.voters) poll.voters = [];
    if (poll.voters.includes(req.userId!)) return res.status(400).json({ error: 'You have already voted' });
    const opt = poll.options.find(o => o.label === req.body.option);
    if (!opt) return res.status(400).json({ error: 'Invalid option' });
    opt.votes++;
    poll.voters.push(req.userId!);
    saveDb();
    res.json({ success: true, poll });
  });

  // Reports
  app.get('/api/reports/:type', requireRole('manager', 'admin'), (req: AuthedRequest, res) => {
    const type = req.params.type;
    let data: unknown = {};
    if (type === 'attendance') data = { logs: db().attendanceLogs.length, activeToday: db().users.filter(u => u.status === 'Active').length, chart: db().attendanceLogs.slice(-30) };
    else if (type === 'leave') data = { requests: db().leaveRequests, approved: db().leaveRequests.filter(l => l.status === 'Approved').length, pending: db().leaveRequests.filter(l => l.status === 'Pending').length };
    else if (type === 'performance') data = { goals: db().performanceGoals, reviews: db().performanceReviews, avgRating: 4.2 };
    else if (type === 'attrition') data = { headcount: activeUsers().length, onLeave: db().users.filter(u => u.status === 'On Leave').length, departures: db().users.filter(u => u.status === 'Inactive').length };
    else data = { message: 'Custom report generated', modules: Object.keys(db().rolePermissions) };
    res.json({ type, generatedAt: new Date().toISOString(), data });
  });

  // Performance
  app.get('/api/performance', (req: AuthedRequest, res) => {
    const requested = req.query.userId as string | undefined;
    const me = getUserById(req.userId!);
    if (requested && requested !== req.userId && !isManagerOrAdmin(me)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const uid = requested || req.userId!;
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
    pushNotification(req.body.userId, 'Performance review', 'A new performance review has been submitted.', { triggerId: 'performance.review_completed' });
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
    const recipient = getUserById(req.params.userId);
    if (!recipient || recipient.status === 'Inactive') return res.status(404).json({ error: 'Recipient not found' });
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message is required' });
    const m = { id: `cm${Date.now()}`, fromId: req.userId!, toId: req.params.userId, content, createdAt: new Date().toISOString() };
    db().chatMessages.push(m);
    pushNotification(req.params.userId, 'New message', `${getUserById(req.userId!)?.name}: ${req.body.content.slice(0, 50)}`);
    saveDb();
    res.json({ success: true, message: m });
  });

  // AI
  app.post('/api/ai/chat', async (req: AuthedRequest, res) => {
    const { message } = req.body;
    const uid = req.userId!;
    const text = String(message || '').trim();
    if (!text) return res.status(400).json({ error: 'Message is required' });

    if (!db().aiMessages[uid]) db().aiMessages[uid] = [];
    db().aiMessages[uid].push({ id: `ai${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() });

    const user = getUserById(uid);
    const { buildAiReply } = await import('./ai-assistant');
    let reply = buildAiReply(text, user, db());

    const key = process.env.GEMINI_API_KEY?.trim();
    if (key && key !== 'MY_GEMINI_API_KEY' && text.length > 20) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: key });
        const resp = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `You are Kaala HRMS assistant for ${user?.name} at House of Kaala, India. Reply in clear Indian English. Be brief and helpful about HR topics only: ${text}`,
        });
        if (resp.text?.trim()) reply = resp.text.trim();
      } catch {
        // keep rule-based reply
      }
    }

    db().aiMessages[uid].push({ id: `ai${Date.now() + 1}`, role: 'assistant', content: reply, createdAt: new Date().toISOString() });
    saveDb();
    res.json({ reply, history: db().aiMessages[uid] });
  });

  app.get('/api/ai/history', (req: AuthedRequest, res) => {
    res.json(db().aiMessages[req.userId!] || []);
  });

  registerProjectRoutes(app);
  registerExtraRoutes(app);
}