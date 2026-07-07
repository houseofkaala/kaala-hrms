import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetcher } from '../utils';

type NotifyRole = 'employee' | 'manager' | 'admin';
type TriggerDef = {
  id: string;
  label: string;
  description: string;
  category: string;
  categoryLabel: string;
  priority: string;
  emailDefault: boolean;
  roles: NotifyRole[];
};
type EmailConfig = {
  enabled: boolean;
  fromName: string;
  triggers: Record<string, { enabled?: boolean; roles?: Partial<Record<NotifyRole, boolean>> }>;
  digests: Record<string, boolean>;
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical — immediate',
  important: 'Important',
  reminder: 'Reminder',
  digest: 'Digest only',
};

const ROLE_LABELS: Record<NotifyRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin',
};

export function EmailNotificationsSettings() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ digests: true });

  const { data, isLoading } = useQuery<{
    triggers: TriggerDef[];
    categories: { id: string; label: string }[];
    config: EmailConfig;
    smtpConfigured: boolean;
  }>({
    queryKey: ['email-triggers'],
    queryFn: () => fetcher('/api/settings/email-triggers'),
  });

  const [config, setConfig] = useState<EmailConfig | null>(null);

  useEffect(() => {
    if (data?.config) setConfig(data.config);
  }, [data]);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateTrigger = (id: string, patch: Partial<EmailConfig['triggers'][string]>) => {
    if (!config) return;
    setConfig({
      ...config,
      triggers: {
        ...config.triggers,
        [id]: { ...config.triggers[id], ...patch },
      },
    });
  };

  const toggleRole = (triggerId: string, role: NotifyRole) => {
    if (!config) return;
    const current = config.triggers[triggerId]?.roles?.[role] ?? true;
    updateTrigger(triggerId, {
      roles: { ...config.triggers[triggerId]?.roles, [role]: !current },
    });
  };

  const save = async () => {
    if (!config) return;
    await fetcher('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ emailNotifications: config }),
    });
    qc.invalidateQueries({ queryKey: ['email-triggers'] });
    qc.invalidateQueries({ queryKey: ['settings'] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sendTest = async () => {
    setTestMsg('');
    try {
      const res = await fetcher<{ message: string }>('/api/admin/email/test', { method: 'POST', body: '{}' });
      setTestMsg(res.message);
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : 'Test failed');
    }
  };

  if (isLoading || !config || !data) {
    return <p className="text-sm text-gray-500">Loading email settings…</p>;
  }

  const byCategory = data.categories.map(cat => ({
    ...cat,
    triggers: data.triggers.filter(t => t.category === cat.id),
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email Notifications
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Routine updates stay in-app. Email is sent only for important or time-sensitive events you enable below.
            Each trigger can be toggled globally and per role.
          </p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full shrink-0 ${data.smtpConfigured ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
          {data.smtpConfigured ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {data.smtpConfigured ? 'SMTP configured' : 'SMTP not configured — add env vars on server'}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <span className="text-sm font-medium text-gray-900">Enable email notifications</span>
          <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Sender name</label>
          <input
            value={config.fromName}
            onChange={e => setConfig({ ...config, fromName: e.target.value })}
            className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Digest emails</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(config.digests).map(([key, val]) => (
            <label key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg text-sm">
              <span className="text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <input
                type="checkbox"
                checked={val}
                onChange={e => setConfig({ ...config, digests: { ...config.digests, [key]: e.target.checked } })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event triggers ({data.triggers.length})</p>
        {byCategory.map(cat => (
          <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              <span>{cat.label} ({cat.triggers.length})</span>
              {openCategories[cat.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {openCategories[cat.id] && (
              <div className="divide-y divide-gray-50">
                {cat.triggers.map(tr => {
                  const tc = config.triggers[tr.id] || { enabled: tr.emailDefault };
                  return (
                    <div key={tr.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{tr.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{tr.description}</p>
                          <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-maroon-700 bg-maroon-50 px-2 py-0.5 rounded">
                            {PRIORITY_LABELS[tr.priority] || tr.priority}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={tc.enabled ?? tr.emailDefault}
                          onChange={e => updateTrigger(tr.id, { enabled: e.target.checked })}
                          className="shrink-0 mt-1"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {tr.roles.map(role => (
                          <label key={role} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={tc.roles?.[role] !== false}
                              onChange={() => toggleRole(tr.id, role)}
                            />
                            {ROLE_LABELS[role]}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
        <button onClick={save} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800">
          {saved ? 'Saved!' : 'Save email settings'}
        </button>
        <button onClick={sendTest} className="border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          Send test email
        </button>
        {testMsg && <span className="text-xs text-gray-600">{testMsg}</span>}
      </div>
    </div>
  );
}