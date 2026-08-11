import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, Check, ExternalLink, Loader2, RefreshCw, Store, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import * as api from '@/api';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { Card, PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';

interface BranchRow { id: string; name: string; name_en: string | null; is_active: boolean }
interface PaymentRow { id: string; branch_id: string; plan_id: string | null; amount: number; billing_period: 'monthly'|'yearly'; reference: string|null; receipt_url: string|null; status: 'pending'|'approved'|'rejected'; submitted_at: string; rejection_reason: string|null }

export function SubscriptionsAdminPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SubscriptionStatus>>({});
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string|null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [b, p, pay] = await Promise.all([
      api.supabase.from('branches').select('id,name,name_en,is_active').order('name'),
      api.subscriptions.listPlans(),
      api.supabase.from('subscription_payments').select('id,branch_id,plan_id,amount,billing_period,reference,receipt_url,status,submitted_at,rejection_reason').order('submitted_at', { ascending: false }),
    ]);
    if (b.error || pay.error || p.error) show((b.error || pay.error || p.error)?.message || 'Load failed', 'error');
    setBranches((b.data as BranchRow[] | null) ?? []);
    setPlans((p.data ?? []).filter(x => x.is_active));
    setPayments((pay.data as PaymentRow[] | null) ?? []);
    const map: Record<string, SubscriptionStatus> = {};
    await Promise.all(((b.data as BranchRow[] | null) ?? []).map(async branch => { const r = await api.subscriptions.status({ p_branch_id: branch.id }); if (!r.error && r.data) map[branch.id] = r.data; }));
    setStatuses(map);
    setLoading(false);
  }, [show]);

  useEffect(() => { void load(); }, [load]);
  if (user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  const review = async (id: string, approve: boolean) => {
    setReviewing(id);
    const { data, error } = await api.supabase.rpc('review_instapay_payment', { p_payment_id: id, p_approve: approve, p_rejection_reason: approve ? null : (rejectReason || (isAr ? 'لم يتم اعتماد التحويل' : 'Transfer was not approved')) });
    setReviewing(null);
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || 'Review failed', 'error'); return; }
    setRejectReason('');
    show(approve ? (isAr ? 'تم اعتماد الاشتراك' : 'Subscription approved') : (isAr ? 'تم رفض التحويل' : 'Payment rejected'), 'success');
    await load();
  };

  return <div className="space-y-6 pb-10">
    <div className="flex items-end justify-between gap-4"><PageHeader title={isAr ? 'إدارة الاشتراكات والمدفوعات' : 'Subscriptions & Payments'} subtitle={isAr ? 'Super Admin فقط — إدارة عالمية لجميع الفروع' : 'Super Admin only — global management for every branch'} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />{isAr ? 'تحديث' : 'Refresh'}</Button></div>
    <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">{isAr ? 'طلبات InstaPay المعلقة' : 'Pending InstaPay payments'}</h2><p className="text-sm text-slate-400">{isAr ? 'اعتماد التحويل يفعّل الاشتراك مباشرة.' : 'Approval activates the subscription immediately.'}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">{payments.filter(x=>x.status==='pending').length}</span></div>{payments.length === 0 ? <p className="py-8 text-center text-slate-400">{isAr ? 'لا توجد عمليات دفع' : 'No payments found'}</p> : <div className="space-y-3">{payments.map(pay => { const branch = branches.find(b=>b.id===pay.branch_id); const plan = plans.find(p=>p.id===pay.plan_id); return <div key={pay.id} className="rounded-2xl border border-slate-200 p-4 dark:border-navy-700"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><Store className="h-4 w-4"/><span className="font-bold">{branch ? (isAr ? branch.name : (branch.name_en || branch.name)) : pay.branch_id}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pay.status==='pending'?'bg-amber-100 text-amber-700':pay.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{pay.status}</span></div><p className="mt-1 text-sm text-slate-500">{plan ? (isAr ? plan.name_ar : plan.name_en) : '—'} · {formatCurrency(pay.amount)} · {pay.billing_period}</p><p className="mt-1 text-xs text-slate-400">{formatDate(pay.submitted_at, lang)} {pay.reference ? `· ${pay.reference}` : ''}</p></div><div className="flex flex-wrap items-center gap-2">{pay.receipt_url && <a href={pay.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><ExternalLink className="h-4 w-4"/>{isAr?'الإيصال':'Receipt'}</a>}{pay.status==='pending' && <><Button onClick={()=>void review(pay.id,true)} disabled={reviewing===pay.id}><Check className="h-4 w-4"/>{isAr?'اعتماد':'Approve'}</Button><Button variant="outline" onClick={()=>void review(pay.id,false)} disabled={reviewing===pay.id}><X className="h-4 w-4"/>{isAr?'رفض':'Reject'}</Button></>}{reviewing===pay.id && <Loader2 className="h-5 w-5 animate-spin"/>}</div></div></div>})}</div>}</Card>
    <Card className="p-5"><h2 className="mb-4 text-xl font-bold">{isAr ? 'الفروع والاشتراكات' : 'Branches & subscriptions'}</h2>{loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> : <div className="grid gap-3 md:grid-cols-2">{branches.map(branch=>{const st=statuses[branch.id];return <div key={branch.id} className="rounded-2xl border p-4 dark:border-navy-700"><div className="flex items-center justify-between"><div><p className="font-bold">{isAr?branch.name:(branch.name_en||branch.name)}</p><p className="text-sm text-slate-500">{st?.status || '—'} {st?.current_period_ends_at ? `· ${formatDate(st.current_period_ends_at,lang)}` : ''}</p></div>{st?.expired?<AlertTriangle className="text-red-500"/>:<BadgeCheck className="text-emerald-500"/>}</div><div className="mt-3 flex flex-wrap gap-2">{plans.map(plan=><span key={plan.id} className={`rounded-lg border px-2 py-1 text-xs ${st?.plan_id===plan.id?'border-brand-500 bg-brand-50 font-bold':''}`}>{isAr?plan.name_ar:plan.name_en}</span>)}</div></div>})}</div>}</Card>
  </div>;
}
