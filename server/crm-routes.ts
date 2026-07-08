import { Express } from 'express';
import { getDb, saveDb, getUserById } from './db';
import { AuthedRequest } from './middleware';
import { isManagerOrAdmin } from './security';
import { CRM_STAGES, type CrmLeadRecord, type CrmLeadStage } from './crm';

const STAGE_KEYS = new Set(CRM_STAGES.map(s => s.key));

function canAccessCrmLead(lead: CrmLeadRecord, userId: string, role: string) {
  if (isManagerOrAdmin({ role } as { role: string })) return true;
  return lead.ownerId === userId;
}

export function registerCrmRoutes(app: Express) {
  const db = () => getDb();

  if (!db().crmLeads) db().crmLeads = [];

  app.get('/api/crm/leads', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let leads = db().crmLeads || [];
    if (!isManagerOrAdmin(user)) {
      leads = leads.filter(l => l.ownerId === user.id);
    }

    const q = String(req.query.q || '').toLowerCase();
    const stage = String(req.query.stage || '');
    if (stage && STAGE_KEYS.has(stage as CrmLeadStage)) {
      leads = leads.filter(l => l.stage === stage);
    }
    if (q) {
      leads = leads.filter(l =>
        `${l.firstName} ${l.lastName} ${l.company} ${l.email}`.toLowerCase().includes(q),
      );
    }

    leads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(leads);
  });

  app.get('/api/crm/stats', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let leads = db().crmLeads || [];
    if (!isManagerOrAdmin(user)) leads = leads.filter(l => l.ownerId === user.id);

    const open = leads.filter(l => l.stage !== 'closed_won' && l.stage !== 'closed_lost');
    const won = leads.filter(l => l.stage === 'closed_won');
    const pipelineValue = open.reduce((s, l) => s + (l.amount || 0), 0);
    const wonValue = won.reduce((s, l) => s + (l.amount || 0), 0);

    const byStage = Object.fromEntries(
      CRM_STAGES.map(s => [s.key, leads.filter(l => l.stage === s.key).length]),
    );

    res.json({
      total: leads.length,
      open: open.length,
      pipelineValue,
      wonCount: won.length,
      wonValue,
      byStage,
    });
  });

  app.get('/api/crm/leads/:id', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    const lead = (db().crmLeads || []).find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!user || !canAccessCrmLead(lead, user.id, user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(lead);
  });

  app.post('/api/crm/leads', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      firstName, lastName, company, email, phone, title, source, industry,
      amount, stage, rating, description, nextFollowUp, ownerId,
    } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'First and last name are required' });
    }

    const now = new Date().toISOString();
    const lead: CrmLeadRecord = {
      id: `lead${Date.now()}`,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      company: String(company || '').trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      title: String(title || '').trim(),
      source: String(source || 'Other').trim(),
      industry: String(industry || '').trim(),
      amount: Number(amount) || 0,
      stage: STAGE_KEYS.has(stage) ? stage : 'new',
      rating: ['hot', 'warm', 'cold'].includes(rating) ? rating : 'warm',
      description: String(description || '').trim(),
      ownerId: isManagerOrAdmin(user) && ownerId ? ownerId : user.id,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      nextFollowUp: nextFollowUp || undefined,
    };

    if (!db().crmLeads) db().crmLeads = [];
    db().crmLeads.unshift(lead);
    saveDb();
    res.status(201).json(lead);
  });

  app.patch('/api/crm/leads/:id', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    const lead = (db().crmLeads || []).find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!user || !canAccessCrmLead(lead, user.id, user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const fields = [
      'firstName', 'lastName', 'company', 'email', 'phone', 'title',
      'source', 'industry', 'description', 'nextFollowUp', 'rating',
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (lead as Record<string, unknown>)[f] = req.body[f];
    }
    if (req.body.amount !== undefined) lead.amount = Number(req.body.amount) || 0;
    if (req.body.stage && STAGE_KEYS.has(req.body.stage)) lead.stage = req.body.stage;
    if (isManagerOrAdmin(user) && req.body.ownerId) lead.ownerId = req.body.ownerId;

    lead.updatedAt = new Date().toISOString();
    lead.lastActivityAt = lead.updatedAt;
    saveDb();
    res.json(lead);
  });

  app.delete('/api/crm/leads/:id', (req: AuthedRequest, res) => {
    const user = getUserById(req.userId!);
    const leads = db().crmLeads || [];
    const idx = leads.findIndex(l => l.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[idx];
    if (!user || !canAccessCrmLead(lead, user.id, user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    leads.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  });
}