import type { User } from '../types';

export function LeaderboardView({ users }: { users: User[] }) {
  const sorted = [...users].sort((a, b) => b.points - a.points);
  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex flex-col shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Points Leaderboard</h2>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {sorted.map((u, i) => (
            <div key={u.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-medium text-gray-500 text-sm">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-semibold text-lg uppercase">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{u.name}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{u.department || 'General'} &bull; {u.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200">
                <span className="font-semibold text-gray-900">{u.points}</span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">KP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
