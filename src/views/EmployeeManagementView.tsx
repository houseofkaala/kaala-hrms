import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { fetcher, cn } from '../utils';
import type { User } from '../types';
import { useRBACStore } from '../store';

interface Employee extends User {
  employeeCode?: string;
  designation?: string;
  joinDate?: string;
}

export function EmployeeManagementView() {
  const { currentUser } = useRBACStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: 'Engineering', role: 'employee', title: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', role: '', title: '', phone: '', status: 'Active' });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => fetcher('/api/employees'),
    enabled: currentUser?.role === 'manager' || currentUser?.role === 'admin',
  });

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/employees', { method: 'POST', body: JSON.stringify(form) });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setShowForm(false);
    setForm({ name: '', email: '', department: 'Engineering', role: 'employee', title: '' });
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ name: emp.name, department: emp.department || '', role: emp.role, title: emp.title || '', phone: emp.phone || '', status: emp.status || 'Active' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetcher(`/api/employees/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setEditingId(null);
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this employee?')) return;
    await fetcher(`/api/employees/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  if (currentUser?.role === 'employee') {
    return (
      <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
        Employee Management requires manager or admin access.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Employee Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage employee records, roles, and onboarding</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {showForm && currentUser?.role === 'admin' && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Job title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Engineering</option>
            <option>Design</option>
            <option>Marketing</option>
            <option>Operations</option>
          </select>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Create Employee</button>
        </form>
      )}

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-w-sm shadow-sm">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading employees...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Employee</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Department</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Points</th>
                {currentUser?.role === 'admin' && <th className="text-right px-6 py-3 font-semibold text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {editingId === emp.id ? (
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 text-xs uppercase">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {editingId === emp.id ? <input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-sm w-full" /> : emp.department}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === emp.id ? (
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-sm">
                        <option value="employee">employee</option><option value="manager">manager</option><option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold uppercase">{emp.role}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === emp.id ? (
                      <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-sm">
                        <option>Active</option><option>Inactive</option><option>On Leave</option>
                      </select>
                    ) : (
                      <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{emp.status}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{emp.points} KP</td>
                  {currentUser?.role === 'admin' && (
                    <td className="px-6 py-4 text-right">
                      {editingId === emp.id ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={saveEdit} className="text-xs text-emerald-600 font-semibold">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => startEdit(emp)} className="text-xs text-gray-600 font-semibold hover:underline">Edit</button>
                          {emp.status === 'Active' && <button onClick={() => deactivate(emp.id)} className="text-xs text-red-600 font-semibold hover:underline">Deactivate</button>}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 flex flex-col items-center text-gray-400">
              <Users className="w-10 h-10 mb-3" />
              <p className="text-sm">No employees found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}