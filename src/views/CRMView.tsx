import { useState, type FormEvent, type DragEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, LayoutGrid, List, X, Building2, Mail, Phone,
  IndianRupee, Flame, Thermometer, Snowflake, Calendar, User, Trash2,
} from 'lucide-react';
import type { User as HrmsUser } from '../types';
import { format } from 'date-fns';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';

const STAGES = [
  { key: 'new', label: 'New', accent: 'border-indigo-400/40 bg-indigo-500/10' },
  { key: 'contacted', label: 'Contacted', accent: 'border-violet-400/40 bg-violet-500/10' },
  { key: 'qualified', label: 'Qualified', accent: 'border-sky-400/40 bg-sky-500/10' },
  { key: 'proposal', label: 'Proposal', accent: 'border-amber-400/40 bg-amber-500/10' },
  { key: 'negotiation', label: 'Negotiation', accent: 'border-orange-400/40 bg-orange-500/10' },
  { key: 'closed_won', label: 'Closed Won', accent: 'border-emerald-400/40 bg-emerald-500/10' },
  { key: 'closed_lost', label: 'Closed Lost', accent: 'border-gray-400/40 bg-gray-500/10' },
] as const;

type Stage = (typeof STAGES)[number]['key'];

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  title: string;
  source: string;
  industry: string;
  amount: number;
  stage: Stage;
  rating: 'hot' | 'warm' | 'cold';
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  nextFollowUp?: string;
}

interface CrmStats {
  total: number;
  open: number;
  pipelineValue: number;
  wonCount: number;
  wonValue: number;
  byStage: Record<string, number>;
}

const SOURCES = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Event', 'Partner', 'Other'];

const emptyForm = {
  firstName: '', lastName: '', company: '', email: '', phone: '', title: '',
  source: 'Website', industry: '', amount: '', rating: 'warm' as const,
  description: '', nextFollowUp: '',
};

