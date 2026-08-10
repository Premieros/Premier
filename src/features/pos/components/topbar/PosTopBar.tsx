import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid3x3, ChefHat, ListOrdered, Plus, Wifi, WifiOff, Timer,
  Moon, Sun, LogOut, Tag, Zap, Clock3,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import type { Branch } from '@/lib/types';
import type { ActiveShiftInfo } from '../../hooks/usePosOrder';

export type PosPanelId = 'orders' | 'tables' | 'kitchen' | null;

interface PosTopBarProps {
  panel: PosPanelId;
  onPanel: (p: Exclude<PosPanelId, null>) => void;
  counts: { activeOrders: number; occupiedTables: number; kitchenOrders: number; heldOrders: number; deliveryOrders: number; takeawayOrders: number };
  branchId: string;
  branches: Branch[];
  canChangeBranch: boolean;
  onBranchChange: (id: string) => void;
  isCashier: boolean;
  shiftChecked: boolean;
  activeShift: ActiveShiftInfo | null;
  onNewOrder: () => void;
  onExit: () => void;
}

export function PosTopBar({
  panel, onPanel, counts, branchId, branches, canChangeBranch,
  onBranchChange, isCashier, shiftChecked, activeShift, onNewOrder, onExit,
}: PosTopBarProps) {
  const { t, lang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { clearInterval(id); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const navBtn = (
    id: Exclude<PosPanelId, null>,
    icon: React.ReactNode,
    label: string,
    badge: number,
    activeTone: string,
  ) => (
    <button
      onClick={() => onPanel(id)}
      aria-pressed={panel === id}
      className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all active:scale-[0.97] border ${
        panel === id
          ? `${activeTone} border-transparent shadow-lg`
          : 'bg-slate-50 dark:bg-navy-800/80 border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-navy-700 hover:border-slate-300 dark:hover:border-navy-600'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
      {badge > 0 && (
        <span className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
          panel === id ? 'bg-white/20 text-white' : 'bg-slate-900 dark:bg-gold-500 text-white dark:text-navy-950'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <header className="flex-shrink-0 h-[72px] bg-white/95 dark:bg-navy-900/95 backdrop-blur border-b border-slate-200 dark:border-navy-800 flex items-center gap-2 px-3 md:px-4 z-30 shadow-sm">
      {/* Brand + primary action */}
      <div className="flex items-center gap-2.5 pe-2 shrink-0">
        <Logo variant="mark" size={38} tone="auto" />
        <div className="leading-tight hidden sm:block">
          <p className="text-[15px] font-black text-slate-950 dark:text-white tracking-tight">Premier</p>
          <p className="text-[9px] font-black text-gold-600 dark:text-gold-400 uppercase tracking-[0.18em]">{t('pos')}</p>
        </div>
        <button
          onClick={onNewOrder}
          className="ms-1 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 dark:bg-gold-500 hover:bg-slate-800 dark:hover:bg-gold-400 text-white dark:text-navy-950 text-xs font-black shadow-lg shadow-slate-900/10 dark:shadow-gold-500/10 active:scale-[0.97] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('newOrder')}</span>
        </button>
      </div>

      <div className="w-px h-9 bg-slate-200 dark:bg-navy-700 hidden sm:block" />

      {/* Fast workspace navigation */}
      <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {navBtn('orders', <ListOrdered className="w-4 h-4" />, t('activeOrders'), counts.activeOrders, 'bg-brand-600 text-white')}
        {navBtn('tables', <Grid3x3 className="w-4 h-4" />, t('tables'), counts.occupiedTables, 'bg-emerald-600 text-white')}
        {navBtn('kitchen', <ChefHat className="w-4 h-4" />, t('kitchen'), counts.kitchenOrders, 'bg-orange-600 text-white')}
      </nav>

      <div className="flex-1 min-w-2" />

      {/* Connection + time */}
      <div className={`hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-extrabold ${
        online
          ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
          : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
      }`} title={t('connection')}>
        {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        <span>{online ? t('online') : t('offline')}</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-bold text-slate-600 dark:text-slate-200">
        <Clock3 className="w-3.5 h-3.5 text-slate-400" />
        <span>{now.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Cashier shift status */}
      {isCashier && shiftChecked && (
        <button
          onClick={() => navigate('/shifts')}
          className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-extrabold transition-all active:scale-[0.97] ${
            activeShift
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
          }`}
          title={activeShift ? t('closeShift') : t('openShift')}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>{activeShift ? t('open') : t('noOpenShift')}</span>
        </button>
      )}

      {/* Branch */}
      <div className="hidden xl:flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 px-2">
        <Tag className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={branchId}
          disabled={!canChangeBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          className="text-xs border-0 bg-transparent rounded-lg px-1.5 py-2 text-slate-700 dark:text-slate-200 font-extrabold focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 max-w-[145px] truncate"
        >
          <option value="">{isAr ? 'اختر الفرع' : 'Select Branch'}</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
        </select>
      </div>

      {/* User */}
      <div className="hidden lg:flex items-center gap-2 ps-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-navy-700 dark:to-navy-950 ring-1 ring-gold-500/40 flex items-center justify-center text-white font-black text-xs">
          {(user?.full_name || user?.email || '?')[0].toUpperCase()}
        </div>
        <div className="leading-tight max-w-[125px]">
          <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">{user?.full_name || user?.email}</p>
          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-gold-500" />{user?.role}</p>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        title={theme === 'light' ? t('darkMode') : t('lightMode')}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      <button
        onClick={onExit}
        className="hidden sm:flex p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
        title={isAr ? 'لوحة التحكم' : 'Dashboard'}
      >
        <LogOut className="w-4 h-4 rotate-180" />
      </button>
      <button
        onClick={() => void signOut()}
        className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
        title={t('logout')}
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
}
