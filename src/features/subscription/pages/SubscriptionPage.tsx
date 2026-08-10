import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Check, CreditCard, Loader2, ShoppingBag } from 'lucide-react';
import * as api from '@/api';
import type { SubscriptionPlan } from '@/lib/types';
import { isAdminRole } from '@/lib/permissions';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';

type Period = 'monthly' | 'yearly';

export function SubscriptionPage() {
  const { user, subscription, refreshSubscription } = useAuth();
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const isAdmin = isAdminRole(user?.role);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    refreshSubscription().catch(() => {});
    api.subscriptions.listPlans().then(({ data, error }) => {
      if (!error && data) setPlans(data.filter((p) => p.is_active));
    });
  }, [refreshSubscription]);

  const statusMeta = useMemo(() => {
    const s = subscription?.status;
    if (s === 'active') return { label: t('subscriptionActive'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
    if (s === 'trial') return { label: t('subscriptionTrial'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    if (s === 'past_due') return { label: t('subscriptionPastDue'), cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' };
    if (s === 'cancelled') return { label: t('subscriptionCancelled'), cls: 'bg-slate-200 text-slate-600 dark:bg-navy-700 dark:text-slate-300' };
    if (s === 'expired') return { label: t('subscriptionExpiredStatus'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    return { label: t('subscriptionNone'), cls: 'bg-slate-200 text-slate-600 dark:bg-navy-700 dark:text-slate-300' };
  }, [subscription, t]);

  const planName = useMemo(() => {
    if (!subscription?.plan_id) return null;
    return plans.find((p) => p.id === subscription?.plan_id);
  }, [subscription, plans]);

  const daysLeft = useMemo(() => {
    const d = subscription?.status === 'trial' ? subscription?.trial_ends_at : null;
    if (!d) return null;
    return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
  }, [subscription]);

  const activate = async (planId: string) => {
    if (!user?.branch_id) return;
    setActivating(planId);
    const { data, error } = await api.subscriptions.activate({
      p_branch_id: user.branch_id,
      p_plan_id: planId,
      p_billing_period: period,
    });
    setActivating(null);
    if (error || !data?.success) {
      show(t('planActivationFailed'), 'error');
      return;
    }
    show(t('planActivated'), 'success');
    refreshSubscription().catch(() => {});
  };

  const expiredBlocked = Boolean(subscription?.expired && user?.branch_id && !isAdmin);

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-navy-900 to-slate-800 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gold-300"><CreditCard className="h-4 w-4" />{t('subscriptionInfo')}</div>
            <h1 className="text-3xl font-bold">{t('mySubscription')}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{t('subscriptionStatus')}</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${statusMeta.cls}`}>
            {subscription?.expired ? <AlertTriangle className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
            {statusMeta.label}
          </div>
        </div>
      </div>

      {expiredBlocked && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">{t('subscriptionExpiredMsg')}</p>
              <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">{t('contactAdmin')}</p>
            </div>
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-navy-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('branch')}</p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">{user?.full_name ?? user?.email ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-navy-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('plan')}</p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">
              {planName ? (isAr ? planName.name_ar : planName.name_en) : (subscription?.status === 'trial' ? t('subscriptionTrial') : '—')}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-navy-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('trialEnds')}</p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">
              {subscription?.trial_ends_at ? formatDate(subscription.trial_ends_at, lang) : '—'}
              {daysLeft !== null && <span className="ms-2 text-sm font-medium text-slate-400">({daysLeft} {t('daysRemaining')})</span>}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-navy-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('planActiveUntil')}</p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">
              {subscription?.current_period_ends_at ? formatDate(subscription.current_period_ends_at, lang) : '—'}
            </p>
          </div>
        </div>
      </Card>

      {isAdmin && user?.branch_id && (
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('choosePlan')}</h3>
              <p className="text-sm text-slate-400">{t('plansGrid')}</p>
            </div>
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-navy-800">
              {(['monthly', 'yearly'] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${period === p ? 'bg-white text-brand-700 shadow-sm dark:bg-navy-700 dark:text-gold-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {t(p === 'monthly' ? 'monthly' : 'yearly')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative flex flex-col rounded-2xl border p-5 dark:border-navy-700 ${subscription?.plan_id === plan.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200'}`}>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{isAr ? plan.name_ar : plan.name_en}</h4>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {period === 'monthly' ? plan.monthly_price_egp : plan.yearly_price_egp}
                  <span className="text-sm font-semibold text-slate-400">{t(period === 'monthly' ? 'monthlyPrice' : 'yearlyPrice')}</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {Array.isArray(plan.features) && plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={subscription?.plan_id === plan.id ? 'secondary' : 'primary'}
                  disabled={activating === plan.id || subscription?.plan_id === plan.id}
                  onClick={() => activate(plan.id)}
                >
                  {activating === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                  {subscription?.plan_id === plan.id ? t('subscriptionActive') : t('activatePlan')}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isAdmin && !user?.branch_id && (
        <Card className="p-5"><p className="text-sm text-slate-500 dark:text-slate-400">{t('subscriptionNoBranch')}</p></Card>
      )}
    </div>
  );
}
