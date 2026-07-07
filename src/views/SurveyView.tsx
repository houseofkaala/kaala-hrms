import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, X } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Survey { id: string; title: string; description: string; dueIn: string; responses: string[] }

export function SurveyView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: surveys = [], isError } = useQuery<Survey[]>({
    queryKey: ['surveys'],
    queryFn: () => fetcher('/api/surveys'),
  });

  const active = surveys.find(s => s.id === activeId);

  const submit = async () => {
    if (!activeId || !feedback.trim()) {
      setError('Please share your feedback before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await fetcher(`/api/surveys/${activeId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ rating, feedback: feedback.trim() }),
      });
      qc.invalidateQueries({ queryKey: ['surveys'] });
      setActiveId(null);
      setFeedback('');
      setRating(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6">
        <h2 className="font-display text-xl font-semibold text-maroon-950">Surveys</h2>
        <p className="text-sm text-maroon-600/70 mt-1">Share anonymous feedback to help improve the workplace.</p>
      </div>

      {isError && <p className="text-sm text-red-600">Could not load surveys.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map(s => {
          const done = currentUser && s.responses.includes(currentUser.id);
          return (
            <div key={s.id} className="studio-card p-6">
              <div className="w-10 h-10 rounded-full bg-maroon-50 border border-maroon-100 flex items-center justify-center mb-4">
                <FileText className="w-4 h-4 text-maroon-500" />
              </div>
              <h3 className="font-semibold text-maroon-950 mb-2">{s.title}</h3>
              <p className="text-sm text-maroon-600/70 mb-6 leading-relaxed">{s.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-maroon-100">
                <span className="studio-kicker normal-case tracking-normal">Due in {s.dueIn}</span>
                <button
                  onClick={() => setActiveId(s.id)}
                  disabled={!!done}
                  className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
                >
                  {done ? 'Completed' : 'Take Survey'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="studio-card w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-maroon-950">{active.title}</h3>
                <p className="text-sm text-maroon-600 mt-1">{active.description}</p>
              </div>
              <button onClick={() => setActiveId(null)} className="text-maroon-400 hover:text-maroon-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="studio-kicker block mb-2">Overall rating</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={5} value={rating} onChange={e => setRating(Number(e.target.value))} className="flex-1" />
                  <span className="text-sm font-semibold text-maroon-900">{rating}/5</span>
                </div>
              </div>
              <div>
                <label className="studio-kicker block mb-2">Your feedback</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="input-field min-h-[100px] resize-none"
                  placeholder="What is working well? What could be improved?"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setActiveId(null)} className="btn-secondary">Cancel</button>
                <button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting…' : 'Submit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}