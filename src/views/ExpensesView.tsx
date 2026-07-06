import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus, Check, X } from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';

interface Expense {
  id: string;
  title: string;
  amount: number;
  status: string;
  date: string;
  category: string;
  employee?: { name: string };
}

export function ExpensesView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', date: '', category: 'Travel' });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses', isManager],
    queryFn: () => fetcher(`/api/expenses${isManager ? '?all=1' : ''}`),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/expenses', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    setShowForm(false);
    setForm({ title: '', amount: '', date: '', category: 'Travel' });
  };

  const review = async (id: string, status: string) => {
    await fetcher(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    qc.invalidateQueries({ queryKey: ['expenses'] });
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter(e => e.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Expense Management</h2>
          <p className="text-sm text-gray-500 mt-1">Submit and approve employee expense claims</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800">
          <Plus className="w-4 h-4" /> New Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <DollarSign className="w-5 h-5 text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Submitted</p>
          <p className="text-2xl font-bold text-gray-900">${total.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Approved</p>
          <p className="text-2xl font-bold text-emerald-600">{expenses.filter(e => e.status === 'Approved').length}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
          <input required placeholder="Expense title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Travel</option><option>Meals</option><option>Software</option><option>Equipment</option><option>General</option>
          </select>
          <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Submit Expense</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-6 py-3">Expense</th>
              {isManager && <th className="text-left px-6 py-3">Employee</th>}
              <th className="text-left px-6 py-3">Amount</th>
              <th className="text-left px-6 py-3">Date</th>
              <th className="text-left px-6 py-3">Status</th>
              {isManager && <th className="text-right px-6 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{e.title}</p>
                  <p className="text-xs text-gray-500">{e.category}</p>
                </td>
                {isManager && <td className="px-6 py-4 text-gray-600">{e.employee?.name || '—'}</td>}
                <td className="px-6 py-4 font-semibold">${e.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-600">{e.date}</td>
                <td className="px-6 py-4">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', e.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : e.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>{e.status}</span>
                </td>
                {isManager && e.status === 'Pending' && (
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => review(e.id, 'Approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><Check className="w-4 h-4" /></button>
                    <button onClick={() => review(e.id, 'Rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1" title="Reject"><X className="w-4 h-4" /></button>
                  </td>
                )}
                {isManager && e.status !== 'Pending' && <td className="px-6 py-4" />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}