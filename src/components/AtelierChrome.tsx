import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your daily orbit' },
  marketplace: { title: 'Market', subtitle: 'Claim & earn' },
  leaderboard: { title: 'Ranks', subtitle: 'Points hierarchy' },
  recruit: { title: 'Recruit', subtitle: 'Talent pipeline' },
  employees: { title: 'People Ops', subtitle: 'Employee records' },
  onboarding: { title: 'Onboard', subtitle: 'New hire journey' },
  orgchart: { title: 'Org Chart', subtitle: 'Structure & lineage' },
  people: { title: 'Directory', subtitle: 'Find your team' },
  leave: { title: 'Leave', subtitle: 'Time away' },
  holidays: { title: 'Holidays', subtitle: 'Calendar of rest' },
  attendance: { title: 'Presence', subtitle: 'Clock & compliance' },
  timesheets: { title: 'Hours', subtitle: 'Project time' },
  documents: { title: 'Vault', subtitle: 'Files & contracts' },
  payroll: { title: 'Payroll', subtitle: 'Compensation' },
  expenses: { title: 'Expenses', subtitle: 'Claims & reimburse' },
  assets: { title: 'Assets', subtitle: 'Equipment ledger' },
  projects: { title: 'Projects', subtitle: 'Initiatives' },
  tasks: { title: 'Tasks', subtitle: 'Kanban flow' },
  performance: { title: 'Performance', subtitle: 'Growth & goals' },
  learning: { title: 'Learn', subtitle: 'Skill cultivation' },
  chat: { title: 'Chat', subtitle: 'Conversations' },
  survey: { title: 'Surveys', subtitle: 'Voice of team' },
  field: { title: 'Field', subtitle: 'Agents on map' },
  finance: { title: 'Finance', subtitle: 'Org economics' },
  ai: { title: 'Kaala AI', subtitle: 'Intelligent assistant' },
  community: { title: 'Community', subtitle: 'Culture & events' },
  helpdesk: { title: 'Help Desk', subtitle: 'Support tickets' },
  reports: { title: 'Reports', subtitle: 'Insights export' },
  rewards: { title: 'Rewards', subtitle: 'Recognition' },
  profile: { title: 'Profile', subtitle: 'Your identity' },
  settings: { title: 'Settings', subtitle: 'Preferences' },
  roles: { title: 'Roles', subtitle: 'Access control' },
  notifications: { title: 'Inbox', subtitle: 'Alerts stream' },
  policies: { title: 'Policies', subtitle: 'Governance' },
};

export function AtelierPageHeader({ activeTab }: { activeTab: string }) {
  const meta = PAGE_TITLES[activeTab] || { title: activeTab, subtitle: 'Module' };
  const index = String(Object.keys(PAGE_TITLES).indexOf(activeTab) + 1).padStart(2, '0');

  return (
    <header className="atelier-page-header relative mb-8 pt-2">
      <span className="atelier-index font-display select-none" aria-hidden>{index}</span>
      <div className="relative z-10 pl-1">
        <p className="text-[10px] uppercase tracking-[0.45em] text-maroon-500/80 font-semibold mb-3 flex items-center gap-3">
          <span className="atelier-rule" />
          {meta.subtitle}
        </p>
        <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold text-maroon-950 leading-[0.92] tracking-tight">
          {meta.title}
        </h1>
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