import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Check, CreditCard, Copy, Loader2, Upload, WalletCards } from 'lucide-react';
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
  const { lang } = useLanguage();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const isAdmin = isAdminRole(user?.role);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [reference, setReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshSubscription().catch(() => {});
    api.subscriptions.listPlans().then(({ data }) => setPlans((data ?? []).filter((p) => p.is_active)));
  }, [refreshSubscription]);

  const status = subscription?.status;
  const statusLabel = status === 'active' ? (isAr ? 'نشط' : 'Active') : status === 'trial' ? (isAr ? 'تجريبي' : 'Trial') : status === 'expired' ? (isAr ? 'منتهي' : 'Expired') : (isAr ? 'غير مشترك' : 'No subscription');
  const daysLeft = useMemo(() => subscription?.trial_ends_at ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000)) : null, [subscription]);

  const submitPayment = async () => {
    if (!selected || !user?.branch_id) return;
    setSubmitting(true);
    const amount = period === 'monthly' ? selected.monthly_price_egp : selected.yearly_price_egp;
    const { data, error } = await api.supabase.rpc('submit_instapay_payment', { p_branch_id: user.branch_id, p_plan_id: selected.id, p_amount: amount, p_billing_period: period, p_reference: reference || null, p_receipt_url: receiptUrl || null });
    setSubmitting(false);
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || (isAr ? 'تعذر إرسال الطلب' : 'Payment submission failed'), 'error'); return; }
    show(isAr ? 'تم إرسال طلب التحويل للمراجعة' : 'Transfer submitted for review', 'success');
    setSelected(null); setReference(''); setReceiptUrl('');
  };

  const copyInstaPay = async () => {
    const handle = import.meta.env.VITE_INSTAPAY_HANDLE as string | undefined;
    if (!handle) return show(isAr ? 'لم يتم ضبط حساب InstaPay بعد' : 'InstaPay account is not configured yet', 'error');
    await navigator.clipboard.writeText(handle);
    show(isAr ? 'تم نسخ حساب InstaPay' : 'InstaPay account copied', 'success');
  };

  return <div className="space-y-6 pb-10">
    <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-navy-900 to-slate-800 p-6 text-white shadow-xl"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm text-gold-300"><CreditCard className="h-4 w-4" />{isAr ? 'الاشتراك والدفع' : 'Subscription & Billing'}</div><h1 className="text-3xl font-bold">{isAr ? 'اشتراك Premier' : 'Premier Subscription'}</h1><p className="mt-2 text-sm text-slate-300">{isAr ? 'اختر خطتك وحوّل قيمة الاشتراك عبر InstaPay.' : 'Choose your plan and pay by InstaPay transfer.'}</p></div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold"><BadgeCheck className="h-4 w-4" />{statusLabel}</div></div></div>
    {subscription?.expired && !isAdmin && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"><div className="flex gap-3"><AlertTriangle className="h-5 w-5" />{isAr ? 'انتهى الاشتراك. أرسل طلب تجديد عبر InstaPay.' : 'Your subscription expired. Submit an InstaPay renewal request.'}</div></div>}
    <Card className="p-5"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">{isAr ? 'الفرع' : 'Branch'}</p><p className="font-bold">{user?.branch_id || '—'}</p></div><div><p className="text-xs text-slate-400">{isAr ? 'التجربة' : 'Trial'}</p><p className="font-bold">{daysLeft === null ? '—' : `${daysLeft} ${isAr ? 'يوم' : 'days'}`}</p></div><div><p className="text-xs text-slate-400">{isAr ? 'ينتهي في' : 'Active until'}</p><p className="font-bold">{subscription?.current_period_ends_at ? formatDate(subscription.current_period_ends_at, lang) : '—'}</p></div></div></Card>
    <Card className="p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{isAr ? 'اختر الخطة' : 'Choose a plan'}</h2><p className="text-sm text-slate-400">{isAr ? 'الدفع يتم يدويًا عبر InstaPay ويعتمد بعد المراجعة.' : 'Payment is manual via InstaPay and activated after review.'}</p></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-navy-800">{(['monthly','yearly'] as Period[]).map(p => <button key={p} onClick={() => setPeriod(p)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${period === p ? 'bg-white shadow dark:bg-navy-700' : 'text-slate-500'}`}>{p === 'monthly' ? (isAr ? 'شهري' : 'Monthly') : (isAr ? 'سنوي' : 'Yearly')}</button>)}</div></div><div className="grid gap-4 md:grid-cols-3">{plans.map(plan => <div key={plan.id} className="flex flex-col rounded-2xl border border-slate-200 p-5 dark:border-navy-700"><h3 className="text-lg font-bold">{isAr ? plan.name_ar : plan.name_en}</h3><p className="mt-2 text-3xl font-black">{period === 'monthly' ? plan.monthly_price_egp : plan.yearly_price_egp}<span className="text-sm font-medium text-slate-400"> EGP</span></p><ul className="mt-4 flex-1 space-y-2">{Array.isArray(plan.features) && plan.features.map((f, i) => <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><Check className="h-4 w-4 text-emerald-500" />{f}</li>)}</ul><Button className="mt-5 w-full" onClick={() => setSelected(plan)}><WalletCards className="h-4 w-4" />{isAr ? 'الدفع عبر InstaPay' : 'Pay with InstaPay'}</Button></div>)}</div></Card>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-navy-900"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">{isAr ? 'تحويل InstaPay' : 'InstaPay transfer'}</h2><p className="mt-1 text-sm text-slate-500">{isAr ? 'الخطة' : 'Plan'}: {isAr ? selected.name_ar : selected.name_en}</p></div><button onClick={() => setSelected(null)} className="text-slate-400">×</button></div><div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-navy-800"><p className="text-xs text-slate-500">{isAr ? 'المبلغ المطلوب' : 'Amount due'}</p><p className="text-3xl font-black">{period === 'monthly' ? selected.monthly_price_egp : selected.yearly_price_egp} EGP</p><div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 dark:bg-navy-700"><span>{(import.meta.env.VITE_INSTAPAY_HANDLE as string | undefined) || (isAr ? 'اضبط حساب InstaPay في إعدادات البيئة' : 'Configure VITE_INSTAPAY_HANDLE')}</span><button onClick={copyInstaPay}><Copy className="h-4 w-4" /></button></div></div><div className="mt-4 space-y-3"><input value={reference} onChange={e => setReference(e.target.value)} placeholder={isAr ? 'مرجع التحويل' : 'Transfer reference'} className="w-full rounded-xl border p-3 dark:border-navy-700 dark:bg-navy-800"/><input value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} placeholder={isAr ? 'رابط صورة الإيصال (اختياري)' : 'Receipt image URL (optional)'} className="w-full rounded-xl border p-3 dark:border-navy-700 dark:bg-navy-800"/><div className="flex gap-2"><Button variant="outline" onClick={() => setSelected(null)} className="flex-1">{isAr ? 'إلغاء' : 'Cancel'}</Button><Button onClick={submitPayment} disabled={submitting} className="flex-1">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{isAr ? 'إرسال للمراجعة' : 'Submit for review'}</Button></div></div></div></div>}
  </div>;
}
