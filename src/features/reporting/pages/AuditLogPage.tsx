import { useEffect, useState } from 'react';
import { Search, ScrollText } from 'lucide-react';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader, Card } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

export function AuditLogPage() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
        setItems((data as AuditLog[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter((a) => !search || a.action.toLowerCase().includes(search.toLowerCase()) || a.entity?.toLowerCase().includes(search.toLowerCase()) || a.user_email?.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', header: t('date'), render: (a) => <span className="text-sm text-slate-600 dark:text-slate-300">{formatDateTime(a.created_at, lang)}</span> },
    { key: 'user_email', header: t('user'), render: (a) => a.user_email || '-' },
    { key: 'action', header: t('action'), render: (a) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        a.action === 'create' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
        a.action === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
        a.action === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      }`}>{a.action}</span>
    )},
    { key: 'entity', header: t('entity'), render: (a) => a.entity || '-' },
    { key: 'details', header: t('details'), render: (a) => a.details ? <span className="text-xs text-slate-400 truncate max-w-xs block">{JSON.stringify(a.details)}</span> : '-' },
  ];

  return (
    <div>
      <PageHeader title={t('auditLog')} subtitle={t('auditLog')} />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </Card>
      <Card className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ScrollText className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('noData')}</p>
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage={t('noData')} />
        )}
      </Card>
    </div>
  );
}
