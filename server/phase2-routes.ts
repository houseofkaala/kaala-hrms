import { Express } from 'express';
import { getDb, saveDb, sanitizeUser, getUserById, pushNotification } from './db';
import { AuthedRequest, requireRole } from './middleware';
import { isManagerOrAdmin } from './security';
import {
  buildForm16,
  computeDeclarationTotal,
  clampDeclarationFields,
  currentFinancialYear,
  form16Html,
  type InvestmentDeclaration,
} from './tax-compliance';
import { defaultSalaryStructure, computePayroll } from './payroll-engine';
import { dispatchWebhook } from './webhooks';

export function registerPhase2Routes(app: Express) {
  const db = () => getDb();

  function ensurePhase2Schema() {
    const d = db() as ReturnType<typeof getDb> & {
      benefitPlans?: unknown[];
      benefitEnrollments?: unknown[];
      signatureRequests?: unknown[];
      investmentDeclarations?: unknown[];
      form16Records?: unknown[];
      webhooks?: unknown[];
      integrations?: Record<string, unknown>;
    };
    if (!d.benefitPlans) {
      d.benefitPlans = [
        { id: 'bp1', name: 'Group Health Insurance', type: 'health', provider: 'Star Health', description: 'Family floater cover ₹5L', employerContribution: 8000, employeeContribution: 2000, status: 'active', enrollmentOpen: true },
        { id: 'bp2', name: 'Term Life Insurance', type: 'life', provider: 'HDFC Life', description: '10× annual CTC coverage', employerContribution: 3000, employeeContribution: 0, status: 'active', enrollmentOpen: true },
        { id: 'bp3', name: 'Provident Fund (EPF)', type: 'pf', provider: 'EPFO', description: 'Mandatory 12% employee + 12% employer', employerContribution: 0, employeeContribution: 0, status: 'active', enrollmentOpen: true, autoEnroll: true },
        { id: 'bp4', name: 'NPS Contribution', type: 'nps', provider: 'NPS Trust', description: 'Additional retirement savings u/s 80CCD(1B)', employerContribution: 0, employeeContribution: 5000, status: 'active', enrollmentOpen: true },
      ];
    }
    if (!d.benefitEnrollments) d.benefitEnrollments = [];
    if (!d.signatureRequests) d.signatureRequests = [];
    if (!d.investmentDeclarations) d.investmentDeclarations = [];
    if (!d.form16Records) d.form16Records = [];
    if (!d.webhooks) d.webhooks = [];
    if (!d.integrations) {
      d.integrations = {
        googleSso: { enabled: false, clientId: '', allowedDomain: 'bymarketingonly.com' },
        slack: { enabled: false, webhookUrl: '' },
      };
    }
  }

  // ── Benefits ──────────────────────────────────────────────────────
  app.get('/api/benefits/plans', (_req, res) => {
    ensurePhase2Schema();
    res.json(db().benefitPlans);
  });

  app.post('/api/benefits/plans', requireRole('admin'), (req, res) => {
    ensurePhase2Schema();
    const plan = {
      id: `bp${Date.now()}`,
      name: String(req.body.name || '').trim(),
      type: String(req.body.type || 'health').trim(),
      provider: String(req.body.provider || '').trim(),
      description: String(req.body.description || '').trim(),
      employerContribution: Number(req.body.employerContribution) || 0,
      employeeContribution: Number(req.body.employeeContribution) || 0,
      status: 'active',
      enrollmentOpen: true,
    };
    if (!plan.name) return res.status(400).json({ error: 'Plan name required' });
    (db().benefitPlans as unknown[]).unshift(plan);
    saveDb();
    res.status(201).json(plan);
  });

  app.get('/api/benefits/enrollments', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const u = getUserById(req.userId!);
    let enrollments = db().benefitEnrollments as { userId: string; planId: string }[];
    if (!isManagerOrAdmin(u) || !req.query.all) {
      enrollments = enrollments.filter(e => e.userId === req.userId);
    }
    const plans = db().benefitPlans as { id: string; name: string }[];
    res.json(enrollments.map(e => ({
      ...e,
      plan: plans.find(p => p.id === e.planId),
      employee: sanitizeUser(getUserById(e.userId)!),
    })));
  });

  app.post('/api/benefits/enroll', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const planId = req.body.planId;
    const plan = (db().benefitPlans as { id: string; name: string; enrollmentOpen?: boolean }[]).find(p => p.id === planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.enrollmentOpen === false) return res.status(400).json({ error: 'Enrollment closed' });

    const existing = (db().benefitEnrollments as { userId: string; planId: string }[]).find(
      e => e.userId === req.userId && e.planId === planId,
    );
    if (existing) return res.status(409).json({ error: 'Already enrolled' });

    const enrollment = {
      id: `be${Date.now()}`,
      userId: req.userId!,
      planId,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      dependents: req.body.dependents || [],
    };
    (db().benefitEnrollments as unknown[]).push(enrollment);
    pushNotification(req.userId!, 'Benefits enrolled', `You are enrolled in ${plan.name}.`, { triggerId: 'benefits.enrolled' });
    saveDb();
    res.status(201).json(enrollment);
  });

  app.delete('/api/benefits/enrollments/:id', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const enrollments = db().benefitEnrollments as { id: string; userId: string }[];
    const idx = enrollments.findIndex(e => e.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const u = getUserById(req.userId!);
    if (enrollments[idx].userId !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });
    enrollments.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  });

  // ── E-Sign ────────────────────────────────────────────────────────
  app.get('/api/signatures', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const u = getUserById(req.userId!);
    let sigs = db().signatureRequests as { userId: string; status: string }[];
    if (!isManagerOrAdmin(u) || !req.query.all) {
      sigs = sigs.filter(s => s.userId === req.userId);
    }
    res.json(sigs);
  });

  app.post('/api/documents/:id/request-signature', requireRole('manager', 'admin'), (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const doc = db().documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const targetUserId = req.body.userId || doc.userId;
    const sig = {
      id: `sig${Date.now()}`,
      documentId: doc.id,
      documentName: doc.name,
      userId: targetUserId,
      requestedBy: req.userId!,
      title: req.body.title || `Sign: ${doc.name}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    (db().signatureRequests as unknown[]).unshift(sig);
    pushNotification(targetUserId, 'Signature required', sig.title, { triggerId: 'document.signature_requested' });
    saveDb();
    res.status(201).json(sig);
  });

  app.post('/api/signatures/:id/sign', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const sig = (db().signatureRequests as { id: string; userId: string; status: string; signedAt?: string; signatureData?: string }[]).find(s => s.id === req.params.id);
    if (!sig) return res.status(404).json({ error: 'Not found' });
    if (sig.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    if (!req.body.signatureData) return res.status(400).json({ error: 'Signature data required' });

    sig.status = 'signed';
    sig.signedAt = new Date().toISOString();
    sig.signatureData = String(req.body.signatureData).slice(0, 500000);
    dispatchWebhook('document.signed', { signatureId: sig.id, userId: req.userId }).catch(() => {});
    saveDb();
    res.json({ success: true, signature: sig });
  });

  // ── Tax & Form 16 ─────────────────────────────────────────────────
  app.get('/api/tax/declaration', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const fy = String(req.query.year || currentFinancialYear());
    const uid = (req.query.userId as string) || req.userId!;
    const u = getUserById(req.userId!);
    if (uid !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });

    const decl = (db().investmentDeclarations as InvestmentDeclaration[]).find(
      d => d.userId === uid && d.financialYear === fy,
    );
    res.json(decl || {
      userId: uid,
      financialYear: fy,
      section80C: 0,
      section80D: 0,
      section80G: 0,
      hraExemption: 0,
      homeLoanInterest: 0,
      nps: 0,
      otherDeductions: 0,
      totalDeclared: 0,
      status: 'draft',
    });
  });

  app.post('/api/tax/declaration', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const fy = String(req.body.financialYear || currentFinancialYear());
    const declarations = db().investmentDeclarations as InvestmentDeclaration[];
    let decl = declarations.find(d => d.userId === req.userId && d.financialYear === fy);

    const fields = ['section80C', 'section80D', 'section80G', 'hraExemption', 'homeLoanInterest', 'nps', 'otherDeductions'] as const;
    const raw: Partial<InvestmentDeclaration> = { userId: req.userId!, financialYear: fy };
    for (const f of fields) {
      if (req.body[f] !== undefined) raw[f] = Number(req.body[f]) || 0;
    }
    const data = clampDeclarationFields(raw);
    data.totalDeclared = computeDeclarationTotal(data);
    data.status = req.body.submit ? 'submitted' : 'draft';
    if (req.body.submit) data.submittedAt = new Date().toISOString();

    if (decl) {
      if (decl.status === 'submitted' || decl.status === 'verified') {
        return res.status(400).json({ error: 'Cannot edit a submitted or verified declaration' });
      }
      Object.assign(decl, data);
    } else {
      decl = { id: `id${Date.now()}`, ...data } as InvestmentDeclaration;
      declarations.push(decl);
    }
    saveDb();
    res.json(decl);
  });

  app.patch('/api/tax/declaration/:id/verify', requireRole('admin'), (req, res) => {
    ensurePhase2Schema();
    const decl = (db().investmentDeclarations as InvestmentDeclaration[]).find(d => d.id === req.params.id);
    if (!decl) return res.status(404).json({ error: 'Not found' });
    decl.status = 'verified';
    decl.verifiedAt = new Date().toISOString();
    decl.verifiedBy = (req as AuthedRequest).userId!;
    saveDb();
    pushNotification(decl.userId, 'Investment declaration verified', `Your FY ${decl.financialYear} declaration has been verified.`);
    res.json(decl);
  });

  app.get('/api/tax/form16', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const fy = String(req.query.year || currentFinancialYear());
    const uid = (req.query.userId as string) || req.userId!;
    const u = getUserById(req.userId!);
    if (uid !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });

    const record = (db().form16Records as { userId: string; financialYear: string }[]).find(
      r => r.userId === uid && r.financialYear === fy,
    );
    res.json(record || null);
  });

  app.get('/api/tax/form16/html', (req: AuthedRequest, res) => {
    ensurePhase2Schema();
    const fy = String(req.query.year || currentFinancialYear());
    const uid = (req.query.userId as string) || req.userId!;
    const u = getUserById(req.userId!);
    if (uid !== req.userId && !isManagerOrAdmin(u)) return res.status(403).json({ error: 'Forbidden' });

    const emp = getUserById(uid);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const decl = (db().investmentDeclarations as InvestmentDeclaration[]).find(
      d => d.userId === uid && d.financialYear === fy,
    );
    const structure = (db() as ReturnType<typeof getDb> & { salaryStructures?: Record<string, ReturnType<typeof defaultSalaryStructure>> }).salaryStructures?.[uid]
      || defaultSalaryStructure(emp.role);
    const monthly = computePayroll(structure);
    const annualGross = monthly.grossPay * 12;
    const monthlyTds = Array(12).fill(monthly.tds);

    const form16 = buildForm16(emp, db().orgSettings.companyName, annualGross, decl || null, monthlyTds);
    res.setHeader('Content-Type', 'text/html');
    res.send(form16Html(form16));
  });

  app.post('/api/tax/form16/generate', requireRole('admin'), (_req, res) => {
    ensurePhase2Schema();
    const fy = currentFinancialYear();
    const records = db().form16Records as { userId: string; financialYear: string; id: string; generatedAt: string }[];
    let count = 0;

    for (const emp of db().users.filter(u => u.status === 'Active')) {
      const structure = (db() as ReturnType<typeof getDb> & { salaryStructures?: Record<string, ReturnType<typeof defaultSalaryStructure>> }).salaryStructures?.[emp.id]
        || defaultSalaryStructure(emp.role);
      const monthly = computePayroll(structure);
      const decl = (db().investmentDeclarations as InvestmentDeclaration[]).find(
        d => d.userId === emp.id && d.financialYear === fy,
      );
      const form16 = buildForm16(emp, db().orgSettings.companyName, monthly.grossPay * 12, decl || null, Array(12).fill(monthly.tds));

      const existing = records.find(r => r.userId === emp.id && r.financialYear === fy);
      if (existing) {
        Object.assign(existing, { data: form16, generatedAt: new Date().toISOString() });
      } else {
        records.push({
          id: `f16${Date.now()}_${emp.id}`,
          userId: emp.id,
          financialYear: fy,
          generatedAt: new Date().toISOString(),
          data: form16,
        } as never);
      }
      pushNotification(emp.id, 'Form 16 available', `Your Form 16 for FY ${fy} is ready to download.`);
      count++;
    }
    saveDb();
    dispatchWebhook('payroll.processed', { type: 'form16', count, financialYear: fy }).catch(() => {});
    res.json({ success: true, generated: count, financialYear: fy });
  });

  // ── Integrations & Webhooks ───────────────────────────────────────
  app.get('/api/integrations', requireRole('admin'), (_req, res) => {
    ensurePhase2Schema();
    res.json({
      integrations: (db() as ReturnType<typeof getDb> & { integrations?: Record<string, unknown> }).integrations,
      webhooks: db().webhooks,
    });
  });

  app.patch('/api/integrations', requireRole('admin'), (req, res) => {
    ensurePhase2Schema();
    const integrations = (db() as ReturnType<typeof getDb> & { integrations: Record<string, unknown> }).integrations;
    if (req.body.googleSso) integrations.googleSso = { ...integrations.googleSso as object, ...req.body.googleSso };
    if (req.body.slack) integrations.slack = { ...integrations.slack as object, ...req.body.slack };
    saveDb();
    res.json({ success: true, integrations });
  });

  app.post('/api/integrations/webhooks', requireRole('admin'), (req, res) => {
    ensurePhase2Schema();
    const hook = {
      id: `wh${Date.now()}`,
      url: String(req.body.url || '').trim(),
      events: Array.isArray(req.body.events) ? req.body.events.map(String) : ['employee.created'],
      secret: `whsec_${Math.random().toString(36).slice(2, 18)}`,
      active: true,
      createdAt: new Date().toISOString(),
    };
    if (!hook.url.startsWith('http')) return res.status(400).json({ error: 'Valid URL required' });
    (db().webhooks as unknown[]).push(hook);
    saveDb();
    res.status(201).json(hook);
  });

  app.delete('/api/integrations/webhooks/:id', requireRole('admin'), (req, res) => {
    ensurePhase2Schema();
    const hooks = db().webhooks as { id: string }[];
    const idx = hooks.findIndex(h => h.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    hooks.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  });

  app.post('/api/integrations/webhooks/test', requireRole('admin'), async (_req, res) => {
    await dispatchWebhook('employee.created', { test: true, message: 'Kaala HRMS webhook test' });
    res.json({ success: true, message: 'Test event dispatched to active webhooks' });
  });

  app.get('/api/auth/google', (_req, res) => {
    ensurePhase2Schema();
    const google = (db() as ReturnType<typeof getDb> & { integrations: { googleSso: { enabled: boolean; clientId: string } } }).integrations?.googleSso;
    if (!google?.enabled || !google.clientId) {
      return res.status(503).json({
        error: 'Google SSO not configured',
        hint: 'Enable Google SSO in Admin → Settings → Integrations and set Client ID',
      });
    }
    const redirect = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${google.clientId}&redirect_uri=${encodeURIComponent('https://employee.bymarketingonly.com/api/auth/google/callback')}&response_type=code&scope=openid%20email%20profile`;
    res.json({ url: redirect, configured: true });
  });
}