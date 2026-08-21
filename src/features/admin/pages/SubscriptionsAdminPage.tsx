import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw, Settings, Store, X } from 'lucide-react';
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
interface PaymentRow { id: string; branch_id: string; plan_id: string | null; amount: number; billing_period: 'monthly'|'yearly'; status: 'pending'|'approved'|'rejected'; submitted_at: string }
interface SubscriptionSettings { id: boolean; instapay_id: string|null; beneficiary_name: string|null; qr_code_url: string|null; instructions_ar: string|null; instructions_en: string|null; trial_days: number; warning_days: number; grace_days: number; require_receipt: boolean; allow_monthly: boolean; allow_yearly: boolean }

const MODULES = [
  ['dashboard', 'لوحة التحكم', 'Dashboard'], ['pos', 'نقطة البيع', 'POS'], ['kitchen', 'المطبخ', 'Kitchen'],
  ['inventory', 'المخزون', 'Inventory'], ['raw_materials', 'الخامات', 'Raw Materials'], ['products', 'المنتجات', 'Products'],
  ['purchases', 'المشتريات', 'Purchases'], ['production', 'الإنتاج', 'Production'], ['reports', 'التقارير', 'Reports'],
  ['accounting', 'الحسابات', 'Accounting'], ['customers', 'العملاء', 'Customers'], ['suppliers', 'الموردين', 'Suppliers'],
  ['users', 'المستخدمين', 'Users'], ['branches', 'الفروع', 'Branches'],
] as const;
const STATUSES = ['active', 'trialing', 'past_due', 'cancelled', 'expired'] as const;

type Draft = { plan_id: string; status: string; overrides: Record<string, boolean> };

