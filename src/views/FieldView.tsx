import { useQuery } from '@tanstack/react-query';
import { Map, MapPin } from 'lucide-react';
import { fetcher } from '../utils';

interface FieldAgent {
  id: string;
  name: string;
  location: string;
  status: string;
  lat?: number;
  lng?: number;
}

export function FieldView() {
  const { data } = useQuery<{ agents: FieldAgent[]; count: number }>({
    queryKey: ['field'],
    queryFn: () => fetcher('/api/field/agents'),
  });

  const agents = data?.agents || [];

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Field Operations</h2>
        <p className="text-sm text-gray-500 mt-1">Live tracking of {data?.count || 0} active field agents</p>
      </div>
      <div className="h-[500px] bg-gray-50 rounded-2xl border border-gray-200 relative overflow-hidden shadow-inner">
        <Map className="w-32 h-32 text-gray-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-sm border border-white/50 flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-gray-900">{data?.count || 0} Active Agents</span>
        </div>
        {agents.map((a, i) => {
          const left = a.lat ? `${((a.lng! - 77.55) / 0.1) * 80 + 10}%` : `${20 + i * 25}%`;
          const top = a.lat ? `${((12.98 - a.lat) / 0.08) * 70 + 15}%` : `${30 + i * 15}%`;
          return (
            <div key={a.id} className="absolute z-10" style={{ left, top }}>
              <div className="relative group">
                <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${a.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-xs font-semibold text-gray-900">{a.name}</p>
                  <p className="text-[10px] text-gray-500">{a.location}</p>
                  {a.lat && <p className="text-[10px] text-gray-400">{a.lat.toFixed(2)}, {a.lng!.toFixed(2)}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${a.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{a.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{a.location}</p>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold uppercase">{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}