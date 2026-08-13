import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppCard } from './AppCard';

export interface AppStatCardProps {
  title: string;
  value: string;
  href: string;
  icon: ReactNode;
  tone?: 'purple' | 'green' | 'blue' | 'orange' | 'pink';
  change?: number | null;
  comparison?: string;
}

const tones = {
  purple: 'bg-[#5b2bd8]',
  green: 'bg-[#17b26a]',
  blue: 'bg-[#2188e8]',
  orange: 'bg-[#f59e0b]',
  pink: 'bg-[#ec4899]',
} as const;

export function AppStatCard({ title, value, href, icon, tone = 'purple', change, comparison }: AppStatCardProps) {
  const positive = (change ?? 0) >= 0;
  return (
    <Link to={href} className="block">
      <AppCard className="group relative min-h-[190px] overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-sm font-semibold text-[#3d3d52] dark:text-slate-300">{title}</p><p className="mt-3 truncate text-2xl font-bold text-[#25253b] dark:text-white">{value}</p></div>
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${tones[tone]}`}>{icon}</span>
        </div>
        {change !== undefined && <div className="mt-5 flex items-center gap-2 text-xs"><span className={`inline-flex items-center gap-0.5 font-bold ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>{positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(change ?? 0).toFixed(0)}%</span><span className="text-slate-400">{comparison}</span></div>}
        <span className={`absolute inset-x-5 bottom-3 h-10 rounded-full opacity-10 blur-xl transition group-hover:opacity-20 ${tones[tone]}`} />
      </AppCard>
    </Link>
  );
}
