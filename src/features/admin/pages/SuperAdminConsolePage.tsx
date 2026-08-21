import { useCallback, useEffect, useState } from 'react';
import {
  Building2, CheckCircle2, ChevronDown, ChevronRight, Loader2,
  RefreshCw, Users, XCircle,
} from 'lucide-react';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { DesignSurface, DesignPageHeader } from '@/components/design/DesignSurface';
import { DesignSearch } from '@/components/design/DesignSearch';
import { Button } from '@/components/Button';
import { Card } from '@/components/PageHeader';
import { formatDate } from '@/lib/format';

interface TenantStats {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  is_active: boolean;
  created_at: string;
  branch_count: number;
  user_count: number;
  total_branches: number;
  active_branches: number;
  has_active_subscription: boolean;
}

interface TenantUser {
  user_id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  branch_id: string | null;
  branch_name: string | null;
  org_id: string | null;
  org_name: string | null;
  created_at: string;
}

type Tab = 'tenants' | 'users' | 'health';

export function SuperAdminConsolePage() {
  const { lang } = useLanguage();
  const { show } = useToast();
  const ar = lang === 'ar';
  const [tab, setTab] = useState<Tab>('tenants');
  const [tenants, setTenants] = useState<TenantStats[]>([]);
  const [allUsers, setAllUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [healthRunning, setHealthRunning] = useState(false);
  const [healthResults, setHealthResults] = useState<{ key: string; label: string; status: 'ok' | 'error' | 'checking'; detail: string }[]>([]);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_super_admin_tenant_stats');
    if (error) { show(error.message, 'error'); setLoading(false); return; }
    setTenants((data as TenantStats[]) ?? []);
    setLoading(false);
  }, [show]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_super_admin_all_users', { p_search: userSearch || null });
    if (error) { show(error.message, 'error'); setLoading(false); return; }
    setAllUsers((data as TenantUser[]) ?? []);
    setLoading(false);
  }, [show, userSearch]);

  useEffect(() => {
    if (tab === 'tenants') void loadTenants();
    else if (tab === 'users') void loadUsers();
  }, [tab, loadTenants, loadUsers]);

  const toggleOrgStatus = async (orgId: string, currentActive: boolean) => {
    const { data, error } = await supabase.rpc('toggle_organization_status', {
      p_org_id: orgId, p_is_active: !currentActive,
    });
    if (error || !(data as { success?: boolean })?.success) {
      show((data as { error?: string })?.error || error?.message || 'Failed', 'error'); return;
    }
    show(ar ? 'تم التحديث' : 'Updated', 'success');
    void loadTenants();
  };

  const runHealthChecks = useCallback(async () => {
    setHealthRunning(true);
    const targets: { key: string; label: string; table?: string }[] = [
      { key: 'auth', label: ar ? 'التحقق من الهوية' : 'Auth Service' },
      { key: 'orgs', label: ar ? 'المنظمات' : 'Organizations', table: 'organizations' },
      { key: 'branches', label: ar ? 'الفروع' : 'Branches', table: 'branches' },
      { key: 'users_tbl', label: ar ? 'المستخدمون' : 'Users', table: 'users' },
      { key: 'orders_tbl', label: ar ? 'الطلبات' : 'Orders', table: 'orders' },
      { key: 'sales_tbl', label: ar ? 'المبيعات' : 'Sales', table: 'sales' },
      { key: 'subscriptions', label: ar ? 'الاشتراكات' : 'Subscriptions', table: 'branch_subscriptions' },
      { key: 'branch_access', label: ar ? 'صلاحيات الفروع' : 'Branch Access', table: 'user_branch_access' },
    ];
    const results = targets.map((t) => ({ key: t.key, label: t.label, status: 'checking' as const, detail: ar ? '...' : '...' }));
    setHealthResults(results);

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      try {
        if (t.key === 'auth') {
          const r = await supabase.auth.getSession();
          setHealthResults((p) => p.map((c, idx) => idx === i ? { ...c, status: r.error ? 'error' : 'ok', detail: r.error?.message || (ar ? 'متصل' : 'OK') } : c));
        } else if (t.table) {
          const r = await supabase.from(t.table).select('id', { count: 'exact', head: true });
          setHealthResults((p) => p.map((c, idx) => idx === i ? { ...c, status: r.error ? 'error' : 'ok', detail: r.error?.message || `${r.count ?? 0}` } : c));
        }
      } catch {
        setHealthResults((p) => p.map((c, idx) => idx === i ? { ...c, status: 'error', detail: 'Exception' } : c));
      }
    }
    setHealthRunning(false);
  }, [ar]);

  useEffect(() => {
    if (tab === 'health' && healthResults.length === 0) void runHealthChecks();
  }, [tab, healthResults.length, runHealthChecks]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'tenants', label: ar ? 'المستأجرون' : 'Tenants' },
    { key: 'users', label: ar ? 'المستخدمون' : 'Users' },
    { key: 'health', label: ar ? 'صحة النظام' : 'System Health' },
  ];

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t) => t.is_active).length,
    totalBranches: tenants.reduce((sum, t) => sum + (t.total_branches ?? 0), 0),
    totalUsers: tenants.reduce((sum, t) => sum + (t.user_count ?? 0), 0),
    withSub: tenants.filter((t) => t.has_active_subscription).length,
  };

  return (
    <DesignSurface testId="super-admin-console">
      <DesignPageHeader
        title={ar ? 'لوحة تحكم المدير العام' : 'Super Admin Console'}
        actions={<Button variant="outline" size="sm" onClick={() => { setHealthResults([]); void loadTenants(); }}><RefreshCw className="w-4 h-4" /></Button>}
      />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-ui-page-alt text-ui-subtle hover:text-ui-text'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'tenants' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: ar ? 'المستأجرون' : 'Tenants', value: stats.totalTenants },
              { label: ar ? 'النشطون' : 'Active', value: stats.activeTenants },
              { label: ar ? 'الفروع' : 'Branches', value: stats.totalBranches },
              { label: ar ? 'المستخدمون' : 'Users', value: stats.totalUsers },
              { label: ar ? 'باشتراك' : 'Subscribed', value: stats.withSub },
            ].map((s) => (
              <Card key={s.label} className="p-3 text-center">
                <p className="text-2xl font-bold text-ui-text">{s.value}</p>
                <p className="text-xs text-ui-subtle">{s.label}</p>
              </Card>
            ))}
          </div>

          {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin w-6 h-6" /></div> : (
            <div className="space-y-2">
              {tenants.map((t) => (
                <Card key={t.organization_id} className="overflow-hidden">
                  <button type="button" onClick={() => setExpandedOrg(expandedOrg === t.organization_id ? null : t.organization_id)} className="flex w-full items-center justify-between p-4 text-start hover:bg-ui-page-alt transition">
                    <div className="flex items-center gap-3">
                      {expandedOrg === t.organization_id ? <ChevronDown className="w-4 h-4 text-ui-subtle" /> : <ChevronRight className="w-4 h-4 text-ui-subtle" />}
                      <Building2 className="w-5 h-5 text-brand-500" />
                      <div>
                        <p className="font-bold text-ui-text">{t.organization_name}</p>
                        <p className="text-xs text-ui-subtle">{t.organization_slug} &middot; {formatDate(t.created_at, lang)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ui-subtle">{t.branch_count} {ar ? 'فرع' : 'branches'} &middot; {t.user_count} {ar ? 'عضو' : 'members'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-ui-success-soft text-ui-success' : 'bg-ui-danger-soft text-ui-danger'}`}>
                        {t.is_active ? (ar ? 'نشط' : 'Active') : (ar ? 'معطل' : 'Disabled')}
                      </span>
                      {t.has_active_subscription ? <CheckCircle2 className="w-4 h-4 text-ui-success" /> : <XCircle className="w-4 h-4 text-ui-warning" />}
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void toggleOrgStatus(t.organization_id, t.is_active); }}>
                        {t.is_active ? (ar ? 'تعطيل' : 'Disable') : (ar ? 'تفعيل' : 'Enable')}
                      </Button>
                    </div>
                  </button>
                  {expandedOrg === t.organization_id && (
                    <div className="border-t border-ui-border p-4 bg-ui-page/50">
                      <p className="text-sm font-semibold text-ui-text mb-2">{ar ? 'الفروع' : 'Branches'}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {allUsers.filter((u) => u.org_id === t.organization_id).slice(0, 10).map((u) => (
                          <div key={u.user_id} className="flex items-center gap-2 text-sm">
                            <Users className="w-3.5 h-3.5 text-ui-subtle" />
                            <span className="font-medium">{u.full_name || u.email}</span>
                            <span className="text-ui-subtle text-xs">({u.role})</span>
                            {u.branch_name && <span className="text-ui-subtle text-xs">@ {u.branch_name}</span>}
                          </div>
                        ))}
                        {allUsers.filter((u) => u.org_id === t.organization_id).length > 10 && (
                          <p className="text-xs text-ui-subtle col-span-2">... {ar ? 'والمزيد' : 'and more'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <DesignSearch value={userSearch} onChange={setUserSearch} placeholder={ar ? 'بحث بالبريد أو الاسم...' : 'Search by email or name...'} label={ar ? 'بحث' : 'Search'} testId="sa-user-search" />
          {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin w-6 h-6" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ui-border text-start">
                    <th className="p-2 font-semibold text-ui-subtle">{ar ? 'البريد' : 'Email'}</th>
                    <th className="p-2 font-semibold text-ui-subtle">{ar ? 'الاسم' : 'Name'}</th>
                    <th className="p-2 font-semibold text-ui-subtle">{ar ? 'الدور' : 'Role'}</th>
                    <th className="p-2 font-semibold text-ui-subtle">{ar ? 'المستأجر' : 'Tenant'}</th>
                    <th className="p-2 font-semibold text-ui-subtle">{ar ? 'الفرع' : 'Branch'}</th>
                    <th className="p-2 font-semibold text-ui-subtle">{ar ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.user_id} className="border-b border-ui-border/50">
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">{u.full_name || '-'}</td>
                      <td className="p-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">{u.role}</span></td>
                      <td className="p-2 text-ui-subtle">{u.org_name || '-'}</td>
                      <td className="p-2 text-ui-subtle">{u.branch_name || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-ui-success-soft text-ui-success' : 'bg-ui-page-alt text-ui-subtle'}`}>
                          {u.is_active ? (ar ? 'نشط' : 'Active') : (ar ? 'معطل' : 'Inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { setHealthResults([]); }} disabled={healthRunning}>
              <RefreshCw className={`w-4 h-4 ${healthRunning ? 'animate-spin' : ''}`} /> {ar ? 'إعادة الفحص' : 'Re-check'}
            </Button>
          </div>
          <div className="space-y-2">
            {healthResults.map((h) => (
              <Card key={h.key} className="flex items-center gap-3 p-3">
                {h.status === 'ok' ? <CheckCircle2 className="w-5 h-5 text-ui-success shrink-0" /> : h.status === 'error' ? <XCircle className="w-5 h-5 text-ui-danger shrink-0" /> : <Loader2 className="w-5 h-5 animate-spin text-brand-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{h.label}</p>
                  <p className="text-xs text-ui-subtle truncate">{h.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DesignSurface>
  );
}
