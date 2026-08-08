import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid3x3, ChefHat, ListOrdered, Plus, Wifi, WifiOff, Timer,
  Moon, Sun, LogOut, Tag,
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

  const navBtn = (id: Exclude<PosPanelId, null>, icon: React.ReactNode, label: string, badge: number, activeTone: string, inactiveTone: string) => (
    <button
      onClick={() => onPanel(id)}
      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
        panel === id ? activeTone : inactiveTone
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
      {badge > 0 && (
        <span className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
          panel === id ? 'bg-white/25 text-white' : 'bg-brand-600 text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <header className="flex-shrink-0 h-16 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800 flex items-center gap-2 px-3 z-30 shadow-sm">
      {/* ===== Brand ===== */}
      <div className="flex items-center gap-2 pe-2">
        <Logo variant="mark" size={32} tone="auto" />
        <div className="leading-tight hidden sm:block">
          <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Premier</p>
          <p className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest">{t('pos')}</p>
        </div>
        <button
          onClick={onNewOrder}
          className="ms-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 dark:bg-brand-600 hover:opacity-90 text-white text-xs font-bold shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{t('newOrder')}</span>
        </button>
      </div>

      <div className="w-px h-8 bg-slate-200 dark:bg-navy-700 mx-1 hidden sm:block" />

      {/* ===== Center: Active Orders / Tables / Kitchen ===== */}
      <nav className="flex items-center gap-1">
        {navBtn('orders', <ListOrdered className="w-4 h-4" />, t('activeOrders'), counts.activeOrders,
          'bg-brand-600 text-white shadow-md shadow-brand-600/30',
          'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700')}
        {navBtn('tables', <Grid3x3 className="w-4 h-4" />, t('tables'), counts.occupiedTables,
          'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
          'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700')}
        {navBtn('kitchen', <ChefHat className="w-4 h-4" />, t('kitchen'), counts.kitchenOrders,
          'bg-orange-600 text-white shadow-md shadow-orange-600/30',
          'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700')}
      </nav>

      <div className="flex-1" />

      {/* ===== Connection ===== */}
      <div
        className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
          online
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300'
        }`}
        title={t('connection')}
      >
        {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        <span className="hidden lg:inline">{online ? t('online') : t('offline')}</span>
      </div>

      {/* ===== Clock ===== */}
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-bold text-slate-700 dark:text-slate-200">
        <span className="text-slate-400 dark:text-slate-500">{now.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* ===== Shift (cashier) ===== */}
      {isCashier && shiftChecked && (
        <button
          onClick={() => navigate('/shifts')}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
            activeShift
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300'
          }`}
          title={activeShift ? t('closeShift') : t('openShift')}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>{activeShift ? t('open') : t('noOpenShift')}</span>
        </button>
      )}

      {/* ===== Branch ===== */}
      <div className="hidden xl:flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={branchId}
          disabled={!canChangeBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          className="text-xs border-0 bg-slate-100 dark:bg-navy-800 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 max-w-[140px] truncate"
        >
          <option value="">{isAr ? 'اختر الفرع' : 'Select Branch'}</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
        </select>
      </div>

      {/* ===== User ===== */}
      <div className="hidden sm:flex items-center gap-2 ps-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 ring-1 ring-gold-500/40 flex items-center justify-center text-white font-bold text-xs">
          {(user?.full_name || user?.email || '?')[0].toUpperCase()}
        </div>
        <div className="leading-tight hidden lg:block">
          <p className="text-xs font-semibold text-slate-800 dark:text-white max-w-[110px] truncate">{user?.full_name || user?.email}</p>
          <p className="text-[10px] text-slate-400">{user?.role}</p>
        </div>
      </div>

      {/* ===== Theme + Logout ===== */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        title={theme === 'light' ? t('darkMode') : t('lightMode')}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={onExit}
          className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          title={isAr ? 'لوحة التحكم' : 'Dashboard'}
        >
          <LogOut className="w-4 h-4 rotate-180" />
        </button>
        <button
          onClick={() => void signOut()}
          className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          title={t('logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
