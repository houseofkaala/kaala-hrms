import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, IndianRupee } from 'lucide-react';
import { fetcher, downloadAuthenticated } from '../utils';
import { useRBACStore } from '../store';

interface Declaration {
  id?: string;
  financialYear: string;
  section80C: number;
  section80D: number;
  section80G: number;
  hraExemption: number;
  homeLoanInterest: number;
  nps: number;
  otherDeductions: number;
  totalDeclared: number;
  status: string;
}

const SECTIONS = [
  { key: 'section80C', label: 'Section 80C (PPF, ELSS, LIC)', max: 150000, hint: 'Max ₹1.5L' },
  { key: 'section80D', label: 'Section 80D (Health Insurance)', max: 25000, hint: 'Max ₹25K' },
  { key: 'section80G', label: 'Section 80G (Donations)', max: 100000, hint: '' },
  { key: 'hraExemption', label: 'HRA Exemption', max: 300000, hint: '' },
  { key: 'homeLoanInterest', label: 'Home Loan Interest u/s 24', max: 200000, hint: '' },
  { key: 'nps', label: 'NPS u/s 80CCD(1B)', max: 50000, hint: 'Max ₹50K' },
  { key: 'otherDeductions', label: 'Other Deductions', max: 100000, hint: '' },
] as const;

export function TaxComplianceView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

  const { data: decl, isLoading } = useQuery<Declaration>({
    queryKey: ['tax-declaration', fy],
    queryFn: () => fetcher(`/api/tax/declaration?year=${fy}`),
  });

  const [form, setForm] = useState<Record<string, number>>({});

  const values = { ...decl, ...form } as Declaration;
  const isLocked = values.status === 'submitted' || values.status === 'verified';
  const total = SECTIONS.reduce((s, sec) => s + (Number(values[sec.key as keyof Declaration]) || 0), 0);

  const save = async (submit = false) => {
    const body: Record<string, unknown> = { financialYear: fy, submit };
    for (const sec of SECTIONS) {
      body[sec.key] = Number(values[sec.key as keyof Declaration]) || 0;
    }
    await fetcher('/api/tax/declaration', { method: 'POST', body: JSON.stringify(body) });
    qc.invalidateQueries({ queryKey: ['tax-declaration'] });
  };

  const generateAllForm16 = async () => {
    if (!confirm('Generate Form 16 for all active employees?')) return;
    await fetcher('/api/tax/form16/generate', { method: 'POST' });
    alert('Form 16 generated and employees notified.');
  };

  const downloadForm16 = async () => {
    try {
      await downloadAuthenticated(`/api/tax/form16/html?year=${fy}`, `form16-${fy}.html`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not download Form 16');
    }
  };

  if (isLoading) return <p className="text-ivory-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ivory">Tax & Compliance</h2>
          <p className="text-sm text-ivory-muted mt-1">Investment declaration · Form 16 · FY {fy}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadForm16} className="btn-secondary text-xs flex items-center gap-1">
            <Download className="w-4 h-4" /> Form 16
          </button>
          {isAdmin && (
            <button onClick={generateAllForm16} className="btn-primary text-xs">Generate all Form 16</button>
          )}
        </div>
      </div>

      <div className="premium-stat max-w-xs">
        <p className="premium-stat-label">Total Declared</p>
        <p className="premium-stat-value flex items-center gap-1">
          <IndianRupee className="w-4 h-4 opacity-60" />
          {total.toLocaleString('en-IN')}
        </p>
        <p className="text-[10px] text-ivory-muted mt-1">Status: {values.status || 'draft'}</p>
      </div>

      <div className="studio-card p-6 space-y-5">
        <h3 className="font-display text-lg text-ivory flex items-center gap-2">
          <FileText className="w-5 h-5 text-gold-muted" /> Investment Declaration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map(sec => (
            <div key={sec.key}>
              <label className="studio-kicker block mb-1.5">{sec.label}</label>
              <input
                type="number"
                min={0}
                max={sec.max}
                disabled={isLocked}
                value={values[sec.key as keyof Declaration] || ''}
                onChange={e => setForm(f => ({ ...f, [sec.key]: Number(e.target.value) }))}
                className="input-field disabled:opacity-60"
                placeholder={sec.hint || '₹0'}
              />
            </div>
          ))}
        </div>
        {!isLocked ? (
          <div className="flex gap-3 pt-2">
            <button onClick={() => save(false)} className="btn-secondary text-xs">Save draft</button>
            <button onClick={() => save(true)} className="btn-primary text-xs">Submit declaration</button>
          </div>
        ) : (
          <p className="text-sm text-ivory-muted pt-2">Declaration is {values.status} and cannot be edited.</p>
        )}
      </div>
    </div>
  );
}