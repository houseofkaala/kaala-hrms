import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { fetcher } from '../../utils';
import { usePerformanceData } from '../../hooks/usePerformanceData';
export function SkillsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = usePerformanceData();
  const skills = data?.skills ?? [];
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(3);

  const addSkill = async () => {
    if (!name.trim()) return;
    await fetcher('/api/performance/skills', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), level, maxLevel: 10 }),
    });
    setName('');
    setLevel(3);
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ['performance'] });
  };

  const updateLevel = async (id: string, newLevel: number) => {
    await fetcher(`/api/performance/skills/${id}`, { method: 'PATCH', body: JSON.stringify({ level: newLevel }) });
    qc.invalidateQueries({ queryKey: ['performance'] });
  };

  if (isLoading) return <p className="text-sm text-ivory-muted">Loading skills…</p>;

  return (
    <div className="space-y-6">
      <div className="studio-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg text-ivory">Skills Matrix</h3>
          <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-xs flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add skill
          </button>
        </div>
        {showForm && (
          <div className="flex gap-3 mb-6">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Skill name" className="input-field flex-1" />
            <input type="number" min={1} max={10} value={level} onChange={e => setLevel(Number(e.target.value))} className="input-field w-20" />
            <button onClick={addSkill} className="btn-primary text-xs">Save</button>
          </div>
        )}
        {skills.length === 0 ? (
          <p className="text-sm text-ivory-muted">No skills tracked yet. Add your competencies above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {skills.map(skill => (
              <div key={skill.id}>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-medium text-ivory">{skill.name}</div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gold-light">Lvl {skill.level}</span>
                    <span className="text-xs text-ivory-muted ml-1">/ {skill.maxLevel}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-charcoal rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }} />
                </div>
                <input
                  type="range" min={1} max={skill.maxLevel} value={skill.level}
                  onChange={e => updateLevel(skill.id, Number(e.target.value))}
                  className="w-full mt-2 accent-gold"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="studio-card p-6">
        <h3 className="font-display text-lg text-ivory mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold-muted" /> Learning Progress
        </h3>
        <p className="text-sm text-ivory-muted">Visit the Learning Center to enroll in courses and improve your skills.</p>
      </div>
    </div>
  );
}