import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { fetcher } from '../utils';

export function FinanceView() {
  const { data } = useQuery<{ monthlyPayroll: number; softwareExpenses: number; pendingReimbursements: number; expenses: { id: string; title: string; amount: number; status: string }[] }>({
    queryKey: ['finance'],
    queryFn: () => fetcher('/api/finance/summary'),
  });

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Finance</h2>
        <Link to="/expenses" className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline">Manage Expenses <ArrowRight className="w-3.5 h-3.5" /></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-gray-500 font-medium mb-2 block">Monthly Payroll</span>
          <span className="text-3xl font-semibold text-gray-900">₹{(data?.monthlyPayroll || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-gray-500 font-medium mb-2 block">Software Expenses</span>
          <span className="text-3xl font-semibold text-gray-900">₹{(data?.softwareExpenses || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-gray-500 font-medium mb-2 block">Pending Reimbursements</span>
          <span className="text-3xl font-semibold text-gray-900">{data?.pendingReimbursements || 0}</span>
        </div>
      </div>
      {data?.expenses && data.expenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Expenses</h3>
          <div className="space-y-2">
            {data.expenses.map(e => (
              <div key={e.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-700">{e.title}</span>
                <span className="font-medium">₹{e.amount.toLocaleString('en-IN')} · {e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}