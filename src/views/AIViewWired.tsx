import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Send } from 'lucide-react';
import { fetcher } from '../utils';

interface AiMessage { id: string; role: 'user' | 'assistant'; content: string }

export function AIViewWired() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const { data: history = [] } = useQuery<AiMessage[]>({
    queryKey: ['ai-history'],
    queryFn: () => fetcher('/api/ai/history'),
  });

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      await fetcher('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: input }) });
      setInput('');
      qc.invalidateQueries({ queryKey: ['ai-history'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-[700px] overflow-hidden max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
        <h2 className="font-semibold text-gray-900">Kaala Assistant</h2>
      </div>
      <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 bg-gray-50/50">
        {history.length === 0 && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-1"><Sparkles className="w-4 h-4" /></div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm text-sm text-gray-700 leading-relaxed max-w-[85%]">
              <p>Hello! I am the Kaala AI Assistant. Ask me about leave balance, payroll, attendance, or rewards.</p>
            </div>
          </div>
        )}
        {history.map(m => (
          <div key={m.id} className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>}
            <div className={`p-5 rounded-2xl shadow-sm text-sm leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-gray-900 text-white rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm text-gray-700'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="relative flex items-center max-w-3xl mx-auto">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} type="text" placeholder="Message Kaala Assistant..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-6 pr-14 py-3.5 text-sm outline-none focus:border-gray-400 focus:bg-white shadow-sm" />
          <button onClick={send} disabled={loading} className="absolute right-1.5 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 shadow-sm disabled:opacity-50"><Send className="w-4 h-4 ml-0.5" /></button>
        </div>
      </div>
    </div>
  );
}