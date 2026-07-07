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
  documents: { title: 'Documents', subtitle: 'Files and contracts' },
  payroll: { title: 'Payroll', subtitle: 'Salary and payslips' },
  expenses: { title: 'Expenses', subtitle: 'Claims and reimbursement' },
  assets: { title: 'Assets', subtitle: 'Company equipment' },
  projects: { title: 'Projects', subtitle: 'Active initiatives' },
  tasks: { title: 'Tasks', subtitle: 'Work tracking' },
  performance: { title: 'Performance', subtitle: 'Goals and reviews' },
  learning: { title: 'Learning', subtitle: 'Training courses' },
  chat: { title: 'Chat', subtitle: 'Team messages' },
  survey: { title: 'Surveys', subtitle: 'Employee feedback' },
  field: { title: 'Field Operations', subtitle: 'On-ground team' },
  finance: { title: 'Finance', subtitle: 'Budget overview' },
  ai: { title: 'HR Assistant', subtitle: 'Ask anything about HR' },
  community: { title: 'Community', subtitle: 'Announcements' },
  helpdesk: { title: 'Help Desk', subtitle: 'Raise a ticket' },
  reports: { title: 'Reports', subtitle: 'Analytics and exports' },
  rewards: { title: 'Rewards', subtitle: 'Redeem points' },
  profile: { title: 'My Profile', subtitle: 'Personal details' },
  settings: { title: 'Settings', subtitle: 'Preferences' },
  roles: { title: 'Roles & Permissions', subtitle: 'Access control' },
  notifications: { title: 'Notifications', subtitle: 'Alerts and updates' },
  policies: { title: 'Policies', subtitle: 'Company guidelines' },
};

export function AtelierPageHeader({ activeTab }: { activeTab: string }) {
  const meta = PAGE_TITLES[activeTab] || { title: activeTab, subtitle: 'Module' };

  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-wider text-maroon-500 font-medium mb-1">{meta.subtitle}</p>
      <h1 className="font-display text-3xl font-semibold text-maroon-950">{meta.title}</h1>
    </header>
  );
}

export function RailNavItem({
  icon: Icon,
  label,
  to,
  active,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'atelier-rail-item group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200',
        active
          ? 'bg-white text-maroon-900 shadow-lg shadow-black/20'
          : 'text-white/70 hover:text-white hover:bg-white/10',
      )}
    >
      <span className="relative shrink-0 flex items-center justify-center w-8 h-8">
        <Icon className={cn('w-[18px] h-[18px]', active && 'text-maroon-800')} strokeWidth={active ? 2.25 : 1.75} />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ink text-white text-[9px] font-bold flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={cn('text-[13px] font-medium truncate', active && 'font-semibold text-maroon-950')}>
        {label}
      </span>
    </Link>
  );
}

export function RailSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-5 pb-1.5 first:pt-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-bold whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}