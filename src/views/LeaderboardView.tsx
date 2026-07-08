import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Medal, Trophy } from 'lucide-react';
import { fetcher } from '../utils';
import type { User } from '../types';

interface LeaderEntry {
  id: string; name: string; department: string; role: string; points: number; tasksDone: number; rank: number;
}

export function LeaderboardView({ users: fallbackUsers }: { users: User[] }) {
  const [period, setPeriod] = useState<'all' | 'month'>('all');

  const { data } = useQuery<{ leaderboard: LeaderEntry[] }>({
    queryKey: ['leaderboard', period],
    queryFn: () => fetcher(`/api/leaderboard?period=${period}`),
  });

  const ranked = data?.leaderboard ?? [...fallbackUsers]
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ id: u.id, name: u.name, department: u.department || 'General', role: u.role, points: u.points, tasksDone: 0, rank: i + 1 }));

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-gold-light" />
          <h2 className="font-display text-xl text-ivory">Kaala Points Leaderboard</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPeriod('all')} className={period === 'all' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>All time</button>
          <button onClick={() => setPeriod('month')} className={period === 'month' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>This month</button>
        </div>
      </div>
      <div className="studio-card overflow-hidden">
        <div className="divide-y divide-gold/5">
          {ranked.map(u => (
            <div key={u.id} className="p-5 flex items-center justify-between hover:bg-gold/5 transition-colors">
              <div className="flex items-center gap-5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${u.rank <= 3 ? 'bg-gold/20 text-gold-light' : 'bg-charcoal text-ivory-muted'}`}>
                  {u.rank <= 3 ? <Medal className="w-4 h-4" /> : u.rank}
                </div>
                <div className="w-12 h-12 rounded-full bg-charcoal text-gold-light flex items-center justify-center font-semibold text-lg uppercase ring-1 ring-gold/20">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-ivory">{u.name}</h4>
                  <p className="text-xs text-ivory-muted mt-0.5">{u.department} · {u.role}{u.tasksDone > 0 ? ` · ${u.tasksDone} tasks` : ''}</p>
                </div>
              </div>
              <div className="studio-points flex items-center gap-1.5">
                <span className="tabular-nums font-semibold">{u.points}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60">KP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}