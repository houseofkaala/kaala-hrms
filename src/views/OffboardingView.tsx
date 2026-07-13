import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, CheckCircle2, Circle, UserPlus } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';
import { ViewApiError } from '../components/ViewApiError';

interface OffTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  category: string;
}

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  status: string;
}

export function OffboardingView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const [selectedUser, setSelectedUser] = useState('');
  const [initiating, setInitiating] = useState(false);
  const [initMessage, setInitMessage] = useState('');

  const { data: tasks = [], isLoading, error, refetch } = useQuery<OffTask[]>({
    queryKey: ['offboarding'],
    queryFn: () => fetcher('/api/offboarding'),
  });

  const { data: employees = [] } = useQuery<EmployeeRow[]>({
    queryKey: ['employees-offboarding'],
    queryFn: () => fetcher('/api/employees'),
    enabled: isAdmin && currentUser?.role === 'admin',
  });

  const complete = async (id: string) => {
    await fetcher(`/api/offboarding/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed' }) });
    qc.invalidateQueries({ queryKey: ['offboarding'] });
  };

  const initiate = async () => {
    if (!selectedUser) return;
    setInitiating(true);
    setInitMessage('');
    try {
      await fetcher(`/api/offboarding/initiate/${selectedUser}`, { method: 'POST' });
      setInitMessage('Offboarding checklist created.');
      setSelectedUser('');
      qc.invalidateQueries({ queryKey: ['offboarding'] });
    } catch (e) {
      setInitMessage(e instanceof Error ? e.message : 'Failed to initiate offboarding');
    } finally {
      setInitiating(false);
    }
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

      {error && (
        <ViewApiError
          message={error instanceof Error ? error.message : 'Could not load offboarding tasks'}
          onRetry={() => refetch()}
        />
      )}

      {currentUser?.role === 'admin' && (
        <div className="studio-card p-6 space-y-3">
          <h3 className="text-sm font-semibold text-ivory flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Start offboarding
          </h3>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="border border-gold/20 bg-charcoal rounded-lg px-3 py-2 text-sm text-ivory min-w-[220px]"
            >
              <option value="">Select employee</option>
              {employees.filter(e => e.status === 'Active').map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={initiate}
              disabled={!selectedUser || initiating}
              className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
            >
              {initiating ? 'Creating…' : 'Create exit checklist'}
            </button>
          </div>
          {initMessage && <p className="text-xs text-ivory-muted">{initMessage}</p>}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ivory-muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="studio-card p-12 text-center">
          <p className="text-ivory-muted">No offboarding tasks yet.</p>
          {currentUser?.role === 'admin' && (
            <p className="text-xs text-ivory-muted/70 mt-2">Select an employee above to generate their exit checklist.</p>
          )}
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