import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, Clock3, Package, RefreshCw, ShoppingCart, Wallet } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { isAdminRole } from '@/lib/permissions';
import { formatCurrency } from '@/lib/format';

type Sale = { total:number|null; created_at:string; order_type:string|null; branch_id:string|null };
type Point = { label:string; value:number };

const orderLabels: Record<string, [string,string]> = {
  dine_in:['الصالة','Dine-in'], takeaway:['تيك أواي','Takeaway'], delivery:['دليفري','Delivery'], car:['سيارة','Car'], quick:['سريع','Quick'],
};

function Metric({ icon:Icon, label, value, detail }: { icon: typeof Activity; label:string; value:string; detail:string }) {
  return <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(30,20,70,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,20,70,0.09)]">
    <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Icon className="h-5 w-5" /></div><ArrowUpRight className="h-4 w-4 text-slate-300" /></div>
    <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs font-medium text-slate-400">{detail}</p>
  </div>;
}

export function VisualDashboardPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const ar = lang === 'ar';
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'today'|'week'|'month'>('today');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setRefreshing(true);
      const end = new Date();
      const start = new Date(end);
      if (range === 'today') start.setHours(0,0,0,0);
      if (range === 'week') start.setDate(start.getDate()-6);
      if (range === 'month') start.setDate(start.getDate()-29);
      let q = supabase.from('sales').select('total,created_at,order_type,branch_id').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('created_at',{ascending:false}).limit(5000);
      const branch = isAdminRole(user?.role) ? branchFilter : branchFilter;
      if (branch) q = q.eq('branch_id', branch);
      const { data } = await q;
      if (active) setSales((data || []) as Sale[]);
      if (active) { setLoading(false); setRefreshing(false); }
    };
    void load();
    return () => { active = false; };
  }, [range, branchFilter, user?.role]);

  const total = useMemo(() => sales.reduce((sum, row) => sum + Number(row.total || 0), 0), [sales]);
  const avg = sales.length ? total / sales.length : 0;
  const chart = useMemo<Point[]>(() => {
    const count = range === 'today' ? 12 : range === 'week' ? 7 : 10;
    const points = Array.from({length:count}, (_, i) => ({label: range === 'today' ? `${String(i*2).padStart(2,'0')}:00` : `${i+1}`, value:0}));
    sales.forEach(row => { const d = new Date(row.created_at); const index = range === 'today' ? Math.min(11, Math.floor(d.getHours()/2)) : range === 'week' ? Math.min(6, Math.max(0, Math.floor((Date.now()-d.getTime())/86400000))) : Math.min(9, Math.max(0, Math.floor((Date.now()-d.getTime())/259200000))); const p = points[range === 'week' || range === 'month' ? (range === 'week' ? 6-index : 9-index) : index]; if (p) p.value += Number(row.total || 0); });
    return points;
  }, [sales, range]);
  const ordersByType = useMemo(() => Object.entries(sales.reduce<Record<string,number>>((a,r)=>{const k=r.order_type||'other';a[k]=(a[k]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5), [sales]);
  const money = (n:number) => formatCurrency(n, 'EGP', lang);

  return <div dir={ar ? 'rtl' : 'ltr'} className="min-h-[calc(100vh-76px)] bg-[#f6f7fb] px-4 py-5 sm:px-7 sm:py-7" data-testid="dashboard-surface">
    <div className="mx-auto max-w-[1560px] space-y-7">
      <section className="flex flex-col gap-5 rounded-[32px] bg-gradient-to-br from-[#24114f] via-[#4b20a9] to-[#6d35df] p-6 text-white shadow-[0_20px_55px_rgba(75,32,169,0.25)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="mb-3 flex items-center gap-2 text-violet-200"><BarChart3 className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.18em]">Premier Control</span></div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{ar ? 'نظرة عامة على أعمالك' : 'Your business at a glance'}</h1><p className="mt-2 max-w-2xl text-sm text-violet-100/80">{ar ? 'مؤشرات واضحة وسريعة تساعدك على معرفة ما يحدث الآن.' : 'A focused command view for the numbers that matter now.'}</p></div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-1 backdrop-blur"><button onClick={()=>setRange('today')} className={`rounded-xl px-4 py-2 text-sm font-bold ${range==='today'?'bg-white text-violet-700':'text-white/80'}`}>{ar?'اليوم':'Today'}</button><button onClick={()=>setRange('week')} className={`rounded-xl px-4 py-2 text-sm font-bold ${range==='week'?'bg-white text-violet-700':'text-white/80'}`}>{ar?'7 أيام':'7 days'}</button><button onClick={()=>setRange('month')} className={`rounded-xl px-4 py-2 text-sm font-bold ${range==='month'?'bg-white text-violet-700':'text-white/80'}`}>{ar?'30 يوم':'30 days'}</button><button onClick={()=>window.location.reload()} className="rounded-xl p-2 text-white/80 hover:bg-white/10" aria-label="Refresh"><RefreshCw className={refreshing?'h-4 w-4 animate-spin':'h-4 w-4'}/></button></div>
      </section>
      {loading ? <div className="flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white"><RefreshCw className="h-7 w-7 animate-spin text-violet-600"/></div> : <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Wallet} label={ar?'إجمالي المبيعات':'Total sales'} value={money(total)} detail={ar?'للفترة المحددة':'Selected period'} /><Metric icon={ShoppingCart} label={ar?'عدد الطلبات':'Orders'} value={sales.length.toLocaleString()} detail={ar?'طلب مكتمل':'Recorded sales'} /><Metric icon={Activity} label={ar?'متوسط الطلب':'Average order'} value={money(avg)} detail={ar?'متوسط قيمة الفاتورة':'Average ticket'} /><Metric icon={Package} label={ar?'آخر نشاط':'Latest activity'} value={sales.length ? new Date(sales[0].created_at).toLocaleTimeString(ar?'ar-EG':'en-US',{hour:'2-digit',minute:'2-digit'}) : '—'} detail={ar?'آخر عملية بيع':'Latest sale'} /></section>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]"><div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(30,20,70,0.05)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">{ar?'حركة المبيعات':'Sales performance'}</h2><p className="mt-1 text-xs text-slate-400">{ar?'توزيع المبيعات خلال الفترة':'Sales movement across the selected period'}</p></div><span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">{money(total)}</span></div><div className="h-[310px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="premierArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d35df" stopOpacity={0.28}/><stop offset="100%" stopColor="#6d35df" stopOpacity={0.02}/></linearGradient></defs><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}}/><Tooltip formatter={(v)=>money(Number(v))} contentStyle={{borderRadius:16,border:'1px solid #e2e8f0',boxShadow:'0 12px 30px rgba(15,23,42,.1)'}}/><Area type="monotone" dataKey="value" stroke="#6d35df" strokeWidth={3} fill="url(#premierArea)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(30,20,70,0.05)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">{ar?'أنواع الطلبات':'Order mix'}</h2><p className="mt-1 text-xs text-slate-400">{ar?'حسب الطلبات المسجلة':'By recorded orders'}</p></div><Clock3 className="h-5 w-5 text-slate-300"/></div><div className="space-y-4">{ordersByType.length ? ordersByType.map(([key,count])=>{const label=orderLabels[key]||[key,key];const pct=Math.round(count/Math.max(sales.length,1)*100);return <div key={key}><div className="mb-1 flex justify-between text-sm"><span className="font-bold text-slate-700">{ar?label[0]:label[1]}</span><span className="font-bold text-slate-400">{count} · {pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-700" style={{width:`${pct}%`}}/></div></div>}) : <p className="py-10 text-center text-sm text-slate-400">{ar?'لا توجد بيانات':'No data yet'}</p>}</div></div></section>
      </>}
    </div>
  </div>;
}
