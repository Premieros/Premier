import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Loader2, RefreshCw, Store } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import * as api from '@/api';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { Card, PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';

interface BranchRow { id: string; name: string; name_en: string | null; is_active: boolean; }
type Period = 'monthly' | 'yearly';

export function SubscriptionsAdminPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, SubscriptionStatus>>({});
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [periodFor, setPeriodFor] = useState<Record<string, Period>>({});
  const [activating, setActivating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, pRes] = await Promise.all([
      api.supabase.from('branches').select('id, name, name_en, is_active').order('name', { ascending: true }),
      api.subscriptions.listPlans(),
    ]);
    if (bRes.error) show(bRes.error.message, 'error');
    if (pRes.error) show(pRes.error.message, 'error');
    setBranches((bRes.data as BranchRow[] | null) ?? []);
    setPlans((pRes.data ?? []).filter((p) => p.is_active));
    const map: Record<string, SubscriptionStatus> = {};
    await Promise.all((((bRes.data as BranchRow[] | null) ?? []).map(async (b) => {
      const r = await api.subscriptions.status({ p_branch_id: b.id });
      if (!r.error && r.data) map[b.id] = r.data as SubscriptionStatus;
    })));
    setStatusMap(map);
    setLoading(false);
  }, [show]);

  useEffect(() => { void load(); }, [load]);

  const statusMeta = useMemo(() => ({
    active: { label: t('subscriptionActive'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    trial: { label: t('subscriptionTrial'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    past_due: { label: t('subscriptionPastDue'), cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    cancelled: { label: t('subscriptionCancelled'), cls: 'bg-slate-200 text-slate-600 dark:bg-navy-700 dark:text-slate-300' },
    expired: { label: t('subscriptionExpiredStatus'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  }), [t]);

  const activate = async (branchId: string, planId: string) => {
    setActivating(branchId);
    const { data, error } = await api.subscriptions.activate({ p_branch_id: branchId, p_plan_id: planId, p_billing_period: periodFor[branchId] || period });
    setActivating(null);
    if (error || !data?.success) { show(t('planActivationFailed'), 'error'); return; }
    show(t('planActivated'), 'success');
    await load();
  };

  if (user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title={t('subscriptionsAdmin')} subtitle={t('subscriptionsAdminSub')} />
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('refresh')}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['monthly', 'yearly'] as Period[]).map((p) => <button key={p} type="button" onClick={() => setPeriod(p)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${period === p ? 'bg-brand-600 text-white shadow' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-navy-800 dark:text-slate-300'}`}>{t(p === 'monthly' ? 'monthly' : 'yearly')}</button>)}
      </div>
      {loading ? <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div> : <div className="space-y-4">
        {branches.map((b) => {
          const st = statusMap[b.id];
          const meta = st ? statusMeta[st.status as keyof typeof statusMeta] : statusMeta.expired;
          const planName = st?.plan_id ? plans.find((p) => p.id === st.plan_id) : null;
          const daysLeft = st?.status === 'trial' && st.trial_ends_at ? Math.max(0, Math.ceil((new Date(st.trial_ends_at).getTime() - Date.now()) / 86400000)) : null;
          const selPeriod = periodFor[b.id] || period;
          return <Card key={b.id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white dark:bg-brand-600"><Store className="h-5 w-5" /></div><div><p className="font-bold text-slate-900 dark:text-white">{isAr ? b.name : (b.name_en || b.name)}</p><span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.cls}`}>{st?.expired ? <AlertTriangle className="h-3 w-3" /> : <BadgeCheck className="h-3 w-3" />}{meta.label}</span></div></div>
            <div className="flex flex-wrap items-center gap-3"><div className="text-sm text-slate-500 dark:text-slate-400"><p>{t('plan')}: <span className="font-bold text-slate-800 dark:text-white">{planName ? (isAr ? planName.name_ar : planName.name_en) : (st?.status === 'trial' ? t('subscriptionTrial') : '—')}</span></p>{st?.trial_ends_at && <p className="mt-0.5">{t('trialEnds')}: {formatDate(st.trial_ends_at, lang)}{daysLeft !== null ? ` (${daysLeft} ${t('daysRemaining')})` : ''}</p>}{st?.current_period_ends_at && <p className="mt-0.5">{t('planActiveUntil')}: {formatDate(st.current_period_ends_at, lang)}</p>}</div>
              <div className="flex items-center gap-2"><select value={selPeriod} onChange={(e) => setPeriodFor((prev) => ({ ...prev, [b.id]: e.target.value as Period }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-navy-700 dark:bg-navy-800"><option value="monthly">{t('monthly')}</option><option value="yearly">{t('yearly')}</option></select><select value="" onChange={(e) => { if (e.target.value) void activate(b.id, e.target.value); e.target.value = ''; }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-navy-700 dark:bg-navy-800"><option value="">{t('choosePlan')}…</option>{plans.map((p) => <option key={p.id} value={p.id}>{isAr ? p.name_ar : p.name_en} — {formatCurrency(selPeriod === 'monthly' ? p.monthly_price_egp : p.yearly_price_egp)}</option>)}</select>{activating === b.id && <Loader2 className="h-5 w-5 animate-spin text-brand-600" />}</div>
            </div></div></Card>;
        })}
      </div>}
    </div>
  );
}
