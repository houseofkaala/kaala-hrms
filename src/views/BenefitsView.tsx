import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Shield, Plus, CheckCircle2 } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';
import { useState } from 'react';

interface BenefitPlan {
  id: string; name: string; type: string; provider: string; description: string;
  employerContribution: number; employeeContribution: number; status: string; enrollmentOpen: boolean;
}
interface Enrollment {
  id: string; planId: string; status: string; enrolledAt: string; plan?: BenefitPlan;
}

const TYPE_ICON: Record<string, typeof Heart> = {
  health: Heart, life: Shield, pf: Shield, nps: Shield,
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function BenefitsView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'health', provider: '', description: '', employerContribution: 0, employeeContribution: 0 });

  const { data: plans = [] } = useQuery<BenefitPlan[]>({
    queryKey: ['benefit-plans'],
    queryFn: () => fetcher('/api/benefits/plans'),
  });

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ['benefit-enrollments'],
    queryFn: () => fetcher('/api/benefits/enrollments'),
  });

  const enrolledIds = new Set(enrollments.map(e => e.planId));

  const enroll = async (planId: string) => {
    await fetcher('/api/benefits/enroll', { method: 'POST', body: JSON.stringify({ planId }) });
    qc.invalidateQueries({ queryKey: ['benefit-enrollments'] });
  };

  const createPlan = async () => {
    await fetcher('/api/benefits/plans', { method: 'POST', body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ['benefit-plans'] });
    setShowForm(false);
    setForm({ name: '', type: 'health', provider: '', description: '', employerContribution: 0, employeeContribution: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ivory">Benefits</h2>
          <p className="text-sm text-ivory-muted mt-1">Health, life insurance, PF, NPS & wellness programs</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        )}
      </div>

      {showForm && (
        <div className="studio-card p-5 grid grid-cols-2 gap-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Plan name" className="input-field" />
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
            <option value="health">Health</option><option value="life">Life</option><option value="pf">PF</option><option value="nps">NPS</option>
          </select>
          <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="Provider" className="input-field" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="input-field col-span-2" />
          <button onClick={createPlan} className="btn-primary col-span-2">Create plan</button>
        </div>
      )}

      {enrollments.length > 0 && (
        <div className="space-y-3">
          <h3 className="studio-kicker">My Enrollments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map(e => (
              <div key={e.id} className="studio-card p-5 flex items-center gap-3 border-gold/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-medium text-ivory">{e.plan?.name || 'Plan'}</p>
                  <p className="text-xs text-ivory-muted">Enrolled {new Date(e.enrolledAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(plan => {
          const Icon = TYPE_ICON[plan.type] || Heart;
          const enrolled = enrolledIds.has(plan.id);
          return (
            <div key={plan.id} className="studio-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-gold-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-ivory">{plan.name}</h3>
                  <p className="text-xs text-gold-muted mt-0.5">{plan.provider} · {plan.type.toUpperCase()}</p>
                  <p className="text-sm text-ivory-muted mt-2 leading-relaxed">{plan.description}</p>
                  <div className="flex gap-4 mt-3 text-xs text-ivory-muted">
                    <span>Employer: {fmt(plan.employerContribution)}/yr</span>
                    {plan.employeeContribution > 0 && <span>You: {fmt(plan.employeeContribution)}/yr</span>}
                  </div>
                  {enrolled ? (
                    <span className="inline-flex items-center gap-1 mt-4 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Enrolled</span>
                  ) : plan.enrollmentOpen ? (
                    <button onClick={() => enroll(plan.id)} className="btn-primary text-xs mt-4">Enroll now</button>
                  ) : (
                    <span className="text-xs text-ivory-muted mt-4 block">Enrollment closed</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}