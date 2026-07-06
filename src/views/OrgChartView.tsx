import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ChevronDown } from 'lucide-react';
import { fetcher } from '../utils';

interface OrgNode {
  id: string;
  name: string;
  title: string;
  department: string;
  role: string;
  managerId?: string;
  status: string;
}

function renderOrgNode(node: OrgNode, nodes: OrgNode[], depth = 0): React.ReactNode {
  const kids = nodes.filter(n => n.managerId === node.id);
  return (
    <div key={node.id} className={depth > 0 ? 'ml-8 mt-4 border-l-2 border-gray-200 pl-6' : ''}>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm inline-flex items-center gap-4 min-w-[240px]">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 uppercase text-sm">
          {node.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{node.name}</p>
          <p className="text-xs text-gray-500">{node.title}</p>
          <p className="text-[10px] text-gray-400 uppercase mt-0.5">{node.department} &bull; {node.role}</p>
        </div>
      </div>
      {kids.length > 0 && (
        <div className="mt-2">
          {kids.map(child => renderOrgNode(child, nodes, depth + 1))}
        </div>
      )}
    </div>
  );
}

export function OrgChartView() {
  const { data, isLoading } = useQuery<{ nodes: OrgNode[] }>({
    queryKey: ['org-chart'],
    queryFn: () => fetcher('/api/org-chart'),
  });

  const nodes = data?.nodes || [];
  const roots = nodes.filter(n => !n.managerId || !nodes.find(m => m.id === n.managerId));

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Organization Chart</h2>
        <p className="text-sm text-gray-500 mt-1">{nodes.length} active employees across departments</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading org chart...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm overflow-x-auto">
          {roots.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Users className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm">No organization data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {roots.map(root => (
                <div key={root.id}>
                  <div className="flex items-center gap-2 text-xs text-gray-400 uppercase font-semibold mb-3">
                    <ChevronDown className="w-3.5 h-3.5" /> {root.department}
                  </div>
                  {renderOrgNode(root, nodes)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...new Set(nodes.map(n => n.department))].map(dept => (
          <div key={dept} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">{dept}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{nodes.filter(n => n.department === dept).length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}