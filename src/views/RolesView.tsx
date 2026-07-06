import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Users } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface RoleUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export function RolesView() {
  const { currentUser } = useRBACStore();
  const queryClient = useQueryClient();

  const { data: roles } = useQuery<Record<string, { modules: string[]; description: string }>>({
    queryKey: ['roles'],
    queryFn: () => fetcher('/api/roles'),
    enabled: currentUser?.role === 'admin',
  });

  const { data: users = [] } = useQuery<RoleUser[]>({
    queryKey: ['role-users'],
    queryFn: () => fetcher('/api/roles/users'),
    enabled: currentUser?.role === 'admin',
  });

  const updateRole = async (userId: string, role: string) => {
    await fetcher(`/api/roles/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    queryClient.invalidateQueries({ queryKey: ['role-users'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
        Role &amp; Permission Management requires admin access.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Role &amp; Permission Management</h2>
        <p className="text-sm text-gray-500 mt-1">Configure roles and assign permissions across the organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles && Object.entries(roles).map(([role, config]) => (
          <div key={role} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900 capitalize">{role}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">{config.description}</p>
            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Module Access</p>
            <p className="text-xs text-gray-600 mb-2">
              {config.modules[0] === '*' ? 'All modules' : config.modules.join(', ')}
            </p>
            {role !== 'admin' && (
              <button
                onClick={async () => {
                  const modules = prompt('Enter comma-separated modules:', config.modules.join(', '));
                  if (modules) {
                    await fetcher('/api/roles', { method: 'PATCH', body: JSON.stringify({ role, modules: modules.split(',').map(m => m.trim()) }) });
                    queryClient.invalidateQueries({ queryKey: ['roles'] });
                  }
                }}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Edit modules
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">User Role Assignments</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Department</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-6 py-4 text-gray-600">{u.department}</td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}