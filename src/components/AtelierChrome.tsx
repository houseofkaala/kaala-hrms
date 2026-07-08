import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

const PAGE_TITLES: Record<string, { title: string; subtitle: string; index: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Studio overview', index: '01' },
  marketplace: { title: 'Reward Marketplace', subtitle: 'Earn Kaala Points', index: '02' },
  leaderboard: { title: 'Leaderboard', subtitle: 'Team rankings', index: '03' },
  recruit: { title: 'Recruitment', subtitle: 'Hiring pipeline', index: '04' },
  employees: { title: 'Employees', subtitle: 'Team management', index: '05' },
  onboarding: { title: 'Onboarding', subtitle: 'New joiners', index: '06' },
  orgchart: { title: 'Organisation Chart', subtitle: 'Reporting structure', index: '07' },
  people: { title: 'People Directory', subtitle: 'Find colleagues', index: '08' },
  leave: { title: 'Leave Management', subtitle: 'Apply and track leave', index: '09' },
  holidays: { title: 'Holidays', subtitle: 'Company calendar', index: '10' },
  attendance: { title: 'Attendance', subtitle: 'Punch in and out', index: '11' },
  timesheets: { title: 'Timesheets', subtitle: 'Project hours', index: '12' },
  documents: { title: 'Documents', subtitle: 'Files and contracts', index: '13' },
  payroll: { title: 'Payroll', subtitle: 'Salary and payslips', index: '14' },
  expenses: { title: 'Expenses', subtitle: 'Claims and reimbursement', index: '15' },
  assets: { title: 'Assets', subtitle: 'Company equipment', index: '16' },
  projects: { title: 'Projects', subtitle: 'Project management', index: '17' },
  tasks: { title: 'Tasks', subtitle: 'Work tracking', index: '18' },
  performance: { title: 'Performance', subtitle: 'Goals and reviews', index: '19' },
  learning: { title: 'Learning', subtitle: 'Training courses', index: '20' },
  chat: { title: 'Chat', subtitle: 'Team messages', index: '21' },
  survey: { title: 'Surveys', subtitle: 'Employee feedback', index: '22' },
  field: { title: 'Field Operations', subtitle: 'On-ground team', index: '23' },
  crm: { title: 'CRM', subtitle: 'Leads & pipeline', index: '23a' },
  finance: { title: 'Finance', subtitle: 'Budget overview', index: '24' },
  ai: { title: 'HR Assistant', subtitle: 'Ask anything about HR', index: '25' },
  community: { title: 'Community', subtitle: 'Announcements', index: '26' },
  helpdesk: { title: 'Help Desk', subtitle: 'Raise a ticket', index: '27' },
  reports: { title: 'Reports', subtitle: 'Analytics and exports', index: '28' },
  rewards: { title: 'Rewards', subtitle: 'Redeem points', index: '29' },
  profile: { title: 'My Profile', subtitle: 'Personal details', index: '30' },
  settings: { title: 'Settings', subtitle: 'Preferences', index: '31' },
  roles: { title: 'Roles & Permissions', subtitle: 'Access control', index: '32' },
  notifications: { title: 'Notifications', subtitle: 'Alerts and updates', index: '33' },
  policies: { title: 'Policies', subtitle: 'Company guidelines', index: '34' },
};

export function AtelierPageHeader({ activeTab }: { activeTab: string }) {
  const meta = PAGE_TITLES[activeTab] || { title: activeTab, subtitle: 'Module', index: '—' };

  return (
    <header className="studio-page-header relative pl-1">
      <span className="studio-page-index" aria-hidden>{meta.index}</span>
      <div className="relative z-10">
        <p className="studio-kicker mb-2">{meta.subtitle}</p>
        <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-medium text-ivory tracking-tight">{meta.title}</h1>
      </div>
    </header>
  );
}

export function RailNavItem({
  icon: Icon,
  label,
  to,
  active,
  badge,
  onNavigate,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      data-active={active}
      className={cn(
        'studio-nav-item group relative flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px]',
        active ? 'text-gold-light' : 'text-ivory-muted',
      )}
    >
      <span className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-lg">
        <Icon
          className={cn('w-[17px] h-[17px] transition-colors', active ? 'text-gold' : 'text-ivory-muted group-hover:text-gold-light')}
          strokeWidth={active ? 2.25 : 1.75}
        />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-gold text-obsidian text-[9px] font-bold flex items-center justify-center ring-2 ring-charcoal">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={cn('text-[13px] font-medium truncate', active && 'font-semibold')}>
        {label}
      </span>
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gold rounded-full -ml-0.5" />
      )}
    </Link>
  );
}

export function RailSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-5 pb-1.5 first:pt-2">
      <span className="studio-section-label whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gold/15" />
    </div>
  );
}

export function getPageMeta(activeTab: string) {
  return PAGE_TITLES[activeTab] || { title: activeTab, subtitle: 'Module', index: '' };
}