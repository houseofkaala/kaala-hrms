import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface PayrollRecord { id: string; period: string; grossPay: number; deductions: number; netPay: number; status: string }

export function PayrollView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const { data: records = [] } = useQuery<PayrollRecord[]>({
    queryKey: ['payroll'],
    queryFn: () => fetcher(`/api/payroll${isManager ? '?all=1' : ''}`),
  });

  const runPayroll = async () => {
    await fetcher('/api/payroll/run', { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['payroll'] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Payroll</h2>
        {isManager && (
          <button onClick={runPayroll} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 shadow-sm">
            Run Payroll
          </button>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-medium">
            <tr>
              <th className="px-6 py-4">Period</th>
              <th className="px-6 py-4">Gross Pay</th>
              <th className="px-6 py-4">Deductions</th>
              <th className="px-6 py-4">Net Pay</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{r.period}</td>
                <td className="px-6 py-4 text-gray-600">${r.grossPay.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-500">-${r.deductions.toLocaleString()}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">${r.netPay.toLocaleString()}</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-[10px] font-semibold uppercase">{r.status}</span></td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={async () => {
                      const slip = await fetcher<Record<string, unknown>>(`/api/payroll/${r.id}/payslip`);
                      const blob = new Blob([JSON.stringify(slip, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `payslip-${r.period.replace(/\s/g, '-')}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-md"
                    title="Download payslip"
                  ><Download className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}