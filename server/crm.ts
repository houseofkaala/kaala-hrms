export const CRM_STAGES = [
  { key: 'new', label: 'New', color: '#6366f1' },
  { key: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { key: 'qualified', label: 'Qualified', color: '#0ea5e9' },
  { key: 'proposal', label: 'Proposal', color: '#f59e0b' },
  { key: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { key: 'closed_won', label: 'Closed Won', color: '#10b981' },
  { key: 'closed_lost', label: 'Closed Lost', color: '#6b7280' },
] as const;

export type CrmLeadStage = (typeof CRM_STAGES)[number]['key'];

export interface CrmLeadRecord {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  title: string;
  source: string;
  industry: string;
  amount: number;
  stage: CrmLeadStage;
  rating: 'hot' | 'warm' | 'cold';
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  nextFollowUp?: string;
}

export const CRM_SOURCES = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Event', 'Partner', 'Other'];
export const CRM_RATINGS = ['hot', 'warm', 'cold'] as const;

export function leadFullName(lead: Pick<CrmLeadRecord, 'firstName' | 'lastName'>) {
  return `${lead.firstName} ${lead.lastName}`.trim();
}

export function isClosedStage(stage: CrmLeadStage) {
  return stage === 'closed_won' || stage === 'closed_lost';
}