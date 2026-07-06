import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Clock, CheckCircle2 } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Course { id: string; title: string; duration: string; required: boolean; enrolled: string[] }

export function LearningView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => fetcher('/api/learning/courses'),
  });

  const { data: progress = {} } = useQuery<Record<string, number>>({
    queryKey: ['learning-progress'],
    queryFn: () => fetcher('/api/learning/progress'),
  });

  const enroll = async (id: string) => {
    await fetcher(`/api/learning/enroll/${id}`, { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  const complete = async (id: string) => {
    await fetcher(`/api/learning/complete/${id}`, { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['learning-progress', 'courses'] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Learning Center</h2>
        <p className="text-sm text-gray-500 mt-1">{Object.values(progress).filter(p => p === 100).length} courses completed</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => {
          const enrolled = currentUser && course.enrolled.includes(currentUser.id);
          const pct = progress[course.id] || 0;
          const done = pct === 100;
          return (
            <div key={course.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-shadow">
              <div className="h-32 bg-gray-50 flex items-center justify-center relative border-b border-gray-100">
                <GraduationCap className="w-10 h-10 text-gray-300 group-hover:scale-110 transition-transform" />
                {course.required && <span className="absolute top-4 right-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-md">Required</span>}
                {done && <span className="absolute top-4 left-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-md flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 mb-2 leading-snug">{course.title}</h3>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mb-3"><Clock className="w-3.5 h-3.5" /> {course.duration}</p>
                {enrolled && !done && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Progress</span><span className="font-semibold">{pct}%</span></div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                )}
                <div className="mt-auto flex gap-2">
                  {!enrolled ? (
                    <button onClick={() => enroll(course.id)} className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-xs font-semibold rounded-xl transition-colors shadow-sm">Start Course</button>
                  ) : done ? (
                    <button disabled className="w-full py-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl">Completed</button>
                  ) : (
                    <button onClick={() => complete(course.id)} className="w-full py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800">Mark Complete</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}