import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Shield, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Policy {
  id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  category: string;
  requiresAck?: boolean;
}

export function PoliciesView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'HR' });

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => fetcher('/api/policies'),
  });

  const { data: acks = [] } = useQuery<{ policyId: string }[]>({
    queryKey: ['policy-acks'],
    queryFn: () => fetcher('/api/policies/acknowledgments'),
  });

  const acked = new Set(acks.map(a => a.policyId));

  const acknowledge = async (policyId: string) => {
    await fetcher(`/api/policies/${policyId}/acknowledge`, { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['policy-acks'] });
  };

  const createPolicy = async () => {
    await fetcher('/api/policies', { method: 'POST', body: JSON.stringify({ ...form, requiresAck: true }) });
    qc.invalidateQueries({ queryKey: ['policies'] });
    setForm({ title: '', description: '', category: 'HR' });
    setShowForm(false);
  };

  const categories = [...new Set(policies.map(p => p.category))];
  const pendingAck = policies.filter(p => p.requiresAck && !acked.has(p.id)).length;

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ivory">Company Policies</h2>
          <p className="text-sm text-ivory-muted mt-1">
            HR policies, compliance guidelines{pendingAck > 0 ? ` · ${pendingAck} pending acknowledgment` : ''}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Policy
          </button>
        )}
      </div>

      {showForm && (
        <div className="studio-card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Policy title" className="input-field" />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
            <option>HR</option><option>Attendance</option><option>Finance</option><option>Remote Work</option><option>Security</option>
          </select>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Policy description" className="input-field md:col-span-2 min-h-[80px]" />
          <button onClick={createPolicy} className="btn-primary md:col-span-2">Publish policy</button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ivory-muted">Loading policies…</p>
      ) : (
        categories.map(cat => (
          <div key={cat} className="space-y-3">
            <h3 className="studio-kicker px-1">{cat}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.filter(p => p.category === cat).map(policy => {
                const name = policy.name || policy.title || 'Policy';
                const isAcked = acked.has(policy.id);
                return (
                  <div key={policy.id} className="studio-card p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {policy.status === 'Active' ? <Shield className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                        <h4 className="font-medium text-ivory">{name}</h4>
                      </div>
                      <span className="studio-chip text-[10px]">{policy.status}</span>
                    </div>
                    <p className="text-sm text-ivory-muted leading-relaxed">{policy.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-ivory-muted/50 flex items-center gap-1"><FileText className="w-3 h-3" />{policy.id}</span>
                      {policy.requiresAck && (
                        isAcked ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Acknowledged</span>
                        ) : (
                          <button onClick={() => acknowledge(policy.id)} className="btn-secondary text-[10px] py-1 px-2">I acknowledge</button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}