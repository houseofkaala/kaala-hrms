import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, CheckCircle2, Circle } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface OffTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  category: string;
}

export function OffboardingView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const { data: tasks = [], isLoading } = useQuery<OffTask[]>({
    queryKey: ['offboarding'],
    queryFn: () => fetcher('/api/offboarding'),
  });

  const complete = async (id: string) => {
    await fetcher(`/api/offboarding/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed' }) });
    qc.invalidateQueries({ queryKey: ['offboarding'] });
  };

  const pending = tasks.filter(t => t.status !== 'Completed');
  const done = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
          <LogOut className="w-6 h-6 text-gold-light" />
        </div>
        <div>
          <h2 className="font-display text-xl text-ivory">Offboarding</h2>
          <p className="text-sm text-ivory-muted mt-1">
            {isAdmin ? 'Manage exit checklists for departing employees' : 'Your exit checklist and handover tasks'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-ivory-muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="studio-card p-12 text-center">
          <p className="text-ivory-muted">No offboarding tasks. Tasks are created when an employee is deactivated.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="studio-kicker">Pending ({pending.length})</h3>
              {pending.map(t => (
                <div key={t.id} className="studio-card p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Circle className="w-5 h-5 text-gold-muted mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-ivory">{t.title}</p>
                      <p className="text-xs text-ivory-muted mt-1">{t.category} · Due {t.dueDate}</p>
                    </div>
                  </div>
                  <button onClick={() => complete(t.id)} className="btn-secondary text-xs shrink-0">Mark done</button>
                </div>
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <h3 className="studio-kicker">Completed ({done.length})</h3>
              {done.map(t => (
                <div key={t.id} className="studio-card p-5 flex items-center gap-3 opacity-70">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-ivory line-through">{t.title}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}