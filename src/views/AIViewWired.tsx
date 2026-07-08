import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Send } from 'lucide-react';
import { fetcher } from '../utils';

interface AiMessage { id: string; role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is my leave balance?',
  'Am I checked in today?',
  'How many Kaala Points do I have?',
  'What are the company policies?',
];

export function AIViewWired() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const { data: history = [] } = useQuery<AiMessage[]>({
    queryKey: ['ai-history'],
    queryFn: () => fetcher('/api/ai/history'),
  });

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setLoading(true);
    setError('');
    try {
      await fetcher('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message }) });
      setInput('');
      await qc.invalidateQueries({ queryKey: ['ai-history'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get a response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col view-panel-height overflow-hidden max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-maroon-50 to-white flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-maroon-900 text-white flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
        <div>
          <h2 className="font-semibold text-gray-900">HR Assistant</h2>
          <p className="text-xs text-gray-500">Ask about leave, attendance, payroll, holidays, or rewards</p>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-gray-50/50">
        {history.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-maroon-900 text-white flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>
              <div className="bg-white border border-gray-200 p-4 rounded-xl text-sm text-gray-700 leading-relaxed max-w-[90%]">
                <p>Namaste! I am your HR assistant. I can help with leave balance, attendance, payslips, Kaala Points, holidays, and company policies.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-11">
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-maroon-200 text-maroon-800 hover:bg-maroon-50 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map(m => (
          <div key={m.id} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-maroon-900 text-white flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>}
            <div className={`p-4 rounded-xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-maroon-900 text-white rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm text-gray-700'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 pl-11">
            <span className="w-2 h-2 rounded-full bg-maroon-400 animate-pulse" />
            Thinking…
          </div>
        )}
      </div>
      {error && <p className="px-6 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">{error}</p>}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="relative flex items-center max-w-3xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
            type="text"
            placeholder="Type your question here…"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-14 py-3 text-sm outline-none focus:border-maroon-400 focus:bg-white"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="absolute right-2 w-9 h-9 rounded-lg bg-maroon-900 text-white flex items-center justify-center hover:bg-maroon-950 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}