/** India tax compliance — investment declarations & Form 16 generation. */

import { formatINR } from './payroll-engine';

export interface InvestmentDeclaration {
  id: string;
  userId: string;
  financialYear: string;
  section80C: number;
  section80D: number;
  section80G: number;
  hraExemption: number;
  homeLoanInterest: number;
  nps: number;
  otherDeductions: number;
  totalDeclared: number;
  status: 'draft' | 'submitted' | 'verified';
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Form16Data {
  financialYear: string;
  employer: { name: string; tan: string; pan: string };
  employee: { name: string; pan: string; employeeId: string };
  salary: {
    grossSalary: number;
    perquisites: number;
    profitsInLieu: number;
    totalIncome: number;
  };
  deductions: {
    section80C: number;
    section80D: number;
    standardDeduction: number;
    professionalTax: number;
    totalChapterVI: number;
  };
  tds: {
    totalTaxDeducted: number;
    monthlyBreakdown: { month: string; amount: number }[];
  };
  netTaxableIncome: number;
}

const SECTION_80C_LIMIT = 150000;
const SECTION_80D_LIMIT = 25000;
const STANDARD_DEDUCTION = 75000;

export function currentFinancialYear(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 3) return `${y}-${(y + 1).toString().slice(-2)}`;
  return `${y - 1}-${y.toString().slice(-2)}`;
}

const NPS_LIMIT = 50000;
const HOME_LOAN_LIMIT = 200000;

export function clampDeclarationFields(d: Partial<InvestmentDeclaration>): Partial<InvestmentDeclaration> {
  return {
    ...d,
    section80C: Math.min(Math.max(0, Number(d.section80C) || 0), SECTION_80C_LIMIT),
    section80D: Math.min(Math.max(0, Number(d.section80D) || 0), SECTION_80D_LIMIT),
    section80G: Math.max(0, Number(d.section80G) || 0),
    hraExemption: Math.max(0, Number(d.hraExemption) || 0),
    homeLoanInterest: Math.min(Math.max(0, Number(d.homeLoanInterest) || 0), HOME_LOAN_LIMIT),
    nps: Math.min(Math.max(0, Number(d.nps) || 0), NPS_LIMIT),
    otherDeductions: Math.max(0, Number(d.otherDeductions) || 0),
  };
}

export function computeDeclarationTotal(d: Partial<InvestmentDeclaration>): number {
  return (
    Math.min(Number(d.section80C) || 0, SECTION_80C_LIMIT) +
    Math.min(Number(d.section80D) || 0, SECTION_80D_LIMIT) +
    (Number(d.section80G) || 0) +
    (Number(d.hraExemption) || 0) +
    (Number(d.homeLoanInterest) || 0) +
    (Number(d.nps) || 0) +
    (Number(d.otherDeductions) || 0)
  );
}

export function buildForm16(
  employee: { id: string; name: string; pan?: string },
  company: string,
  annualGross: number,
  declaration: InvestmentDeclaration | null,
  monthlyTds: number[],
): Form16Data {
  const fy = declaration?.financialYear || currentFinancialYear();
  const ch80C = Math.min(declaration?.section80C || 0, SECTION_80C_LIMIT);
  const ch80D = Math.min(declaration?.section80D || 0, SECTION_80D_LIMIT);
  const totalChapterVI = ch80C + ch80D + (declaration?.section80G || 0) + (declaration?.nps || 0) + (declaration?.otherDeductions || 0);
  const netTaxable = Math.max(0, annualGross - STANDARD_DEDUCTION - totalChapterVI - 200 * 12);
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  return {
    financialYear: fy,
    employer: { name: company, tan: 'BLRM12345A', pan: 'AABCH1234A' },
    employee: { name: employee.name, pan: employee.pan || 'PANNOTAVBL', employeeId: employee.id },
    salary: {
      grossSalary: annualGross,
      perquisites: 0,
      profitsInLieu: 0,
      totalIncome: annualGross,
    },
    deductions: {
      section80C: ch80C,
      section80D: ch80D,
      standardDeduction: STANDARD_DEDUCTION,
      professionalTax: 200 * 12,
      totalChapterVI,
    },
    tds: {
      totalTaxDeducted: monthlyTds.reduce((s, n) => s + n, 0),
      monthlyBreakdown: months.map((month, i) => ({ month, amount: monthlyTds[i] || monthlyTds[0] || 0 })),
    },
    netTaxableIncome: netTaxable,
  };
}

export function form16Html(data: Form16Data): string {
  const rows = [
    ['Gross Salary', data.salary.grossSalary],
    ['Standard Deduction u/s 16', -data.deductions.standardDeduction],
    ['Section 80C', -data.deductions.section80C],
    ['Section 80D', -data.deductions.section80D],
    ['Professional Tax', -data.deductions.professionalTax],
    ['Net Taxable Income', data.netTaxableIncome],
    ['Total TDS Deducted', data.tds.totalTaxDeducted],
  ];
  const tr = rows.map(([l, v]) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${l}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatINR(Math.abs(v as number))}</td></tr>`,
  ).join('');
  const tdsRows = data.tds.monthlyBreakdown.map(m =>
    `<tr><td style="padding:6px;border-bottom:1px solid #f0f0f0">${m.month}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right">${formatINR(m.amount)}</td></tr>`,
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Form 16 FY ${data.financialYear}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:32px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th{text-align:left;padding:8px;background:#f5f5f5;font-size:12px}</style></head><body>
<h1>Form 16 — Certificate under Section 203</h1>
<p style="color:#666">Financial Year ${data.financialYear}</p>
<p><strong>Employer:</strong> ${data.employer.name}<br>TAN: ${data.employer.tan} · PAN: ${data.employer.pan}</p>
<p><strong>Employee:</strong> ${data.employee.name}<br>PAN: ${data.employee.pan} · ID: ${data.employee.employeeId}</p>
<h2 style="font-size:14px;margin-top:24px">Part A — Income & Deductions</h2>
<table>${tr}</table>
<h2 style="font-size:14px;margin-top:24px">Part B — Monthly TDS</h2>
<table><thead><tr><th>Month</th><th>TDS</th></tr></thead><tbody>${tdsRows}</tbody></table>
<p style="margin-top:32px;font-size:11px;color:#999">Generated by House of Kaala HRMS. For official filing, verify with your CA.</p>
</body></html>`;
}