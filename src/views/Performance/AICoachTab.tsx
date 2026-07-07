import { Brain, ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useRBACStore } from '../../store';

export function AICoachTab() {
  const { data, isLoading, isError } = usePerformanceData();
  const { currentUser } = useRBACStore();

  if (isLoading) return <p className="text-sm text-maroon-500">Analysing your performance data…</p>;
  if (isError || !data) return <p className="text-sm text-red-600">Could not load performance insights. Try again later.</p>;

  const { productivity, goals, reviews, skills } = data;
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  const goalProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.progress / g.target) * 100, 0) / goals.length)
    : 0;
  const promotionScore = Math.min(95, Math.round(
    productivity.qualityScore * 0.4 +
    Math.min(100, productivity.tasksCompleted * 8) * 0.3 +
    goalProgress * 0.2 +
    (avgRating ? avgRating * 20 : 50) * 0.1,
  ));
  const riskLevel = productivity.avgHours > 10 ? 'Medium' : productivity.avgHours < 4 ? 'Medium' : 'Low';

  const suggestions = [
    productivity.tasksCompleted < 3 && {
      title: 'Increase task completion velocity',
      body: `You have completed ${productivity.tasksCompleted} tasks recently. Claim marketplace tasks or finish pending work to boost your quality score.`,
    },
    goalProgress < 50 && goals.length > 0 && {
      title: 'Focus on quarterly goals',
      body: `Your OKR progress is at ${goalProgress}%. Pick one goal and schedule weekly check-ins with your manager.`,
    },
    skills.length < 3 && {
      title: 'Expand your skill profile',
      body: 'Add skills in the Performance → Skills tab and complete a Learning course to strengthen your profile.',
    },
    productivity.avgHours < 6 && {
      title: 'Improve attendance consistency',
      body: `Average logged hours are ${productivity.avgHours}h. Consistent attendance supports performance reviews and promotions.`,
    },
    avgRating && avgRating < 3.5 && {
      title: 'Request feedback from your manager',
      body: `Your latest review average is ${avgRating}/5. Book a 1:1 to discuss growth areas.`,
    },
  ].filter(Boolean) as { title: string; body: string }[];

  if (suggestions.length === 0) {
    suggestions.push(
      { title: 'Maintain your momentum', body: 'Your metrics look strong. Consider mentoring a colleague or leading a small project.' },
      { title: 'Document your wins', body: 'Update your goals and skills so your next review reflects recent contributions.' },
    );
  }

  return (
    <div className="space-y-6">
      <div className="studio-hero p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-7 h-7 text-maroon-200" />
            <h3 className="font-display text-xl font-semibold text-white">AI Performance Coach</h3>
          </div>
          <p className="text-sm text-white/70 leading-relaxed mb-6 max-w-2xl">
            Insights for {currentUser?.name?.split(' ')[0] || 'you'} based on tasks, goals, reviews, and attendance patterns.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-maroon-200" />
                <h4 className="text-sm font-semibold text-white">Growth Score</h4>
              </div>
              <div className="font-display text-3xl font-semibold text-white">{promotionScore}%</div>
              <p className="text-xs text-white/50 mt-2">Composite score from quality, tasks, goals, and reviews.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-maroon-200" />
                <h4 className="text-sm font-semibold text-white">Quality Index</h4>
              </div>
              <div className="font-display text-3xl font-semibold text-white">{productivity.qualityScore}</div>
              <p className="text-xs text-white/50 mt-2">{productivity.tasksCompleted} tasks completed · {productivity.avgHours}h avg/day</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h4 className="text-sm font-semibold text-white">Burnout Risk</h4>
              </div>
              <div className="font-display text-3xl font-semibold text-white">{riskLevel}</div>
              <p className="text-xs text-white/50 mt-2">Based on average hours and workload balance.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="studio-card p-6">
        <h3 className="font-display text-lg font-semibold text-maroon-950 mb-4">Actionable Suggestions</h3>
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={s.title} className="p-4 border border-maroon-100 rounded-xl flex gap-4">
              <div className="w-8 h-8 rounded-full bg-maroon-50 flex items-center justify-center shrink-0">
                <span className="text-maroon-700 font-bold text-sm">{i + 1}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-maroon-950">{s.title}</h4>
                <p className="text-sm text-maroon-700/80 mt-1">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}