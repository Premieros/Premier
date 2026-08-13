import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { DesignSurface, DesignPageHeader } from '@/components/design/DesignSurface';
import { DesignSearch } from '@/components/design/DesignSearch';
import { DesignPanel } from '@/components/design/DesignPanel';
import { DesignPagination } from '@/components/design/DesignPagination';
import { DesignLoadingState, DesignEmptyState } from '@/components/design/DesignStates';
import { DataTable, type Column } from '@/components/DataTable';
import { usePaginatedRows } from '@/hooks/usePaginatedRows';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

export function AuditLogPage() {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');
  const { rows: items, loading, total, hasMore, loadMore, loadingMore } = usePaginatedRows<AuditLog>({
    table: 'audit_log',
    order: { column: 'created_at', ascending: false },
    pageSize: 200,
  });

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
    <DesignSurface testId="audit-log-page">
      <DesignPageHeader title={t('auditLog')} description={t('auditLog')} />
      <DesignPanel testId="audit-log-search-panel">
        <DesignSearch value={search} onChange={setSearch} placeholder={t('search')} label={t('search')} testId="audit-log-search" />
      </DesignPanel>
      <DesignPanel testId="audit-log-table-panel">
        {loading ? (
          <DesignLoadingState />
        ) : filtered.length === 0 ? (
          <DesignEmptyState title={t('noData')} icon={<ScrollText className="h-8 w-8" />} />
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage={t('noData')} />
        )}
        <DesignPagination loaded={items.length} total={total} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
      </DesignPanel>
    </DesignSurface>
  );
}
