import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, Check, ExternalLink, Loader2, RefreshCw, Settings, Store, X } from 'lucide-react';
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
interface SubscriptionSettings { id: boolean; instapay_id: string|null; beneficiary_name: string|null; qr_code_url: string|null; instructions_ar: string|null; instructions_en: string|null; trial_days: number; warning_days: number; grace_days: number; require_receipt: boolean; allow_monthly: boolean; allow_yearly: boolean }

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
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, p, pay, s] = await Promise.all([
      api.supabase.from('branches').select('id,name,name_en,is_active').order('name'),
      api.subscriptions.listPlans(),
      api.supabase.from('subscription_payments').select('id,branch_id,plan_id,amount,billing_period,reference,receipt_url,status,submitted_at,rejection_reason').order('submitted_at', { ascending: false }),
      api.supabase.rpc('subscription_settings_get'),
    ]);
    if (b.error || pay.error || p.error || s.error) show((b.error || pay.error || p.error || s.error)?.message || 'Load failed', 'error');
    setBranches((b.data as BranchRow[] | null) ?? []);
    setPlans((p.data ?? []).filter(x => x.is_active));
    setPayments((pay.data as PaymentRow[] | null) ?? []);
    setSettings((s.data as SubscriptionSettings | null) ?? null);
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

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { data, error } = await api.supabase.rpc('subscription_settings_update', {
      p_instapay_id: settings.instapay_id,
      p_beneficiary_name: settings.beneficiary_name,
      p_qr_code_url: settings.qr_code_url,
      p_instructions_ar: settings.instructions_ar,
      p_instructions_en: settings.instructions_en,
      p_trial_days: settings.trial_days,
      p_warning_days: settings.warning_days,
      p_grace_days: settings.grace_days,
      p_require_receipt: settings.require_receipt,
      p_allow_monthly: settings.allow_monthly,
      p_allow_yearly: settings.allow_yearly,
    });
    setSavingSettings(false);
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || (isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings'), 'error'); return; }
    show(isAr ? 'تم حفظ إعدادات الاشتراكات' : 'Subscription settings saved', 'success');
  };

  const field = (label: string, value: string|number, onChange: (v:string)=>void, type: 'text'|'number'='text') => <label className="block space-y-1"><span className="text-sm font-semibold">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-ui-border bg-ui-surface px-3 py-2.5 outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900" /></label>;

  return <div className="space-y-6 pb-10">
    <div className="flex items-end justify-between gap-4"><PageHeader title={isAr ? 'إدارة الاشتراكات والمدفوعات' : 'Subscriptions & Payments'} subtitle={isAr ? 'Super Admin فقط — إدارة عالمية لجميع الفروع' : 'Super Admin only — global management for every branch'} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />{isAr ? 'تحديث' : 'Refresh'}</Button></div>

    <Card className="p-5"><div className="mb-4 flex items-center gap-3"><Settings className="h-5 w-5 text-brand-500"/><div><h2 className="text-xl font-bold">{isAr ? 'إعدادات الاشتراكات' : 'Subscription settings'}</h2><p className="text-sm text-ui-subtle">{isAr ? 'إعدادات عالمية — Super Admin فقط' : 'Global settings — Super Admin only'}</p></div></div>{!settings ? <div className="py-8 text-center text-ui-subtle">{isAr?'جارٍ تحميل الإعدادات...':'Loading settings...'}</div> : <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{field(isAr?'معرّف InstaPay':'InstaPay ID',settings.instapay_id??'',v=>setSettings({...settings,instapay_id:v}))}{field(isAr?'اسم المستفيد':'Beneficiary name',settings.beneficiary_name??'',v=>setSettings({...settings,beneficiary_name:v}))}{field('QR Code URL',''+(settings.qr_code_url??''),v=>setSettings({...settings,qr_code_url:v}))}</div><div className="grid gap-4 md:grid-cols-2">{field('تعليمات التحويل بالعربية',settings.instructions_ar??'',v=>setSettings({...settings,instructions_ar:v}))}{field('Transfer instructions (English)',settings.instructions_en??'',v=>setSettings({...settings,instructions_en:v}))}</div><div className="grid gap-4 md:grid-cols-3">{field(isAr?'أيام التجربة':'Trial days',settings.trial_days,v=>setSettings({...settings,trial_days:Number(v)}),'number')}{field(isAr?'أيام التنبيه قبل الانتهاء':'Warning days',settings.warning_days,v=>setSettings({...settings,warning_days:Number(v)}),'number')}{field(isAr?'فترة السماح':'Grace days',settings.grace_days,v=>setSettings({...settings,grace_days:Number(v)}),'number')}</div><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={settings.require_receipt} onChange={e=>setSettings({...settings,require_receipt:e.target.checked})}/>{isAr?'إلزام إيصال التحويل':'Require receipt'}</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.allow_monthly} onChange={e=>setSettings({...settings,allow_monthly:e.target.checked})}/>{isAr?'السداد الشهري':'Monthly billing'}</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.allow_yearly} onChange={e=>setSettings({...settings,allow_yearly:e.target.checked})}/>{isAr?'السداد السنوي':'Yearly billing'}</label></div><div className="flex justify-end"><Button onClick={()=>void saveSettings()} disabled={savingSettings}>{savingSettings&&<Loader2 className="h-4 w-4 animate-spin"/>}{isAr?'حفظ الإعدادات':'Save settings'}</Button></div></div>}</Card>

    <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">{isAr ? 'طلبات InstaPay المعلقة' : 'Pending InstaPay payments'}</h2><p className="text-sm text-ui-subtle">{isAr ? 'اعتماد التحويل يفعّل الاشتراك مباشرة.' : 'Approval activates the subscription immediately.'}</p></div><span className="rounded-full bg-ui-warning-soft px-3 py-1 text-sm font-bold text-ui-warning">{payments.filter(x=>x.status==='pending').length}</span></div>{payments.length === 0 ? <p className="py-8 text-center text-ui-subtle">{isAr ? 'لا توجد عمليات دفع' : 'No payments found'}</p> : <div className="space-y-3">{payments.map(pay => { const branch = branches.find(b=>b.id===pay.branch_id); const plan = plans.find(p=>p.id===pay.plan_id); return <div key={pay.id} className="rounded-2xl border border-ui-border p-4 dark:border-navy-700"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><Store className="h-4 w-4"/><span className="font-bold">{branch ? (isAr ? branch.name : (branch.name_en || branch.name)) : pay.branch_id}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pay.status==='pending'?'bg-ui-warning-soft text-ui-warning':pay.status==='approved'?'bg-ui-success-soft text-ui-success':'bg-ui-danger-soft text-ui-danger'}`}>{pay.status}</span></div><p className="mt-1 text-sm text-ui-subtle">{plan ? (isAr ? plan.name_ar : plan.name_en) : '—'} · {formatCurrency(pay.amount)} · {pay.billing_period}</p><p className="mt-1 text-xs text-ui-subtle">{formatDate(pay.submitted_at, lang)} {pay.reference ? `· ${pay.reference}` : ''}</p></div><div className="flex flex-wrap items-center gap-2">{pay.receipt_url && <a href={pay.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><ExternalLink className="h-4 w-4"/>{isAr?'الإيصال':'Receipt'}</a>}{pay.status==='pending' && <><Button onClick={()=>void review(pay.id,true)} disabled={reviewing===pay.id}><Check className="h-4 w-4"/>{isAr?'اعتماد':'Approve'}</Button><Button variant="outline" onClick={()=>void review(pay.id,false)} disabled={reviewing===pay.id}><X className="h-4 w-4"/>{isAr?'رفض':'Reject'}</Button></>}{reviewing===pay.id && <Loader2 className="h-5 w-5 animate-spin"/>}</div></div></div>})}</div>}</Card>

    <Card className="p-5"><h2 className="mb-4 text-xl font-bold">{isAr ? 'الفروع والاشتراكات' : 'Branches & subscriptions'}</h2>{loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> : <div className="grid gap-3 md:grid-cols-2">{branches.map(branch=>{const st=statuses[branch.id];return <div key={branch.id} className="rounded-2xl border p-4 dark:border-navy-700"><div className="flex items-center justify-between"><div><p className="font-bold">{isAr?branch.name:(branch.name_en||branch.name)}</p><p className="text-sm text-ui-subtle">{st?.status || '—'} {st?.current_period_ends_at ? `· ${formatDate(st.current_period_ends_at,lang)}` : ''}</p></div>{st?.expired?<AlertTriangle className="text-ui-danger"/>:<BadgeCheck className="text-ui-success"/>}</div><div className="mt-3 flex flex-wrap gap-2">{plans.map(plan=><span key={plan.id} className={`rounded-lg border px-2 py-1 text-xs ${st?.plan_id===plan.id?'border-brand-500 bg-brand-50 font-bold':''}`}>{isAr?plan.name_ar:plan.name_en}</span>)}</div></div>})}</div>}</Card>
  </div>;
}