export function SubscriptionsAdminPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SubscriptionStatus>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, p, pay, s] = await Promise.all([
      api.supabase.from('branches').select('id,name,name_en,is_active').order('name'),
      api.subscriptions.listPlans(),
      api.supabase.from('subscription_payments').select('id,branch_id,plan_id,amount,billing_period,status,submitted_at').order('submitted_at', { ascending: false }),
      api.supabase.rpc('subscription_settings_get'),
    ]);
    if (b.error || p.error || pay.error || s.error) show((b.error || p.error || pay.error || s.error)?.message || 'Load failed', 'error');
    const bs = (b.data as BranchRow[] | null) ?? [];
    const ps = (p.data ?? []) as SubscriptionPlan[];
    setBranches(bs); setPlans(ps); setPayments((pay.data as PaymentRow[] | null) ?? []); setSettings((s.data as SubscriptionSettings | null) ?? null);
    const nextStatuses: Record<string, SubscriptionStatus> = {};
    const nextDrafts: Record<string, Draft> = {};
    await Promise.all(bs.map(async branch => {
      const r = await api.subscriptions.status({ p_branch_id: branch.id });
      if (!r.error && r.data) {
        nextStatuses[branch.id] = r.data;
        nextDrafts[branch.id] = { plan_id: r.data.plan_id || ps[0]?.id || '', status: r.data.status || 'active', overrides: r.data.feature_overrides || {} };
      }
    }));
    setStatuses(nextStatuses); setDrafts(nextDrafts); setLoading(false);
  }, [show]);

  useEffect(() => { void load(); }, [load]);
  if (user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  const saveBranch = async (branchId: string) => {
    const d = drafts[branchId]; if (!d?.plan_id) return;
    setSavingBranch(branchId);
    const { data, error } = await api.subscriptions.updateBranchControls({ p_branch_id: branchId, p_plan_id: d.plan_id, p_status: d.status, p_feature_overrides: d.overrides });
    setSavingBranch(null);
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || (isAr ? 'فشل حفظ الفرع' : 'Failed to save branch'), 'error'); return; }
    show(isAr ? 'تم تحديث اشتراك الفرع' : 'Branch subscription updated', 'success'); await load();
  };

  const updatePlan = async (plan: SubscriptionPlan) => {
    setSavingPlan(plan.id);
    const { data, error } = await api.subscriptions.updatePlan({ p_plan_id: plan.id, p_monthly_price_egp: Number(plan.monthly_price_egp), p_yearly_price_egp: Number(plan.yearly_price_egp), p_features: plan.features || {}, p_is_active: plan.is_active });
    setSavingPlan(null);
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || (isAr ? 'فشل حفظ الباقة' : 'Failed to save plan'), 'error'); return; }
    show(isAr ? 'تم حفظ الباقة' : 'Plan saved', 'success'); await load();
  };

  const reviewPayment = async (id: string, approve: boolean) => {
    const { data, error } = await api.supabase.rpc('review_instapay_payment', { p_payment_id: id, p_approve: approve, p_rejection_reason: approve ? null : (isAr ? 'لم يتم اعتماد التحويل' : 'Transfer was not approved') });
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || 'Review failed', 'error'); return; }
    show(approve ? (isAr ? 'تم اعتماد الاشتراك' : 'Subscription approved') : (isAr ? 'تم رفض التحويل' : 'Payment rejected'), 'success'); await load();
  };

  const saveSettings = async () => {
    if (!settings) return; setSavingSettings(true);
    const { data, error } = await api.supabase.rpc('subscription_settings_update', { p_instapay_id: settings.instapay_id, p_beneficiary_name: settings.beneficiary_name, p_qr_code_url: settings.qr_code_url, p_instructions_ar: settings.instructions_ar, p_instructions_en: settings.instructions_en, p_trial_days: settings.trial_days, p_warning_days: settings.warning_days, p_grace_days: settings.grace_days, p_require_receipt: settings.require_receipt, p_allow_monthly: settings.allow_monthly, p_allow_yearly: settings.allow_yearly });
    setSavingSettings(false);
    if (error || !(data as { success?: boolean })?.success) { show((data as { error?: string })?.error || error?.message || 'Save failed', 'error'); return; }
    show(isAr ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
  };

  const activePlans = useMemo(() => plans.filter(p => p.is_active), [plans]);
  const field = (label: string, value: string|number, onChange: (v:string)=>void, type: 'text'|'number'='text') => <label className="block space-y-1"><span className="text-sm font-semibold">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-ui-border bg-ui-surface px-3 py-2.5 outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900" /></label>;

  return <div className="space-y-6 pb-10">
    <div className="flex items-end justify-between gap-4"><PageHeader title={isAr ? 'مركز الاشتراكات والتحكم في الفروع' : 'Subscriptions & Branch Controls'} subtitle={isAr ? 'تحكم مركزي للـ Super Admin في السعر، الباقة، وحالة كل Module' : 'Central Super Admin control for pricing, plans and module access'} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />{isAr ? 'تحديث' : 'Refresh'}</Button></div>

    <Card className="p-5"><div className="mb-4 flex items-center gap-3"><Settings className="h-5 w-5 text-brand-500"/><div><h2 className="text-xl font-bold">{isAr ? 'الباقات والأسعار' : 'Plans & pricing'}</h2><p className="text-sm text-ui-subtle">{isAr ? 'تعديل السعر وModules الباقة من مكان واحد.' : 'Edit plan pricing and included modules from one place.'}</p></div></div><div className="space-y-4">{plans.map(plan => <div key={plan.id} className="rounded-2xl border border-ui-border p-4 dark:border-navy-700"><div className="grid gap-3 md:grid-cols-5 md:items-end">{field(isAr ? plan.name_ar : plan.name_en, plan.monthly_price_egp, v=>setPlans(prev=>prev.map(x=>x.id===plan.id?{...x,monthly_price_egp:Number(v)}:x)), 'number')}{field(isAr?'السعر السنوي':'Yearly price', plan.yearly_price_egp, v=>setPlans(prev=>prev.map(x=>x.id===plan.id?{...x,yearly_price_egp:Number(v)}:x)), 'number')}<label className="flex items-center gap-2 pb-3 text-sm font-semibold"><input type="checkbox" checked={plan.is_active} onChange={e=>setPlans(prev=>prev.map(x=>x.id===plan.id?{...x,is_active:e.target.checked}:x))}/>{isAr?'فعالة':'Active'}</label><div className="text-sm text-ui-subtle">{formatCurrency(plan.monthly_price_egp)} / {isAr?'شهر':'month'}</div><Button onClick={()=>void updatePlan(plan)} disabled={savingPlan===plan.id}>{savingPlan===plan.id&&<Loader2 className="h-4 w-4 animate-spin"/>}{isAr?'حفظ الباقة':'Save plan'}</Button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{MODULES.map(([key,ar,en])=><label key={key} className="flex items-center gap-2 rounded-xl border border-ui-border px-3 py-2 text-sm dark:border-navy-700"><input type="checkbox" checked={Boolean(plan.features?.[key])} onChange={e=>setPlans(prev=>prev.map(x=>x.id===plan.id?{...x,features:{...(x.features||{}),[key]:e.target.checked}}:x))}/>{isAr?ar:en}</label>)}</div></div>)}</div></Card>

    <Card className="p-5"><div className="mb-4"><h2 className="text-xl font-bold">{isAr ? 'اشتراك كل فرع والتحكم في Modules' : 'Branch subscriptions & module access'}</h2><p className="text-sm text-ui-subtle">{isAr ? 'التعديل هنا يطبّق على الفرع المحدد فقط، والـ override يتغلب على إعداد الباقة.' : 'Changes apply only to the selected branch; an override takes precedence over the plan.'}</p></div>{loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> : <div className="space-y-4">{branches.map(branch=>{const d=drafts[branch.id]||{plan_id:activePlans[0]?.id||'',status:'active',overrides:{}};const st=statuses[branch.id];return <div key={branch.id} className="rounded-2xl border border-ui-border p-4 dark:border-navy-700"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div className="flex items-center gap-3"><Store className="h-5 w-5"/><div><p className="font-bold">{isAr?branch.name:(branch.name_en||branch.name)}</p><p className="text-xs text-ui-subtle">{st?.current_period_ends_at?formatDate(st.current_period_ends_at,lang):''}</p></div></div><div className="grid gap-2 sm:grid-cols-3"><label className="text-sm"><span className="mb-1 block font-semibold">{isAr?'الباقة':'Plan'}</span><select value={d.plan_id} onChange={e=>setDrafts(x=>({...x,[branch.id]:{...d,plan_id:e.target.value}}))} className="rounded-xl border border-ui-border bg-ui-surface px-3 py-2 dark:border-navy-700 dark:bg-navy-900">{activePlans.map(p=><option key={p.id} value={p.id}>{isAr?p.name_ar:p.name_en}</option>)}</select></label><label className="text-sm"><span className="mb-1 block font-semibold">{isAr?'الحالة':'Status'}</span><select value={d.status} onChange={e=>setDrafts(x=>({...x,[branch.id]:{...d,status:e.target.value}}))} className="rounded-xl border border-ui-border bg-ui-surface px-3 py-2 dark:border-navy-700 dark:bg-navy-900">{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></label><Button onClick={()=>void saveBranch(branch.id)} disabled={savingBranch===branch.id}>{savingBranch===branch.id&&<Loader2 className="h-4 w-4 animate-spin"/>}{isAr?'حفظ الفرع':'Save branch'}</Button></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{MODULES.map(([key,ar,en])=>{const override=d.overrides[key];const plan=activePlans.find(p=>p.id===d.plan_id);const inherited=Boolean(plan?.features?.[key]);const checked=override===undefined?inherited:override;return <label key={key} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${override===undefined?'border-ui-border':'border-brand-500 bg-brand-50/40'} dark:border-navy-700`}><span>{isAr?ar:en}</span><input type="checkbox" checked={checked} onChange={e=>setDrafts(x=>({...x,[branch.id]:{...d,overrides:{...d.overrides,[key]:e.target.checked}}}))}/></label>})}</div></div>})}</div>}</Card>

    <Card className="p-5"><div className="mb-4"><h2 className="text-xl font-bold">{isAr ? 'إعدادات الاشتراكات' : 'Subscription settings'}</h2><p className="text-sm text-ui-subtle">{isAr ? 'إعدادات الدفع والتنبيه العامة.' : 'Global payment and subscription timing settings.'}</p></div>{settings && <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3">{field(isAr?'InstaPay':'InstaPay ID',settings.instapay_id??'',v=>setSettings({...settings,instapay_id:v}))}{field(isAr?'اسم المستفيد':'Beneficiary',settings.beneficiary_name??'',v=>setSettings({...settings,beneficiary_name:v}))}{field('QR URL',settings.qr_code_url??'',v=>setSettings({...settings,qr_code_url:v}))}</div><div className="grid gap-4 md:grid-cols-3">{field(isAr?'أيام التجربة':'Trial days',settings.trial_days,v=>setSettings({...settings,trial_days:Number(v)}),'number')}{field(isAr?'أيام التنبيه':'Warning days',settings.warning_days,v=>setSettings({...settings,warning_days:Number(v)}),'number')}{field(isAr?'فترة السماح':'Grace days',settings.grace_days,v=>setSettings({...settings,grace_days:Number(v)}),'number')}</div><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={settings.require_receipt} onChange={e=>setSettings({...settings,require_receipt:e.target.checked})}/>{isAr?'إلزام الإيصال':'Require receipt'}</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.allow_monthly} onChange={e=>setSettings({...settings,allow_monthly:e.target.checked})}/>{isAr?'شهري':'Monthly'}</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.allow_yearly} onChange={e=>setSettings({...settings,allow_yearly:e.target.checked})}/>{isAr?'سنوي':'Yearly'}</label></div><div className="flex justify-end"><Button onClick={()=>void saveSettings()} disabled={savingSettings}>{isAr?'حفظ الإعدادات':'Save settings'}</Button></div></div>}</Card>

    {payments.some(p=>p.status==='pending') && <Card className="p-5"><div className="mb-4 flex items-center gap-2"><AlertTriangle className="text-ui-warning"/><h2 className="text-xl font-bold">{isAr?'طلبات الدفع المعلقة':'Pending payments'}</h2></div><div className="space-y-2">{payments.filter(p=>p.status==='pending').map(p=><div key={p.id} className="flex flex-col gap-3 rounded-xl border border-ui-border p-3 sm:flex-row sm:items-center sm:justify-between dark:border-navy-700"><div><span className="font-semibold">{branches.find(b=>b.id===p.branch_id)?.name||p.branch_id}</span><span className="mx-2 text-sm text-ui-subtle">{formatCurrency(p.amount)} · {p.billing_period}</span><span className="text-xs text-ui-subtle">{formatDate(p.submitted_at,lang)}</span></div><div className="flex gap-2"><Button onClick={()=>void reviewPayment(p.id,true)}><Check className="h-4 w-4"/>{isAr?'اعتماد':'Approve'}</Button><Button variant="outline" onClick={()=>void reviewPayment(p.id,false)}><X className="h-4 w-4"/>{isAr?'رفض':'Reject'}</Button></div></div>)}</div></Card>}
  </div>;
}
