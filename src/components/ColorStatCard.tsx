import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

export type ColorVariant = 'blue' | 'green' | 'yellow' | 'pink' | 'purple' | 'cyan' | 'orange';

const VARIANT_CLASS: Record<ColorVariant, string> = {
  blue: 'color-card-blue',
  green: 'color-card-green',
  yellow: 'color-card-yellow',
  pink: 'color-card-pink',
  purple: 'color-card-purple',
  cyan: 'color-card-cyan',
  orange: 'color-card-orange',
};

export function ColorStatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = 'blue',
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  variant?: ColorVariant;
  className?: string;
}) {
  return (
    <div className={cn('color-stat-card', VARIANT_CLASS[variant], className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="color-stat-label">{label}</p>
        {Icon && <Icon className="w-5 h-5 color-stat-icon shrink-0" strokeWidth={2} />}
      </div>
      <p className="color-stat-value">{value}</p>
      {sub && <p className="color-stat-sub">{sub}</p>}
    </div>
  );
}

export function AnnouncementCard({
  title,
  message,
  variant = 'green',
}: {
  title: string;
  message: string;
  variant?: ColorVariant;
}) {
  return (
    <div className={cn('announcement-card', `announcement-${variant}`)}>
      <p className="announcement-title">{title}</p>
      <p className="announcement-message">{message}</p>
    </div>
  );
}

export function ColorMiniStat({
  label,
  value,
  variant = 'blue',
}: {
  label: string;
  value: string | number;
  variant?: ColorVariant;
}) {
  return (
    <div className={cn('color-mini-stat', VARIANT_CLASS[variant])}>
      <p className="color-mini-value">{value}</p>
      <p className="color-mini-label">{label}</p>
    </div>
  );
}