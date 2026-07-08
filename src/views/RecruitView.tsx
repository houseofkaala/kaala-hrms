import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase, Users, Mail, Phone } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Candidate {
  id: string; name: string; role: string; stage: string;
  email?: string; phone?: string; jobId?: string; notes?: string; source?: string;
}
interface Job {
  id: string; title: string; department: string; location: string; type: string; status: string; description: string;
}

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const;

export function RecruitView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pipeline' | 'jobs'>('pipeline');
  const [showForm, setShowForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '', source: 'LinkedIn', jobId: '' });
  const [jobForm, setJobForm] = useState({ title: '', department: '', location: 'Bangalore', type: 'Full-time', description: '' });
  const [selected, setSelected] = useState<Candidate | null>(null);

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: () => fetcher('/api/recruit/candidates'),
  });
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['recruit-jobs'],
    queryFn: () => fetcher('/api/recruit/jobs'),
  });

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const addCandidate = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/recruit/candidates', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    qc.invalidateQueries({ queryKey: ['candidates'] });
    setForm({ name: '', role: '', email: '', phone: '', source: 'LinkedIn', jobId: '' });
    setShowForm(false);
  };

  const addJob = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/recruit/jobs', { method: 'POST', body: JSON.stringify(jobForm) });
    qc.invalidateQueries({ queryKey: ['recruit-jobs'] });
    setJobForm({ title: '', department: '', location: 'Bangalore', type: 'Full-time', description: '' });
    setShowJobForm(false);
  };

  const moveStage = async (id: string, stage: string) => {
    if (stage === 'Hired') {
      const userId = prompt('Enter new employee user ID for onboarding (or leave blank):') || 'pending';
      await fetcher(`/api/recruit/candidates/${id}/hire`, { method: 'POST', body: JSON.stringify({ userId }) });
    } else {
      await fetcher(`/api/recruit/candidates/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
    }
    qc.invalidateQueries({ queryKey: ['candidates'] });
    setSelected(null);
  };

  const nextStage = (stage: string) => {
    const idx = STAGES.indexOf(stage as typeof STAGES[number]);
    return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 view-panel-height flex flex-col">
      <div className="studio-card px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ivory">Recruitment ATS</h2>
          <p className="text-sm text-ivory-muted mt-1">{candidates.length} candidates · {jobs.filter(j => j.status === 'Open').length} open positions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab('pipeline')} className={tab === 'pipeline' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>Pipeline</button>
          <button onClick={() => setTab('jobs')} className={tab === 'jobs' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>Job Postings</button>
          {isManager && tab === 'pipeline' && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Candidate
            </button>
          )}
          {isManager && tab === 'jobs' && (
            <button onClick={() => setShowJobForm(!showJobForm)} className="btn-primary text-xs flex items-center gap-1">
              <Plus className="w-4 h-4" /> Post Job
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={addCandidate} className="studio-card p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="input-field" />
          <input required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Role applied" className="input-field" />
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="input-field" />
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="input-field" />
          <select value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))} className="input-field">
            <option value="">— Job posting —</option>
            {jobs.filter(j => j.status === 'Open').map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <button type="submit" className="btn-primary">Add to pipeline</button>
        </form>
      )}

      {showJobForm && (
        <form onSubmit={addJob} className="studio-card p-4 grid grid-cols-2 gap-3">
          <input required value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="Job title" className="input-field" />
          <input required value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} placeholder="Department" className="input-field" />
          <input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="input-field" />
          <select value={jobForm.type} onChange={e => setJobForm(f => ({ ...f, type: e.target.value }))} className="input-field">
            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
          </select>
          <textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Job description" className="input-field col-span-2 min-h-[80px]" />
          <button type="submit" className="btn-primary col-span-2">Publish job</button>
        </form>
      )}

      {tab === 'jobs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {jobs.map(j => (
            <div key={j.id} className="studio-card p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-ivory">{j.title}</h3>
                <span className="studio-chip text-[10px]">{j.status}</span>
              </div>
              <p className="text-xs text-ivory-muted mt-2">{j.department} · {j.location} · {j.type}</p>
              <p className="text-sm text-ivory-muted mt-3 leading-relaxed">{j.description || 'No description'}</p>
              <p className="text-[10px] text-gold-muted mt-3">{candidates.filter(c => c.jobId === j.id).length} applicants</p>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-ivory-muted col-span-2 text-center py-12">No job postings yet.</p>}
        </div>
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4 table-scroll -mx-1 px-1">
          {STAGES.map(stage => (
            <div key={stage} className="studio-card min-w-[260px] sm:min-w-[280px] flex flex-col p-3 gap-3 shrink-0">
              <h3 className="text-xs font-semibold text-ivory-muted uppercase tracking-wider px-1">{stage}</h3>
              {candidates.filter(c => c.stage === stage || (stage === 'Applied' && !STAGES.includes(c.stage as typeof STAGES[number]))).map(c => (
                <div key={c.id} onClick={() => setSelected(c)} className="studio-card p-4 cursor-pointer hover:border-gold/30 transition-colors">
                  <p className="font-medium text-ivory">{c.name}</p>
                  <p className="text-[11px] text-ivory-muted flex items-center gap-1 mt-1"><Briefcase className="w-3 h-3" />{c.role}</p>
                  {c.email && <p className="text-[10px] text-ivory-muted/70 mt-1">{c.email}</p>}
                  {isManager && nextStage(c.stage) && (
                    <button onClick={e => { e.stopPropagation(); moveStage(c.id, nextStage(c.stage)!); }} className="mt-2 text-[10px] text-gold-light font-semibold hover:underline">
                      → {nextStage(c.stage)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="studio-card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-ivory">{selected.name}</h3>
            <p className="text-sm text-ivory-muted">{selected.role} · {selected.stage}</p>
            <div className="mt-4 space-y-2 text-sm text-ivory-muted">
              {selected.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{selected.email}</p>}
              {selected.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{selected.phone}</p>}
              {selected.source && <p>Source: {selected.source}</p>}
              {selected.notes && <p>{selected.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}