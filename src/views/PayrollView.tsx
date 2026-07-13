import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, IndianRupee } from 'lucide-react';
import { fetcher, downloadAuthenticated, ApiError } from '../utils';
import { useRBACStore } from '../store';

interface PayrollRecord {
  id: string; period: string; grossPay: number; deductions: number; netPay: number; status: string;
  breakdown?: { basic: number; hra: number; pfEmployee: number; tds: number };
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function PayrollView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const { data: records = [] } = useQuery<PayrollRecord[]>({
    queryKey: ['payroll'],
    queryFn: () => fetcher(`/api/payroll${isManager ? '?all=1' : ''}`),
  });

  const { data: salary } = useQuery<{ structure: { ctc: number; basic: number; hra: number }; breakdown: { grossPay: number; netPay: number; pfEmployee: number; tds: number } }>({
    queryKey: ['salary-structure', currentUser?.id],
    queryFn: () => fetcher(`/api/payroll/salary/${currentUser!.id}`),
    enabled: !!currentUser?.id,
  });

  const runPayroll = async () => {
    if (!confirm('Run payroll for all active employees? This will generate India-compliant payslips.')) return;
    try {
      await fetcher('/api/payroll/run', { method: 'POST' });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        if (confirm(`${e.message}\n\nRe-run payroll for this period anyway?`)) {
          await fetcher('/api/payroll/run?force=1', { method: 'POST' });
          qc.invalidateQueries({ queryKey: ['payroll'] });
        }
      } else {
        alert(e instanceof Error ? e.message : 'Payroll run failed');
      }
    }
  };

  const downloadPayslip = async (id: string, period: string) => {
    try {
      await downloadAuthenticated(`/api/payroll/${id}/payslip/html`, `payslip-${period}.html`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not download payslip');
    }
  };

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ivory">Payroll</h2>
          <p className="text-sm text-ivory-muted mt-1">India payroll — Basic, HRA, PF, ESIC, PT & TDS</p>
        </div>
        {isManager && (
          <button onClick={runPayroll} className="btn-primary text-xs">Run Payroll</button>
        )}
      </div>

      {salary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Annual CTC', value: fmt(salary.structure.ctc) },
            { label: 'Monthly Gross', value: fmt(salary.breakdown.grossPay) },
            { label: 'PF (Employee)', value: fmt(salary.breakdown.pfEmployee) },
            { label: 'Est. Net Pay', value: fmt(salary.breakdown.netPay) },
          ].map(s => (
            <div key={s.label} className="premium-stat">
              <p className="premium-stat-label">{s.label}</p>
              <p className="premium-stat-value flex items-center gap-1"><IndianRupee className="w-4 h-4 opacity-60" />{s.value.replace('₹', '')}</p>
            </div>
          ))}
        </div>
      )}

      <div className="studio-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gold/10 text-[10px] uppercase tracking-wider text-ivory-muted">
            <tr>
              <th className="px-6 py-4">Period</th>
              <th className="px-6 py-4">Gross</th>
              <th className="px-6 py-4">Deductions</th>
              <th className="px-6 py-4">Net Pay</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Payslip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/5">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-gold/5 transition-colors">
                <td className="px-6 py-4 font-medium text-ivory">{r.period}</td>
                <td className="px-6 py-4 text-ivory-muted tabular-nums">{fmt(r.grossPay)}</td>
                <td className="px-6 py-4 text-ivory-muted tabular-nums">−{fmt(r.deductions)}</td>
                <td className="px-6 py-4 font-semibold text-gold-light tabular-nums">{fmt(r.netPay)}</td>
                <td className="px-6 py-4"><span className="studio-chip text-[10px]">{r.status}</span></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => downloadPayslip(r.id, r.period)} className="text-ivory-muted hover:text-gold-light p-2" title="Download payslip">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-ivory-muted">No payroll records yet.{isManager ? ' Click Run Payroll to process.' : ''}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}