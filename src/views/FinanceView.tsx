import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, TrendingUp, Wallet, Receipt, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetcher } from '../utils';
import { useChartTheme } from '../theme/charts';

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

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function FinanceView() {
  const { CHART, chartTooltipStyle } = useChartTheme();
  const PIE_COLORS = CHART.series;

  const { data, isLoading } = useQuery<FinanceSummary>({
    queryKey: ['finance'],
    queryFn: () => fetcher('/api/finance/summary'),
  });

  const charts = data?.charts;
  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div>
          <p className="studio-kicker mb-1">Treasury</p>
          <h2 className="font-display text-2xl font-medium text-ivory">Finance Overview</h2>
          <p className="text-sm text-ivory-muted mt-1">Payroll, expenses, and burn rate analytics</p>
        </div>
        <Link to="/expenses" className="btn-secondary text-xs flex items-center gap-1">
          Manage Expenses <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-12">Loading finance data…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="premium-stat">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 premium-stat-icon" />
                <span className="premium-stat-label">Total Payroll</span>
              </div>
              <span className="premium-stat-value text-2xl">{formatINR(totals?.totalPayroll ?? data?.monthlyPayroll ?? 0)}</span>
            </div>
            <div className="premium-stat">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 premium-stat-icon" />
                <span className="premium-stat-label">Approved Expenses</span>
              </div>
              <span className="premium-stat-value text-2xl">{formatINR(totals?.approvedExpenses ?? data?.softwareExpenses ?? 0)}</span>
            </div>
            <div className="premium-stat">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 premium-stat-icon" />
                <span className="premium-stat-label">Pending Claims</span>
              </div>
              <span className="premium-stat-value text-2xl">{data?.pendingReimbursements ?? 0}</span>
              <p className="text-xs text-ivory-muted mt-1">{formatINR(totals?.pendingExpensesAmount ?? 0)} total</p>
            </div>
            <div className="premium-stat border-gold/25 bg-gold/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                <span className="premium-stat-label text-gold-muted">Net Burn</span>
              </div>
              <span className="premium-stat-value text-2xl text-gold-light">{formatINR(totals?.netBurn ?? 0)}</span>
              <p className="text-xs text-ivory-muted mt-1">Payroll + approved expenses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="studio-card p-6">
              <h3 className="font-display text-lg font-medium text-ivory mb-4">Monthly Burn Rate</h3>
              {charts?.monthlyBurn && charts.monthlyBurn.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={charts.monthlyBurn}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART.ivoryMuted }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: CHART.ivoryMuted }} />
                    <Line type="monotone" dataKey="payroll" name="Payroll" stroke={CHART.gold} strokeWidth={2} dot={{ r: 3, fill: CHART.gold }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke={CHART.goldLight} strokeWidth={2} dot={{ r: 3, fill: CHART.goldLight }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No burn rate data yet</p>
              )}
            </div>

            <div className="studio-card p-6">
              <h3 className="font-display text-lg font-medium text-ivory mb-4">Expenses by Status</h3>
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

            <div className="studio-card p-6">
              <h3 className="font-display text-lg font-medium text-ivory mb-4">Payroll by Period</h3>
              {charts?.payrollTrend && charts.payrollTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART.ivoryMuted }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="amount" fill={CHART.gold} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No payroll records yet</p>
              )}
            </div>

            <div className="studio-card p-6">
              <h3 className="font-display text-lg font-medium text-ivory mb-4">Payroll by Department</h3>
              {charts?.departmentSpend && charts.departmentSpend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.departmentSpend} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: CHART.ivoryMuted }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 10, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="payroll" fill={CHART.goldMuted} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">No department data yet</p>
              )}
            </div>
          </div>

          {data?.expenses && data.expenses.length > 0 && (
            <div className="studio-card p-6">
              <h3 className="font-display text-lg font-medium text-ivory mb-4">Recent Expenses</h3>
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