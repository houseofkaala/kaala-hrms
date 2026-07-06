import { BookOpen } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';

export function SkillsTab() {
  const { data, isLoading } = usePerformanceData();
  const skills = data?.skills ?? [];

  if (isLoading) return <p className="text-sm text-gray-500">Loading skills...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900">Skills Matrix</h3>
          <span className="text-xs text-gray-500">{skills.length} skills tracked</span>
        </div>
        {skills.length === 0 ? (
          <p className="text-sm text-gray-400">No skills data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {skills.map(skill => (
              <div key={skill.id}>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-medium text-gray-900">{skill.name}</div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">Lvl {skill.level}</span>
                    <span className="text-xs text-gray-500 ml-1">/ {skill.maxLevel}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full" style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-500" /> Learning Progress
        </h3>
        <p className="text-sm text-gray-500">Visit the Learning Center to enroll in courses and improve your skills.</p>
      </div>
    </div>
  );
}