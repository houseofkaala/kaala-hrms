import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Star, Shield, Play } from 'lucide-react';
import { fetcher } from '../../utils';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useRBACStore } from '../../store';

interface ReviewCycle {
  id: string; name: string; period: string; status: string; startDate: string; template: string;
}

export function ReviewsTab() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const { data, isLoading } = usePerformanceData();
  const reviews = data?.reviews ?? [];
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleName, setCycleName] = useState('');

  const { data: cycles = [] } = useQuery<ReviewCycle[]>({
    queryKey: ['review-cycles'],
    queryFn: () => fetcher('/api/performance/cycles'),
  });

  const launchCycle = async (id: string) => {
    await fetcher(`/api/performance/cycles/${id}/launch`, { method: 'POST', body: '{}' });
    qc.invalidateQueries({ queryKey: ['review-cycles'] });
    qc.invalidateQueries({ queryKey: ['performance'] });
  };

  const createCycle = async () => {
    if (!cycleName.trim()) return;
    await fetcher('/api/performance/cycles', {
      method: 'POST',
      body: JSON.stringify({ name: cycleName, period: String(new Date().getFullYear()) }),
    });
    setCycleName('');
    setShowCycleForm(false);
    qc.invalidateQueries({ queryKey: ['review-cycles'] });
  };

  if (isLoading) return <p className="text-sm text-ivory-muted">Loading reviews…</p>;

  return (
    <div className="space-y-6">
      {isManager && (
        <div className="studio-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-ivory">Review Cycles</h3>
            <button onClick={() => setShowCycleForm(!showCycleForm)} className="btn-secondary text-xs">New cycle</button>
          </div>
          {showCycleForm && (
            <div className="flex gap-3 mb-4">
              <input value={cycleName} onChange={e => setCycleName(e.target.value)} placeholder="e.g. H1 2026 Performance Review" className="input-field flex-1" />
              <button onClick={createCycle} className="btn-primary text-xs">Create</button>
            </div>
          )}
          <div className="space-y-2">
            {cycles.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-gold/10">
                <div>
                  <p className="text-sm font-medium text-ivory">{c.name}</p>
                  <p className="text-[10px] text-ivory-muted">{c.period} · {c.status}</p>
                </div>
                {c.status === 'draft' && (
                  <button onClick={() => launchCycle(c.id)} className="btn-primary text-[10px] flex items-center gap-1">
                    <Play className="w-3 h-3" /> Launch
                  </button>
                )}
              </div>
            ))}
            {cycles.length === 0 && <p className="text-xs text-ivory-muted">No review cycles yet.</p>}
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="studio-card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-ivory-muted/30 mx-auto mb-3" />
          <p className="text-sm text-ivory-muted">No performance reviews yet.</p>
        </div>
      ) : (
        reviews.map(review => (
          <div key={review.id} className="studio-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gold-light" />
                </div>
                <div>
                  <h4 className="font-medium text-ivory">{(review as { cycleName?: string }).cycleName || review.period} Review</h4>
                  <p className="text-xs text-ivory-muted">{review.status}</p>
                </div>
              </div>
              {review.rating > 0 && (
                <div className="flex items-center gap-1 bg-gold/10 px-3 py-1.5 rounded-lg border border-gold/20">
                  <Star className="w-4 h-4 text-gold fill-gold" />
                  <span className="text-sm font-bold text-gold-light">{review.rating}/5</span>
                </div>
              )}
            </div>
            {review.feedback && <p className="text-sm text-ivory-muted leading-relaxed">{review.feedback}</p>}
          </div>
        ))
      )}
    </div>
  );
}