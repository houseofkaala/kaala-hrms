import { Express } from 'express';
import { getDb, saveDb, sanitizeUser, getUserById, pushNotification } from './db';
import { AuthedRequest, requireRole } from './middleware';
import { isManagerOrAdmin } from './security';
import {
  computePayroll,
  defaultSalaryStructure,
  payslipHtml,
  type SalaryStructure,
} from './payroll-engine';

export function registerEnterpriseRoutes(app: Express) {
  const db = () => getDb();

  function ensureEnterpriseSchema() {
    const d = db() as ReturnType<typeof getDb> & {
      jobPostings?: unknown[];
      reviewCycles?: unknown[];
      offboardingTasks?: unknown[];
      policyAcknowledgments?: unknown[];
      shiftRoster?: unknown[];
      fieldVisits?: unknown[];
      salaryStructures?: Record<string, SalaryStructure>;
      tickets?: { attachmentName?: string; attachmentKey?: string }[];
    };
    if (!d.jobPostings) d.jobPostings = [];
    if (!d.reviewCycles) d.reviewCycles = [];
    if (!d.offboardingTasks) d.offboardingTasks = [];
    if (!d.policyAcknowledgments) d.policyAcknowledgments = [];
    if (!d.shiftRoster) d.shiftRoster = [];
    if (!d.fieldVisits) d.fieldVisits = [];
    if (!d.salaryStructures) d.salaryStructures = {};
    if (!d.orgSettings.officeGeofence) {
      d.orgSettings.officeGeofence = { name: 'House of Kaala Office', lat: 12.9716, lng: 77.5946, radiusMeters: 500 };
    }
    if (d.orgSettings.geoAttendanceRequired === undefined) {
      d.orgSettings.geoAttendanceRequired = false;
    }
  }

  // ── Recruitment ATS ──────────────────────────────────────────────
  app.get('/api/recruit/jobs', (_req, res) => {
    ensureEnterpriseSchema();
    res.json(db().jobPostings);
  });

  app.post('/api/recruit/jobs', requireRole('manager', 'admin'), (req, res) => {
    ensureEnterpriseSchema();
    const job = {
      id: `job${Date.now()}`,
      title: String(req.body.title || '').trim(),
      department: String(req.body.department || 'General').trim(),
      location: String(req.body.location || 'Bangalore').trim(),
      type: String(req.body.type || 'Full-time').trim(),
      status: 'Open',
      description: String(req.body.description || '').trim(),
      createdAt: new Date().toISOString(),
    };
    if (!job.title) return res.status(400).json({ error: 'Job title is required' });
    db().jobPostings.unshift(job);
    saveDb();
    res.status(201).json(job);
  });

  app.patch('/api/recruit/jobs/:id', requireRole('manager', 'admin'), (req, res) => {
    ensureEnterpriseSchema();
    const job = db().jobPostings.find((j: { id: string }) => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    const fields = ['title', 'department', 'location', 'type', 'status', 'description'] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (job as Record<string, unknown>)[f] = req.body[f];
    }
    saveDb();
    res.json(job);
  });

  app.patch('/api/recruit/candidates/:id/details', requireRole('manager', 'admin'), (req, res) => {
    const c = db().candidates.find(x => x.id === req.params.id) as Record<string, unknown> | undefined;
    if (!c) return res.status(404).json({ error: 'Not found' });
    const fields = ['email', 'phone', 'jobId', 'notes', 'interviewDate', 'source', 'stage', 'name', 'role'] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) c[f] = req.body[f];
    }
    saveDb();
    res.json(c);
  });

  // ── Performance: review cycles ───────────────────────────────────
  app.get('/api/performance/cycles', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    const cycles = db().reviewCycles as { id: string; status: string }[];
    if (isManagerOrAdmin(u)) return res.json(cycles);
    res.json(cycles.filter(c => c.status === 'active' || c.status === 'completed'));
  });

  app.post('/api/performance/cycles', requireRole('manager', 'admin'), (req, res) => {
    ensureEnterpriseSchema();
    const cycle = {
      id: `rc${Date.now()}`,
      name: String(req.body.name || 'Annual Review').trim(),
      period: String(req.body.period || new Date().getFullYear()).trim(),
      status: 'draft',
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      endDate: req.body.endDate || '',
      template: String(req.body.template || 'Standard 5-point review').trim(),
      createdAt: new Date().toISOString(),
    };
    db().reviewCycles.unshift(cycle);
    saveDb();
    res.status(201).json(cycle);
  });

  app.post('/api/performance/cycles/:id/launch', requireRole('manager', 'admin'), (req, res) => {
    ensureEnterpriseSchema();
    const cycle = db().reviewCycles.find((c: { id: string }) => c.id === req.params.id) as { id: string; status: string; name: string; period: string } | undefined;
    if (!cycle) return res.status(404).json({ error: 'Not found' });
    cycle.status = 'active';
    const employees = db().users.filter(u => u.status === 'Active' && u.role !== 'admin');
    for (const emp of employees) {
      const existing = db().performanceReviews.find(
        r => r.userId === emp.id && r.period === cycle.period && (r as { cycleId?: string }).cycleId === cycle.id,
      );
      if (existing) continue;
      db().performanceReviews.unshift({
        id: `rev${Date.now()}_${emp.id}`,
        userId: emp.id,
        reviewerId: emp.managerId || req.body.reviewerId || 'admin',
        rating: 0,
        feedback: '',
        period: cycle.period,
        status: 'Pending Self-Review',
        cycleId: cycle.id,
        cycleName: cycle.name,
      } as never);
      pushNotification(emp.id, 'Review cycle started', `${cycle.name} — please complete your self-review.`, { triggerId: 'performance.review_started' });
    }
    saveDb();
    res.json({ success: true, cycle, reviewsCreated: employees.length });
  });

  // ── Skills CRUD ──────────────────────────────────────────────────
  app.post('/api/performance/skills', (req: AuthedRequest, res) => {
    const uid = (req.body.userId as string) || req.userId!;
    const u = getUserById(req.userId!);
    if (uid !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    const skill = {
      id: `sk${Date.now()}`,
      userId: uid,
      name: String(req.body.name || '').trim(),
      level: Math.min(10, Math.max(1, Number(req.body.level) || 1)),
      maxLevel: Math.min(10, Math.max(1, Number(req.body.maxLevel) || 10)),
    };
    if (!skill.name) return res.status(400).json({ error: 'Skill name required' });
    db().skills.push(skill);
    saveDb();
    res.status(201).json(skill);
  });

  app.patch('/api/performance/skills/:id', (req: AuthedRequest, res) => {
    const skill = db().skills.find(s => s.id === req.params.id);
    if (!skill) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (skill.userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    if (req.body.name) skill.name = req.body.name;
    if (req.body.level !== undefined) skill.level = Math.min(skill.maxLevel, Math.max(1, Number(req.body.level)));
    if (req.body.maxLevel !== undefined) skill.maxLevel = Math.min(10, Math.max(skill.level, Number(req.body.maxLevel)));
    saveDb();
    res.json(skill);
  });

  app.delete('/api/performance/skills/:id', (req: AuthedRequest, res) => {
    const idx = db().skills.findIndex(s => s.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const skill = db().skills[idx];
    const u = getUserById(req.userId!);
    if (skill.userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    db().skills.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  });

  // ── Policies workflow ─────────────────────────────────────────────
  app.post('/api/policies', requireRole('admin'), (req, res) => {
    const pol = {
      id: `pol${Date.now()}`,
      title: String(req.body.title || req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      category: String(req.body.category || 'HR').trim(),
      status: 'Active',
      version: 1,
      requiresAck: Boolean(req.body.requiresAck ?? true),
      createdAt: new Date().toISOString(),
    };
    if (!pol.title) return res.status(400).json({ error: 'Title required' });
    db().policies.push(pol);
    saveDb();
    res.status(201).json({ ...pol, name: pol.title });
  });

  app.patch('/api/policies/:id', requireRole('admin'), (req, res) => {
    const pol = db().policies.find(p => p.id === req.params.id) as Record<string, unknown> | undefined;
    if (!pol) return res.status(404).json({ error: 'Not found' });
    if (req.body.title || req.body.name) pol.title = req.body.title || req.body.name;
    if (req.body.description) pol.description = req.body.description;
    if (req.body.category) pol.category = req.body.category;
    if (req.body.status) pol.status = req.body.status;
    saveDb();
    res.json({ ...pol, name: pol.title });
  });

  app.post('/api/policies/:id/acknowledge', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const pol = db().policies.find(p => p.id === req.params.id);
    if (!pol) return res.status(404).json({ error: 'Not found' });
    const acks = db().policyAcknowledgments as { policyId: string; userId: string; acknowledgedAt: string }[];
    const existing = acks.find(a => a.policyId === pol.id && a.userId === req.userId);
    if (existing) return res.json({ success: true, acknowledgedAt: existing.acknowledgedAt });
    const entry = { policyId: pol.id, userId: req.userId!, acknowledgedAt: new Date().toISOString() };
    acks.push(entry);
    saveDb();
    res.json({ success: true, ...entry });
  });

  app.get('/api/policies/acknowledgments', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    const acks = db().policyAcknowledgments as { policyId: string; userId: string; acknowledgedAt: string }[];
    if (isManagerOrAdmin(u) && req.query.all) return res.json(acks);
    res.json(acks.filter(a => a.userId === req.userId));
  });

  // ── Offboarding ───────────────────────────────────────────────────
  app.get('/api/offboarding', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    const uid = (req.query.userId as string) || req.userId!;
    if (uid !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    res.json(db().offboardingTasks.filter((t: { userId: string }) => t.userId === uid));
  });

  app.post('/api/offboarding/initiate/:userId', requireRole('admin'), (req, res) => {
    ensureEnterpriseSchema();
    const emp = getUserById(req.params.userId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const templates = [
      { title: 'Exit interview scheduled', category: 'HR', days: 3 },
      { title: 'Return company laptop & assets', category: 'IT', days: 1 },
      { title: 'Revoke system access', category: 'IT', days: 0 },
      { title: 'Full & final settlement', category: 'Finance', days: 15 },
      { title: 'Experience letter issued', category: 'HR', days: 10 },
    ];
    for (const t of templates) {
      db().offboardingTasks.push({
        id: `off${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: emp.id,
        title: t.title,
        description: `Offboarding for ${emp.name}`,
        status: 'Pending',
        dueDate: new Date(Date.now() + t.days * 86400000).toISOString().split('T')[0],
        category: t.category,
      });
      pushNotification(emp.id, 'Offboarding task', t.title, { triggerId: 'lifecycle.exit_initiated' });
    }
    saveDb();
    res.json({ success: true, tasks: db().offboardingTasks.filter((t: { userId: string }) => t.userId === emp.id) });
  });

  app.patch('/api/offboarding/:id', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const t = db().offboardingTasks.find((x: { id: string }) => x.id === req.params.id) as { userId: string; status: string } | undefined;
    if (!t) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (t.userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    if (req.body.status) t.status = req.body.status;
    saveDb();
    res.json({ success: true, task: t });
  });

  // ── Leaderboard ───────────────────────────────────────────────────
  app.get('/api/leaderboard', (req: AuthedRequest, res) => {
    const dept = String(req.query.department || '');
    const period = String(req.query.period || 'all');
    let users = db().users.filter(u => u.status === 'Active');
    if (dept) users = users.filter(u => u.department === dept);

    const ranked = users
      .map(u => {
        let points = u.points;
        if (period === 'month') {
          const monthAgo = Date.now() - 30 * 86400000;
          points = db().transactions
            .filter(t => t.userId === u.id && new Date(t.timestamp).getTime() > monthAgo)
            .reduce((s, t) => s + t.amount, 0);
        }
        const tasksDone = db().tasks.filter(t => t.ownerId === u.id && t.status === 'completed').length;
        return { id: u.id, name: u.name, department: u.department, role: u.role, points, tasksDone, rank: 0 };
      })
      .sort((a, b) => b.points - a.points)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json({ leaderboard: ranked, period, department: dept || 'all' });
  });

  // ── Shift roster ──────────────────────────────────────────────────
  app.get('/api/shifts/roster', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    const week = String(req.query.week || '');
    let roster = db().shiftRoster as { userId: string; date: string }[];
    if (week) roster = roster.filter(r => r.date.startsWith(week.slice(0, 7)));
    if (!isManagerOrAdmin(u)) roster = roster.filter(r => r.userId === req.userId);
    res.json(roster.map(r => ({ ...r, employee: sanitizeUser(getUserById(r.userId)!) })));
  });

  app.post('/api/shifts/roster', requireRole('manager', 'admin'), (req, res) => {
    ensureEnterpriseSchema();
    const entry = {
      id: `sr${Date.now()}`,
      userId: req.body.userId,
      date: req.body.date,
      shiftType: req.body.shiftType || 'General',
      startTime: req.body.startTime || '09:00',
      endTime: req.body.endTime || '18:00',
      location: req.body.location || 'Office',
    };
    if (!entry.userId || !entry.date) return res.status(400).json({ error: 'userId and date required' });
    db().shiftRoster.push(entry);
    pushNotification(entry.userId, 'Shift assigned', `You are scheduled for ${entry.shiftType} on ${entry.date}.`);
    saveDb();
    res.status(201).json(entry);
  });

  app.delete('/api/shifts/roster/:id', requireRole('manager', 'admin'), (req, res) => {
    ensureEnterpriseSchema();
    const idx = db().shiftRoster.findIndex((r: { id: string }) => r.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    db().shiftRoster.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  });

  // ── Field check-in (sales + EA) ───────────────────────────────────
  app.post('/api/field/check-in', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    if (!u) return res.status(401).json({ error: 'Unauthorized' });
    const visit = {
      id: `fv${Date.now()}`,
      userId: req.userId!,
      userName: u.name,
      location: String(req.body.location || '').trim(),
      lat: Number(req.body.lat) || 0,
      lng: Number(req.body.lng) || 0,
      notes: String(req.body.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };
    if (!visit.location) return res.status(400).json({ error: 'Location label required' });
    db().fieldVisits.unshift(visit);
    const agent = db().fieldAgents.find(a => a.name === u.name);
    if (agent) {
      agent.lat = visit.lat;
      agent.lng = visit.lng;
      agent.location = visit.location;
      agent.status = 'Active';
    } else if (u.role === 'sales' || u.role === 'executive_assistant') {
      db().fieldAgents.push({
        id: `fa_${u.id}`,
        name: u.name,
        location: visit.location,
        lat: visit.lat,
        lng: visit.lng,
        status: 'Active',
      });
    }
    saveDb();
    res.status(201).json(visit);
  });

  app.get('/api/field/visits', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    let visits = db().fieldVisits as { userId: string }[];
    if (!isManagerOrAdmin(u)) visits = visits.filter(v => v.userId === req.userId);
    res.json(visits.slice(0, 100));
  });

  // ── India payroll ─────────────────────────────────────────────────
  app.get('/api/payroll/salary/:userId', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const u = getUserById(req.userId!);
    if (req.params.userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    const emp = getUserById(req.params.userId);
    if (!emp) return res.status(404).json({ error: 'Not found' });
    const structure = db().salaryStructures[req.params.userId] || defaultSalaryStructure(emp.role);
    res.json({ userId: req.params.userId, structure, breakdown: computePayroll(structure) });
  });

  app.patch('/api/payroll/salary/:userId', requireRole('admin'), (req, res) => {
    ensureEnterpriseSchema();
    const emp = getUserById(req.params.userId);
    if (!emp) return res.status(404).json({ error: 'Not found' });
    const current = db().salaryStructures[req.params.userId] || defaultSalaryStructure(emp.role);
    const updated: SalaryStructure = {
      ctc: req.body.ctc !== undefined ? Number(req.body.ctc) : current.ctc,
      basic: req.body.basic !== undefined ? Number(req.body.basic) : current.basic,
      hra: req.body.hra !== undefined ? Number(req.body.hra) : current.hra,
      specialAllowance: req.body.specialAllowance !== undefined ? Number(req.body.specialAllowance) : current.specialAllowance,
      pfEnabled: req.body.pfEnabled !== undefined ? Boolean(req.body.pfEnabled) : current.pfEnabled,
      esicEnabled: req.body.esicEnabled !== undefined ? Boolean(req.body.esicEnabled) : current.esicEnabled,
      ptEnabled: req.body.ptEnabled !== undefined ? Boolean(req.body.ptEnabled) : current.ptEnabled,
    };
    db().salaryStructures[req.params.userId] = updated;
    saveDb();
    res.json({ userId: req.params.userId, structure: updated, breakdown: computePayroll(updated) });
  });

  app.get('/api/payroll/:id/payslip/html', (req: AuthedRequest, res) => {
    ensureEnterpriseSchema();
    const pr = db().payrollRecords.find(p => p.id === req.params.id) as Record<string, unknown> | undefined;
    if (!pr) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (pr.userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    const emp = getUserById(pr.userId as string);
    const breakdown = (pr.breakdown as ReturnType<typeof computePayroll>) || {
      grossPay: pr.grossPay as number,
      netPay: pr.netPay as number,
      basic: 0, hra: 0, specialAllowance: 0,
      pfEmployee: 0, pfEmployer: 0, esicEmployee: 0, esicEmployer: 0,
      professionalTax: 0, tds: 0, deductions: pr.deductions as number,
    };
    const html = payslipHtml(
      { name: emp?.name || '', email: emp?.email || '', department: emp?.department || '', title: emp?.title },
      String(pr.period),
      breakdown,
      db().orgSettings.companyName,
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // ── Announcements ─────────────────────────────────────────────────
  app.post('/api/community/announcements', requireRole('manager', 'admin'), (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    const p = {
      id: `cp${Date.now()}`,
      userId: req.userId!,
      author: u?.name || 'HR',
      type: 'announcement',
      title: String(req.body.title || 'Announcement').trim(),
      content: String(req.body.content || '').trim(),
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    };
    if (!p.content) return res.status(400).json({ error: 'Content required' });
    db().communityPosts.unshift(p);
    for (const emp of db().users.filter(x => x.status === 'Active')) {
      pushNotification(emp.id, p.title, p.content.slice(0, 120), { triggerId: 'community.announcement' });
    }
    saveDb();
    res.status(201).json(p);
  });

  // ── Help desk attachment metadata ─────────────────────────────────
  app.patch('/api/helpdesk/tickets/:id/attachment', (req: AuthedRequest, res) => {
    const t = db().tickets.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (t.userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    (t as { attachmentName?: string }).attachmentName = req.body.attachmentName;
    (t as { attachmentKey?: string }).attachmentKey = req.body.attachmentKey;
    saveDb();
    res.json({ success: true, ticket: t });
  });
}