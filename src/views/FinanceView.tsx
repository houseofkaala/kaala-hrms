import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, TrendingUp, Wallet, Receipt, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetcher } from '../utils';

type FinanceSummary = {
  monthlyPayroll: number;
  softwareExpenses: number;
  pendingReimbursements: number;
  expenses: { id: string; title: string; amount: number; status: string }[];
  totals?: {
    totalPayroll: number;
    approvedExpenses: number;
    pendingExpensesAmount: number;
    netBurn: number;
  };
  charts?: {
    payrollTrend: { period: string; amount: number }[];
    expensesByStatus: { status: string; amount: number; count: number }[];
    departmentSpend: { department: string; headcount: number; payroll: number }[];
    monthlyBurn: { month: string; payroll: number; expenses: number }[];
  };
};

const PIE_COLORS = ['#651a2c', '#7f2438', '#9a3348', '#c45a72', '#e8a0b0'];

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function FinanceView() {
  const { data, isLoading } = useQuery<FinanceSummary>({
    queryKey: ['finance'],
    queryFn: () => fetcher('/api/finance/summary'),
  });

  const charts = data?.charts;
  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Finance Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Payroll, expenses, and burn rate analytics</p>
        </div>
        <Link to="/expenses" className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
          Manage Expenses <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-12">Loading finance data…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Total Payroll</span>
              </div>
              <span className="text-3xl font-semibold text-gray-900">{formatINR(totals?.totalPayroll ?? data?.monthlyPayroll ?? 0)}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Receipt className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Approved Expenses</span>
              </div>
              <span className="text-3xl font-semibold text-gray-900">{formatINR(totals?.approvedExpenses ?? data?.softwareExpenses ?? 0)}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Pending Claims</span>
              </div>
              <span className="text-3xl font-semibold text-gray-900">{data?.pendingReimbursements ?? 0}</span>
              <p className="text-xs text-gray-500 mt-1">{formatINR(totals?.pendingExpensesAmount ?? 0)} total</p>
            </div>
            <div className="bg-gradient-to-br from-maroon-800 to-maroon-950 border border-maroon-900 rounded-2xl p-6 shadow-sm text-white">
              <div className="flex items-center gap-2 text-maroon-200 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Net Burn</span>
              </div>
              <span className="text-3xl font-semibold">{formatINR(totals?.netBurn ?? 0)}</span>
              <p className="text-xs text-maroon-200 mt-1">Payroll + approved expenses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Burn Rate</h3>
              {charts?.monthlyBurn && charts.monthlyBurn.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={charts.monthlyBurn}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="payroll" name="Payroll" stroke="#651a2c" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#9a3348" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No burn rate data yet</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Expenses by Status</h3>
              {charts?.expensesByStatus && charts.expensesByStatus.some(e => e.amount > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={charts.expensesByStatus.filter(e => e.amount > 0)}
                      dataKey="amount"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ status, amount }) => `${status}: ${formatINR(amount)}`}
                    >
                      {charts.expensesByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No expense data yet</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Payroll by Period</h3>
              {charts?.payrollTrend && charts.payrollTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="amount" fill="#651a2c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No payroll records yet</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Payroll by Department</h3>
              {charts?.departmentSpend && charts.departmentSpend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.departmentSpend} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="payroll" fill="#7f2438" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No department data yet</p>
              )}
            </div>
          </div>

          {data?.expenses && data.expenses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Expenses</h3>
              <div className="space-y-2">
                {data.expenses.map(e => (
                  <div key={e.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                    <span className="text-gray-700">{e.title}</span>
                    <span className="font-medium">{formatINR(e.amount)} · {e.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}