function RatingIcon({ rating }: { rating: Lead['rating'] }) {
  if (rating === 'hot') return <Flame className="w-3.5 h-3.5 text-orange-400" />;
  if (rating === 'cold') return <Snowflake className="w-3.5 h-3.5 text-sky-300" />;
  return <Thermometer className="w-3.5 h-3.5 text-amber-400" />;
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export function CRMView() {
  const qc = useQueryClient();
  const { currentUser } = useRBACStore();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dragId, setDragId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['crm-leads', search],
    queryFn: () => fetcher(`/api/crm/leads${search ? `?q=${encodeURIComponent(search)}` : ''}`),
  });

  const { data: stats } = useQuery<CrmStats>({
    queryKey: ['crm-stats'],
    queryFn: () => fetcher('/api/crm/stats'),
  });

  const { data: assignees = [] } = useQuery<HrmsUser[]>({
    queryKey: ['crm-assignees'],
    queryFn: () => fetcher('/api/users'),
    enabled: isAdmin,
    select: users =>
      users.filter(u =>
        u.status !== 'Inactive' &&
        (u.role === 'sales' || u.role === 'executive_assistant' || u.role === 'manager' || u.role === 'admin'),
      ),
  });

  const createLead = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify({ ...form, amount: Number(form.amount) || 0 }),
    });
    setForm(emptyForm);
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ['crm-leads'] });
    qc.invalidateQueries({ queryKey: ['crm-stats'] });
  };

  const moveStage = async (leadId: string, stage: Stage) => {
    await fetcher(`/api/crm/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    });
    qc.invalidateQueries({ queryKey: ['crm-leads'] });
    qc.invalidateQueries({ queryKey: ['crm-stats'] });
    if (selected?.id === leadId) {
      setSelected(prev => prev ? { ...prev, stage } : null);
    }
  };

  const reassignOwner = async (leadId: string, ownerId: string) => {
    const updated = await fetcher<Lead>(`/api/crm/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ownerId }),
    });
    qc.invalidateQueries({ queryKey: ['crm-leads'] });
    if (selected?.id === leadId) setSelected(updated);
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Delete this lead permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await fetcher(`/api/crm/leads/${leadId}`, { method: 'DELETE' });
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    } finally {
      setDeleting(false);
    }
  };

  const ownerName = (ownerId: string) =>
    assignees.find(u => u.id === ownerId)?.name || (ownerId === currentUser?.id ? 'You' : 'Assigned');

  const onDrop = (e: DragEvent, stage: Stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId') || dragId;
    if (id) moveStage(id, stage);
    setDragId(null);
  };

  const leadsByStage = (stage: Stage) => leads.filter(l => l.stage === stage);

  return (
    <div className="space-y-6">
      {/* Salesforce-style header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-stat">
          <p className="premium-stat-label">Total Leads</p>
          <p className="premium-stat-value">{stats?.total ?? '—'}</p>
        </div>
        <div className="premium-stat">
          <p className="premium-stat-label">Open Pipeline</p>
          <p className="premium-stat-value">{stats?.open ?? '—'}</p>
          <p className="text-xs text-gold-muted mt-1">{formatINR(stats?.pipelineValue ?? 0)}</p>
        </div>
        <div className="premium-stat">
          <p className="premium-stat-label">Closed Won</p>
          <p className="premium-stat-value">{stats?.wonCount ?? '—'}</p>
          <p className="text-xs text-emerald-400/80 mt-1">{formatINR(stats?.wonValue ?? 0)}</p>
        </div>
        <div className="premium-stat">
          <p className="premium-stat-label">Win Rate</p>
          <p className="premium-stat-value">
            {stats && stats.total > 0
              ? `${Math.round((stats.wonCount / stats.total) * 100)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="studio-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 studio-chip flex-1 max-w-xs">
            <Search className="w-4 h-4 text-ivory-muted shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="bg-transparent border-none outline-none text-sm text-ivory w-full placeholder:text-ivory-muted/60"
            />
          </div>
          <div className="period-toggle shrink-0">
            <button type="button" data-active={view === 'pipeline'} onClick={() => setView('pipeline')}>
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />Pipeline
            </button>
            <button type="button" data-active={view === 'list'} onClick={() => setView('list')}>
              <List className="w-3.5 h-3.5 inline mr-1" />List
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 text-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> New Lead
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-ivory-muted text-sm">Loading pipeline…</div>
      ) : view === 'pipeline' ? (
        <div className="flex gap-3 overflow-x-auto premium-scrollbar pb-4 min-h-[420px]">
          {STAGES.map(col => {
            const colLeads = leadsByStage(col.key);
            const colValue = colLeads.reduce((s, l) => s + l.amount, 0);
            return (
              <div
                key={col.key}
                className="flex-shrink-0 w-64 flex flex-col"
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, col.key)}
              >
                <div className={cn('rounded-t-xl border px-3 py-2.5', col.accent)}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ivory">{col.label}</span>
                    <span className="text-[10px] text-ivory-muted tabular-nums">{colLeads.length}</span>
                  </div>
                  {colValue > 0 && (
                    <p className="text-[10px] text-gold-muted mt-0.5 tabular-nums">{formatINR(colValue)}</p>
                  )}
                </div>
                <div className="flex-1 space-y-2 p-2 bg-charcoal/40 border border-gold/10 border-t-0 rounded-b-xl min-h-[360px]">
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => {
                        setDragId(lead.id);
                        e.dataTransfer.setData('leadId', lead.id);
                      }}
                      onClick={() => setSelected(lead)}
                      className="studio-card p-3 cursor-grab active:cursor-grabbing hover:border-gold/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-ivory leading-tight">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <RatingIcon rating={lead.rating} />
                      </div>
                      {lead.company && (
                        <p className="text-[11px] text-ivory-muted flex items-center gap-1 mb-1.5">
                          <Building2 className="w-3 h-3 shrink-0" />{lead.company}
                        </p>
                      )}
                      {lead.amount > 0 && (
                        <p className="text-xs font-semibold text-gold-light tabular-nums flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />{formatINR(lead.amount)}
                        </p>
                      )}
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <p className="text-[10px] text-ivory-muted/50 text-center py-8">Drop leads here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="studio-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gold/10 text-[10px] uppercase tracking-wider text-ivory-muted">
              <tr>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/5">
              {leads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="hover:bg-gold/5 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-ivory">{lead.firstName} {lead.lastName}</p>
                    <p className="text-[11px] text-ivory-muted">{lead.title || lead.email}</p>
                  </td>
                  <td className="px-5 py-3 text-ivory-muted">{lead.company || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="studio-chip text-[10px] capitalize">{lead.stage.replace('_', ' ')}</span>
                  </td>
                  <td className="px-5 py-3 text-gold-light tabular-nums font-medium">{formatINR(lead.amount)}</td>
                  <td className="px-5 py-3 text-ivory-muted text-xs">{lead.source}</td>
                  <td className="px-5 py-3"><RatingIcon rating={lead.rating} /></td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ivory-muted text-sm">
                    No leads yet. Click <strong className="text-gold-light">New Lead</strong> to add your first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Lead modal */}
      {showForm && (
        <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form
            onSubmit={createLead}
            onClick={e => e.stopPropagation()}
            className="studio-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-xl text-ivory">New Lead</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-ivory-muted hover:text-ivory">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="studio-kicker block mb-1.5">First Name *</label>
                <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Last Name *</label>
                <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Company</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="e.g. CEO" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Amount (₹)</label>
                <input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="input-field">
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Industry</label>
                <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Rating</label>
                <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value as 'hot' | 'warm' | 'cold' }))} className="input-field">
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
              <div>
                <label className="studio-kicker block mb-1.5">Next Follow-up</label>
                <input type="date" value={form.nextFollowUp} onChange={e => setForm(f => ({ ...f, nextFollowUp: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Notes</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field min-h-[80px] resize-none" placeholder="Lead notes, requirements…" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create Lead</button>
            </div>
          </form>
        </div>
      )}

      {/* Lead detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] studio-card rounded-none border-l border-gold/15 z-50 flex flex-col overflow-y-auto">
            <div className="p-6 border-b border-gold/10 flex items-start justify-between">
              <div>
                <p className="studio-kicker mb-1">Lead</p>
                <h2 className="font-display text-2xl text-ivory">{selected.firstName} {selected.lastName}</h2>
                {selected.title && <p className="text-sm text-ivory-muted mt-1">{selected.title}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-ivory-muted hover:text-ivory p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 flex-1">
              <div className="flex items-center gap-2">
                <RatingIcon rating={selected.rating} />
                <span className="text-xs uppercase tracking-wider text-ivory-muted capitalize">{selected.rating}</span>
                <span className="text-gold/30">·</span>
                <select
                  value={selected.stage}
                  onChange={e => moveStage(selected.id, e.target.value as Stage)}
                  className="input-field text-xs py-1.5 flex-1"
                >
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>

              {selected.amount > 0 && (
                <div className="premium-stat">
                  <p className="premium-stat-label">Deal Value</p>
                  <p className="premium-stat-value">{formatINR(selected.amount)}</p>
                </div>
              )}

              <div className="space-y-3">
                {selected.company && (
                  <div className="flex items-center gap-3 text-sm text-ivory">
                    <Building2 className="w-4 h-4 text-gold-muted shrink-0" />{selected.company}
                  </div>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-sm text-gold-light hover:underline">
                    <Mail className="w-4 h-4 shrink-0" />{selected.email}
                  </a>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-sm text-ivory">
                    <Phone className="w-4 h-4 text-gold-muted shrink-0" />{selected.phone}
                  </a>
                )}
                <div className="flex items-center gap-3 text-sm text-ivory-muted">
                  <User className="w-4 h-4 shrink-0" />Source: {selected.source}
                </div>
                {isAdmin ? (
                  <div>
                    <label className="studio-kicker block mb-1.5">Owner</label>
                    <select
                      value={selected.ownerId}
                      onChange={e => reassignOwner(selected.id, e.target.value)}
                      className="input-field text-sm"
                    >
                      {assignees.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-ivory-muted">
                    <User className="w-4 h-4 shrink-0" />Owner: {ownerName(selected.ownerId)}
                  </div>
                )}
                {selected.nextFollowUp && (
                  <div className="flex items-center gap-3 text-sm text-ivory-muted">
                    <Calendar className="w-4 h-4 shrink-0" />
                    Follow-up: {format(new Date(selected.nextFollowUp), 'MMM d, yyyy')}
                  </div>
                )}
              </div>

              {selected.description && (
                <div>
                  <p className="studio-kicker mb-2">Notes</p>
                  <p className="text-sm text-ivory-muted leading-relaxed">{selected.description}</p>
                </div>
              )}

              <p className="text-[10px] text-ivory-muted/50 pt-4">
                Created {format(new Date(selected.createdAt), 'MMM d, yyyy')}
                {currentUser?.id === selected.ownerId ? '' : ' · Assigned'}
              </p>

              <button
                type="button"
                onClick={() => deleteLead(selected.id)}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors text-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : 'Delete Lead'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}