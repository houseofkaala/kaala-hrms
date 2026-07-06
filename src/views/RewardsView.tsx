import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, TrendingUp, TrendingDown, Star, History, Trophy, Zap, Shield } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useRBACStore } from '../store';
import type { Transaction } from '../types';

interface GiftCard { id: string; name: string; pointsCost: number; value: string }
interface RewardsSummary {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  rank: number;
  badges: { id: string; name: string; icon: string }[];
  giftCards?: GiftCard[];
}

const BADGE_ICONS: Record<string, typeof Star> = {
  star: Star,
  award: Award,
  zap: Zap,
  shield: Shield,
  trending: TrendingUp,
};

export function RewardsView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();

  const { data: summary } = useQuery<RewardsSummary>({
    queryKey: ['rewards-summary'],
    queryFn: () => fetcher('/api/rewards/summary'),
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', currentUser?.id],
    queryFn: () => fetcher(`/api/transactions/${currentUser!.id}`),
    enabled: !!currentUser,
  });

  const marketplaceStats = [
    { label: 'Current Balance', value: (summary?.balance ?? currentUser?.points ?? 0).toLocaleString(), icon: Award, color: 'text-amber-500' },
    { label: 'Lifetime Earned', value: (summary?.lifetimeEarned ?? 0).toLocaleString(), icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Redeemed Points', value: (summary?.lifetimeSpent ?? 0).toLocaleString(), icon: TrendingDown, color: 'text-rose-500' },
    { label: 'Company Rank', value: `#${summary?.rank ?? '-'}`, icon: Trophy, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rewards & Recognition</h2>
          <p className="text-sm text-gray-500 mt-1">Track your Kaala Points, lifetime achievements, and transaction history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {marketplaceStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm min-w-0 flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3 shrink-0">
                    <Icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1 truncate">{stat.value}</div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate" title={stat.label}>{stat.label}</div>
                </div>
              );
            })}
          </div>

          {(summary?.giftCards?.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Redeem Gift Cards</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summary!.giftCards!.map(card => (
                  <div key={card.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{card.name}</p>
                      <p className="text-xs text-gray-500">{card.value} value</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetcher(`/api/rewards/redeem/${card.id}`, { method: 'POST' });
                          qc.invalidateQueries({ queryKey: ['rewards-summary'] });
                          qc.invalidateQueries({ queryKey: ['transactions'] });
                        } catch { alert('Insufficient points or redemption failed'); }
                      }}
                      disabled={(summary?.balance ?? 0) < card.pointsCost}
                      className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                    >
                      {card.pointsCost} KP
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-6">Badges & Achievements</h3>
            {(summary?.badges?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">No badges earned yet. Complete tasks and courses to earn badges.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {summary!.badges.map((badge) => {
                  const Icon = BADGE_ICONS[badge.icon] || Award;
                  return (
                    <div key={badge.id} className="flex flex-col items-center text-center p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-sm border bg-amber-50 border-amber-200">
                        <Icon className="w-7 h-7 text-amber-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-900 line-clamp-2">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full flex flex-col max-h-[600px]">
            <h3 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" /> Transaction History
            </h3>
            <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pr-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-400">No transactions yet</p>
              ) : (
                transactions.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0" />
                    <div className="flex-1 pb-4 border-b border-gray-100 last:border-0 last:pb-0 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate" title={item.reason}>{item.reason}</span>
                        <span className={cn('text-sm font-bold shrink-0', item.amount > 0 ? 'text-emerald-500' : 'text-rose-500')}>
                          {item.amount > 0 ? '+' : ''}{item.amount}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}