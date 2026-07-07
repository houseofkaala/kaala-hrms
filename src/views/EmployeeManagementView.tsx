import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';
import { getPortalLoginUrl } from '../portal';
import { UserPlus, Search, Mail, Phone, Building2, Copy, Check, KeyRound, ExternalLink, Sparkles, UserMinus } from 'lucide-react';

type Employee = {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  role: string;
  phone?: string;
  joinDate?: string;
  employmentType?: string;
  managerId?: string;
};

type OnboardResult = {
  employee: Employee;
  access: {
    email: string;
    loginUrl: string;
    portal: string;
    message: string;
  };
  tempPassword?: string;
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  title: '',
  department: '',
  role: 'employee',
  phone: '',
  joinDate: new Date().toISOString().slice(0, 10),
  employmentType: 'full-time',
  emergencyContact: '',
  address: '',
  managerId: '',
};

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
  let p = '';
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export function EmployeeManagementView() {
  const { currentUser: user } = useRBACStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [onboarded, setOnboarded] = useState<OnboardResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetResult, setResetResult] = useState<{ email: string; password: string; loginUrl: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetcher<Employee[]>('/api/employees'),
    enabled: isAdmin,
  });

  const managers = employees.filter((e) => e.role === 'manager' || e.role === 'admin');

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      fetcher<OnboardResult>('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          managerId: body.managerId || undefined,
          emergencyContact: body.emergencyContact || undefined,
          address: body.address || undefined,
          phone: body.phone || undefined,
        }),
      }),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setOnboarded({ ...data, tempPassword: variables.password });
      setShowForm(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      fetcher<{ success: boolean }>(`/api/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setRemoveTarget(null);
      setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      fetcher<{ email: string; password: string; loginUrl: string }>(`/api/employees/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: (data) => {
      setResetResult(data);
      setNewPassword('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const copyInvite = async () => {
    if (!onboarded) return;
    const text = `House of Kaala HRMS — Your account is ready

Name: ${onboarded.employee.name}
Email: ${onboarded.access.email}
Temporary password: ${onboarded.tempPassword ?? '(ask your admin)'}
Sign in: ${onboarded.access.loginUrl}

Please change your password after first login in Settings.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim() || !form.password || form.password.length < 8) {
      setFormError('Name, email, and password (8+ characters) are required.');
      return;
    }
    createMutation.mutate(form);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        Only admins and managers can manage employees.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success banner after onboarding */}
      {onboarded && (
        <div className="card p-6 border-2 border-[var(--accent)] bg-[var(--accent-soft)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl text-[var(--text)] mb-1">
                {onboarded.employee.name} is ready to use HRMS
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">{onboarded.access.message}</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-white/80 rounded-lg px-4 py-3 border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-xs uppercase tracking-wide mb-1">Login email</span>
                  <span className="font-medium text-[var(--text)]">{onboarded.access.email}</span>
                </div>
                <div className="bg-white/80 rounded-lg px-4 py-3 border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-xs uppercase tracking-wide mb-1">Employee portal</span>
                  <a
                    href={onboarded.access.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                  >
                    {onboarded.access.loginUrl.replace('https://', '')}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              {onboarded.tempPassword && (
                <div className="bg-white/80 rounded-lg px-4 py-3 border border-[var(--border)] text-sm mb-3">
                  <span className="text-[var(--text-muted)] block text-xs uppercase tracking-wide mb-1">Temporary password</span>
                  <span className="font-mono font-medium text-[var(--text)]">{onboarded.tempPassword}</span>
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Share these credentials with {onboarded.employee.name} securely (WhatsApp, in person, etc.).
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyInvite} className="btn-secondary text-sm inline-flex items-center gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy invite details'}
                </button>
                <a href={onboarded.access.loginUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm inline-flex items-center gap-2">
                  Open employee login <ExternalLink className="w-4 h-4" />
                </a>
                <button type="button" onClick={() => setOnboarded(null)} className="btn-ghost text-sm">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-[var(--text)]">Employees</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Add team members and share login details for the employee portal at{' '}
            <a href={getPortalLoginUrl('employee')} className="text-[var(--accent)] hover:underline" target="_blank" rel="noreferrer">
              {getPortalLoginUrl('employee').replace('https://', '')}
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setFormError('');
            if (!showForm) setForm({ ...emptyForm, password: generatePassword() });
          }}
          className="btn-primary inline-flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add employee
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 border-2 border-[var(--border)]">
          <h3 className="font-display text-lg text-[var(--text)]">New team member</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Full name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Employee full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Work email *</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="employee@bymarketingonly.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Temporary password *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 font-mono text-sm"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                  className="btn-secondary shrink-0 text-sm"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Share this securely with the employee</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Job title</label>
              <input
                className="input-field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Department</label>
              <input
                className="input-field"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Department name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Join date</label>
              <input
                type="date"
                className="input-field"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Employment type</label>
              <select
                className="input-field"
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Reports to</label>
              <select
                className="input-field"
                value={form.managerId}
                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              >
                <option value="">— Default manager —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">System role</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="employee">Employee (employee portal)</option>
                <option value="manager">Manager (admin portal)</option>
                <option value="admin">Admin (admin portal)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Emergency contact</label>
              <input
                className="input-field"
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                placeholder="Name & phone"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Address</label>
              <input
                className="input-field"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="City, state"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating account…' : 'Create & enable login'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Remove employee modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRemoveTarget(null)}>
          <div className="card p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-2">Remove {removeTarget.name}?</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              This deactivates their account. They will no longer be able to sign in to HRMS.
            </p>
            {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 bg-red-700 hover:bg-red-800"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(removeTarget.id)}
              >
                {removeMutation.isPending ? 'Removing…' : 'Remove employee'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setRemoveTarget(null); setFormError(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setResetTarget(null); setResetResult(null); }}>
          <div className="card p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-2">Reset password — {resetTarget.name}</h3>
            {resetResult ? (
              <div className="space-y-3">
                <p className="text-sm text-green-700">Password updated. Share with the employee:</p>
                <div className="bg-[var(--bg-muted)] rounded-lg p-3 font-mono text-sm break-all">{resetResult.password}</div>
                <a href={resetResult.loginUrl} className="text-sm text-[var(--accent)] hover:underline block">{resetResult.loginUrl}</a>
                <button type="button" className="btn-primary w-full" onClick={() => { setResetTarget(null); setResetResult(null); }}>Done</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] mb-4">Set a new temporary password (8+ characters).</p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className="input-field flex-1 font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <button type="button" className="btn-secondary" onClick={() => setNewPassword(generatePassword())}>Generate</button>
                </div>
                {formError && <p className="text-sm text-red-600 mb-2">{formError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={newPassword.length < 8 || resetMutation.isPending}
                    onClick={() => resetMutation.mutate({ id: resetTarget.id, password: newPassword })}
                  >
                    {resetMutation.isPending ? 'Saving…' : 'Reset password'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setResetTarget(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="search"
          placeholder="Search by name, email, or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-[var(--text-muted)]">Loading team…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <div key={emp.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-display text-lg shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--text)] truncate">{emp.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] truncate">{emp.title || '—'}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-muted)] text-[var(--text-muted)] capitalize">
                    {emp.role}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    {emp.phone}
                  </div>
                )}
                {emp.department && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 shrink-0" />
                    {emp.department}
                  </div>
                )}
              </div>
              {user?.role === 'admin' && emp.id !== user.id && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { setResetTarget(emp); setFormError(''); setResetResult(null); setNewPassword(generatePassword()); }}
                    className="w-full btn-secondary text-sm inline-flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRemoveTarget(emp); setFormError(''); }}
                    className="w-full btn-ghost text-sm inline-flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserMinus className="w-4 h-4" />
                    Remove employee
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="card p-12 text-center text-[var(--text-muted)]">
          {search ? 'No employees match your search.' : 'No employees yet. Add your first team member above.'}
        </div>
      )}
    </div>
  );
}