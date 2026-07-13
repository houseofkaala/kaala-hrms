import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Bell, Shield, Clock, Zap, Play } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';
import { EmailNotificationsSettings } from './EmailNotificationsSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { AppearanceSettingsCard } from '../components/ThemeToggle';
import { ChatModerationSettings } from '../components/ChatModerationSettings';

interface OrgSettings {
  companyName: string;
  timezone: string;
  workWeekStart: string;
  defaultLeaveDays: number;
  marketplacePenalty: number;
  fridayScanTime: string;
  notificationsEnabled: boolean;
  twoFactorRequired: boolean;
}

export function SettingsView() {
  const { currentUser } = useRBACStore();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [automationRunning, setAutomationRunning] = useState(false);

  const { data: automations, refetch: refetchAutomations } = useQuery<{
    logs: { id: string; rule: string; message: string; ranAt: string; affected: number }[];
  }>({
    queryKey: ['automations'],
    queryFn: () => fetcher('/api/automations'),
    enabled: currentUser?.role === 'admin',
  });

  const runAutomations = async () => {
    setAutomationRunning(true);
    try {
      await fetcher('/api/automations/run', { method: 'POST' });
      refetchAutomations();
    } finally {
      setAutomationRunning(false);
    }
  };

  const { data: settings, isLoading } = useQuery<OrgSettings>({
    queryKey: ['settings'],
    queryFn: () => fetcher('/api/settings'),
    enabled: currentUser?.role === 'manager' || currentUser?.role === 'admin',
  });

  const [form, setForm] = useState<OrgSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!form || currentUser?.role !== 'admin') return;
    await fetcher('/api/settings', { method: 'PATCH', body: JSON.stringify(form) });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [empNotif, setEmpNotif] = useState(true);
  const [empTz, setEmpTz] = useState('Asia/Kolkata');
  const [empSaved, setEmpSaved] = useState(false);

  const isPersonalSettings =
    currentUser?.role === 'employee' ||
    currentUser?.role === 'sales' ||
    currentUser?.role === 'executive_assistant';

  const { data: me } = useQuery<{ preferences?: { emailNotifications?: boolean; timezone?: string } }>({
    queryKey: ['me'],
    queryFn: () => fetcher('/api/me'),
    enabled: isPersonalSettings,
  });

  useEffect(() => {
    if (me?.preferences) {
      if (me.preferences.emailNotifications !== undefined) setEmpNotif(me.preferences.emailNotifications);
      if (me.preferences.timezone) setEmpTz(me.preferences.timezone);
    }
  }, [me]);

  const saveEmployeePrefs = async () => {
    await fetcher('/api/me', {
      method: 'PATCH',
      body: JSON.stringify({ preferences: { emailNotifications: empNotif, timezone: empTz } }),
    });
    setEmpSaved(true);
    setTimeout(() => setEmpSaved(false), 2000);
  };

  if (isPersonalSettings) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Personal preferences</p>
        </div>
        <AppearanceSettingsCard />
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Email notifications</span>
            </div>
            <input type="checkbox" checked={empNotif} onChange={e => setEmpNotif(e.target.checked)} className="w-4 h-4" />
          </div>
          <p className="text-xs text-gray-500 -mt-2">When enabled, you receive emails for important HR events (leave, payroll, security). Routine updates stay in the app only.</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Timezone</span>
            </div>
            <select value={empTz} onChange={e => setEmpTz(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
          <button onClick={saveEmployeePrefs} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800">
            {empSaved ? 'Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !form) {
    return <p className="text-gray-500 text-sm">Loading settings...</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Organization and system configuration</p>
      </div>

      <AppearanceSettingsCard />

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Organization
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Company Name</label>
            <input
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
              disabled={currentUser?.role !== 'admin'}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => setForm({ ...form, timezone: e.target.value })}
              disabled={currentUser?.role !== 'admin'}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option>Asia/Kolkata</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Default Leave Days</label>
            <input
              type="number"
              value={form.defaultLeaveDays}
              onChange={e => setForm({ ...form, defaultLeaveDays: +e.target.value })}
              disabled={currentUser?.role !== 'admin'}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Marketplace Penalty (KP)</label>
            <input
              type="number"
              value={form.marketplacePenalty}
              onChange={e => setForm({ ...form, marketplacePenalty: +e.target.value })}
              disabled={currentUser?.role !== 'admin'}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pt-4 border-t border-gray-100">
          <Shield className="w-4 h-4" /> Security
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Require two-factor authentication</span>
          <input
            type="checkbox"
            checked={form.twoFactorRequired}
            onChange={e => setForm({ ...form, twoFactorRequired: e.target.checked })}
            disabled={currentUser?.role !== 'admin'}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Enable system notifications</span>
          <input
            type="checkbox"
            checked={form.notificationsEnabled}
            onChange={e => setForm({ ...form, notificationsEnabled: e.target.checked })}
            disabled={currentUser?.role !== 'admin'}
          />
        </div>

        {currentUser?.role === 'admin' && (
          <button onClick={handleSave} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800">
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        )}
      </div>

      {currentUser?.role === 'admin' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4" /> HR Automations
            </h3>
            <button
              onClick={runAutomations}
              disabled={automationRunning}
              className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {automationRunning ? 'Running…' : 'Run now'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Automated reminders for pending leave, attendance, low performance scores, and project deadlines. Runs every 6 hours.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(automations?.logs || []).length === 0 ? (
              <p className="text-sm text-gray-400">No automation runs yet.</p>
            ) : (
              automations?.logs.map(log => (
                <div key={log.id} className="text-sm border-b border-gray-50 pb-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-800 capitalize">{log.rule.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400 shrink-0">{new Date(log.ranAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{log.message} · {log.affected} affected</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentUser?.role === 'admin' && <ChatModerationSettings />}
      {currentUser?.role === 'admin' && <IntegrationsSettings />}
      {currentUser?.role === 'admin' && <EmailNotificationsSettings />}
    </div>
  );
}