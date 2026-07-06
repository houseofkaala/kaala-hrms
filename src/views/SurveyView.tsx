import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Survey { id: string; title: string; description: string; dueIn: string; responses: string[] }

export function SurveyView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: ['surveys'],
    queryFn: () => fetcher('/api/surveys'),
  });

  const respond = async (id: string) => {
    await fetcher(`/api/surveys/${id}/respond`, { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['surveys'] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Surveys</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map(s => {
          const done = currentUser && s.responses.includes(currentUser.id);
          return (
            <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{s.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md">Due in {s.dueIn}</span>
                <button onClick={() => respond(s.id)} disabled={!!done} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {done ? 'Completed' : 'Start Survey'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}