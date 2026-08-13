import { type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div data-testid="page-header" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav data-testid="page-breadcrumbs" aria-label="Breadcrumbs" className="mb-1.5 flex flex-wrap items-center gap-1 text-xs">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <span key={crumb.label + i} className="flex items-center gap-1">
                  {crumb.href && !last ? (
                    <Link to={crumb.href} className="font-medium text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400">{crumb.label}</Link>
                  ) : (
                    <span className={clsx(last ? 'font-semibold text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500')}>{crumb.label}</span>
                  )}
                  {!last && <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 [dir='rtl']:rotate-180" />}
                </span>
              );
            })}
          </nav>
        )}
        <h1 data-testid="page-title" className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p data-testid="page-description" className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div data-testid="page-actions" className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-navy-900 rounded-2xl shadow-soft border border-slate-100 dark:border-navy-800/70',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color?: string;
  trend?: string;
}

export function StatCard({ title, value, icon, color = 'navy', trend }: StatCardProps) {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    navy: { bg: 'bg-navy-50 dark:bg-navy-800/50', icon: 'text-navy-700 dark:text-navy-200', border: 'border-navy-100 dark:border-navy-700' },
    gold: { bg: 'bg-gold-50 dark:bg-gold-500/10', icon: 'text-gold-600 dark:text-gold-400', border: 'border-gold-100 dark:border-gold-500/20' },
    brand: { bg: 'bg-brand-50 dark:bg-brand-900/20', icon: 'text-brand-600 dark:text-brand-400', border: 'border-brand-200 dark:border-brand-800' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  };

  const c = colorMap[color] || colorMap.navy;

  return (
    <Card className="p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">{value}</p>
          {trend && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{trend}</p>}
        </div>
        <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center border', c.bg, c.icon, c.border)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
