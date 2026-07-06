import { useQuery } from '@tanstack/react-query';
import { FileText, Shield, AlertCircle } from 'lucide-react';
import { fetcher } from '../utils';

interface Policy {
  id: string;
  name: string;
  description: string;
  status: string;
  category: string;
}

export function PoliciesView() {
  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => fetcher('/api/policies'),
  });

  const categories = [...new Set(policies.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Company Policies</h2>
        <p className="text-sm text-gray-500 mt-1">HR policies, attendance rules, and compliance guidelines</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading policies...</p>
      ) : (
        categories.map(cat => (
          <div key={cat} className="space-y-3">
            <h3 className="text-xs text-gray-400 uppercase font-semibold tracking-wider px-1">{cat}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.filter(p => p.category === cat).map(policy => (
                <div key={policy.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {policy.status === 'Active' ? <Shield className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                      <h4 className="font-semibold text-gray-900">{policy.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase rounded-md">{policy.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{policy.description}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                    <FileText className="w-3.5 h-3.5" /> Policy ID: {policy.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}