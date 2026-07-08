import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, Trash2, Zap } from 'lucide-react';
import { fetcher } from '../utils';

interface Webhook {
  id: string; url: string; events: string[]; secret: string; active: boolean;
}

const EVENTS = ['employee.created', 'employee.deactivated', 'leave.approved', 'payroll.processed', 'document.signed'];

export function IntegrationsSettings() {
  const qc = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const { data } = useQuery<{
    integrations: { googleSso: { enabled: boolean; clientId: string }; slack: { enabled: boolean; webhookUrl: string } };
    webhooks: Webhook[];
  }>({
    queryKey: ['integrations'],
    queryFn: () => fetcher('/api/integrations'),
  });

  const webhooks = data?.webhooks || [];

  useEffect(() => {
    const google = data?.integrations?.googleSso;
    if (google) {
      setGoogleClientId(google.clientId || '');
      setGoogleEnabled(google.enabled || false);
    }
  }, [data]);

  const saveGoogle = async () => {
    await fetcher('/api/integrations', {
      method: 'PATCH',
      body: JSON.stringify({ googleSso: { enabled: googleEnabled, clientId: googleClientId } }),
    });
    qc.invalidateQueries({ queryKey: ['integrations'] });
  };

  const addWebhook = async () => {
    if (!webhookUrl.trim()) return;
    await fetcher('/api/integrations/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url: webhookUrl, events: EVENTS }),
    });
    setWebhookUrl('');
    qc.invalidateQueries({ queryKey: ['integrations'] });
  };

  const testWebhooks = async () => {
    await fetcher('/api/integrations/webhooks/test', { method: 'POST' });
    alert('Test event sent to all active webhooks.');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Link2 className="w-4 h-4" /> Integrations Hub
      </h3>

      <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Google SSO</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Enable Google Workspace sign-in</span>
          <input type="checkbox" checked={googleEnabled} onChange={e => setGoogleEnabled(e.target.checked)} />
        </div>
        <input
          value={googleClientId}
          onChange={e => setGoogleClientId(e.target.value)}
          placeholder="Google OAuth Client ID"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button onClick={saveGoogle} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Save Google SSO</button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Outbound Webhooks</p>
        <div className="flex gap-2">
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={addWebhook} className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <button onClick={testWebhooks} className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
          <Zap className="w-3.5 h-3.5" /> Send test event
        </button>
        <div className="space-y-2">
          {webhooks.map(h => (
            <div key={h.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{h.url}</p>
                <p className="text-[10px] text-gray-400">{h.events.length} events · {h.secret.slice(0, 12)}…</p>
              </div>
              <button
                onClick={async () => {
                  await fetcher(`/api/integrations/webhooks/${h.id}`, { method: 'DELETE' });
                  qc.invalidateQueries({ queryKey: ['integrations'] });
                }}
                className="text-red-500 p-1"
              ><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {webhooks.length === 0 && <p className="text-xs text-gray-400">No webhooks configured. Connect Slack, Zapier, or custom endpoints.</p>}
        </div>
      </div>
    </div>
  );
}