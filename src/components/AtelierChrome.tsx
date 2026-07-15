import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview' },
  marketplace: { title: 'Reward Marketplace', subtitle: 'Earn Kaala Points' },
  leaderboard: { title: 'Leaderboard', subtitle: 'Team rankings' },
  recruit: { title: 'Recruitment', subtitle: 'Hiring pipeline' },
  employees: { title: 'Employees', subtitle: 'Team management' },
  onboarding: { title: 'Onboarding', subtitle: 'New joiners' },
  orgchart: { title: 'Organisation Chart', subtitle: 'Reporting structure' },
  people: { title: 'People Directory', subtitle: 'Find colleagues' },
  leave: { title: 'Leave Management', subtitle: 'Apply and track leave' },
  holidays: { title: 'Holidays', subtitle: 'Company calendar' },
  attendance: { title: 'Attendance', subtitle: 'Punch in and out' },
  timesheets: { title: 'Timesheets', subtitle: 'Project hours' },
  'employee-timesheets': { title: 'Employee Timesheets', subtitle: 'Clock-in records & edits' },
  documents: { title: 'Documents', subtitle: 'Files and contracts' },
  payroll: { title: 'Payroll', subtitle: 'Salary and payslips' },
  expenses: { title: 'Expenses', subtitle: 'Claims and reimbursement' },
  assets: { title: 'Assets', subtitle: 'Company equipment' },
  projects: { title: 'Projects', subtitle: 'Project management' },
  tasks: { title: 'Tasks', subtitle: 'Work tracking' },
  performance: { title: 'Performance', subtitle: 'Goals and reviews' },
  learning: { title: 'Learning', subtitle: 'Training courses' },
  chat: { title: 'Chat', subtitle: 'Team messages' },
  survey: { title: 'Surveys', subtitle: 'Employee feedback' },
  field: { title: 'Field Operations', subtitle: 'On-ground team' },
  crm: { title: 'CRM', subtitle: 'Leads & pipeline' },
  finance: { title: 'Finance', subtitle: 'Budget overview' },
  ai: { title: 'HR Assistant', subtitle: 'Ask anything about HR' },
  community: { title: 'Community', subtitle: 'Announcements' },
  helpdesk: { title: 'Help Desk', subtitle: 'Raise a ticket' },
  reports: { title: 'Reports', subtitle: 'Analytics and exports' },
  rewards: { title: 'Rewards', subtitle: 'Redeem points' },
  profile: { title: 'My Profile', subtitle: 'Personal details' },
  settings: { title: 'Settings', subtitle: 'Preferences' },
  security: { title: 'Security', subtitle: 'Password & sessions' },
  roles: { title: 'Roles & Permissions', subtitle: 'Access control' },
  notifications: { title: 'Notifications', subtitle: 'Alerts and updates' },
  policies: { title: 'Policies', subtitle: 'Company guidelines' },
  offboarding: { title: 'Offboarding', subtitle: 'Exit process' },
  benefits: { title: 'Benefits', subtitle: 'Plans & enrollment' },
  tax: { title: 'Tax & Form 16', subtitle: 'Declarations & compliance' },
};

export function AtelierPageHeader({ activeTab }: { activeTab: string }) {
  const meta = PAGE_TITLES[activeTab] || { title: activeTab, subtitle: 'Module' };

  return (
    <header className="studio-page-header">
      <p className="studio-kicker mb-1">{meta.subtitle}</p>
      <h1 className="text-[28px] sm:text-[34px] font-semibold text-ivory tracking-tight leading-tight">
        {meta.title}
      </h1>
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
        'studio-nav-item group relative flex items-center gap-2.5 w-full px-2.5 py-2 min-h-[36px]',
        active ? 'text-gold font-medium' : 'text-ivory-muted',
      )}
    >
      <span className="relative shrink-0 flex items-center justify-center w-7 h-7">
        <Icon
          className={cn('w-[16px] h-[16px]', active ? 'text-gold' : 'text-ivory-muted group-hover:text-ivory')}
          strokeWidth={active ? 2.25 : 1.75}
        />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-gold text-white text-[10px] font-semibold flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={cn('text-[13px] truncate', active && 'font-medium')}>
        {label}
      </span>
    </Link>
  );
}

export function RailSection({ label }: { label: string }) {
  return (
    <div className="px-2.5 pt-4 pb-1 first:pt-2">
      <span className="studio-section-label">{label}</span>
    </div>
  );
}

export function getPageMeta(activeTab: string) {
  const meta = PAGE_TITLES[activeTab] || { title: activeTab, subtitle: 'Module' };
  return { ...meta, index: '' };
}