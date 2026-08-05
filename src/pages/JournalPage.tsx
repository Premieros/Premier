import { useEffect, useState } from 'react';
import { Search, Eye, Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, StatCard } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { formatCurrency, formatDateTime } from '../lib/format';
import { useBranchFilter } from '../lib/useBranchFilter';
import { isAdminRole } from '../lib/permissions';
import type { JournalEntry, JournalEntryLine, Settings, Branch } from '../lib/types';

interface JournalRow extends JournalEntry {
  journal_entry_lines?: (JournalEntryLine & { account?: { code: string; name: string; name_en: string | null } })[];
  lines?: (JournalEntryLine & { account_name?: string; account_code?: string })[];
}

const REF_TYPE_KEYS: Record<string, string> = {
  opening: 'entryOpening',
  purchase: 'entryPurchase',
  sale: 'entrySale',
  refund: 'entryRefund',
  production: 'entryProduction',
  waste: 'entryWaste',
  transfer: 'entryTransfer',
  adjustment: 'entryAdjustment',
  payment: 'receivePayment',
  general: 'journal',
};

export function JournalPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const [items, setItems] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<JournalRow | null>(null);
  const [currency, setCurrency] = useState('EGP');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminBranchFilter, setAdminBranchFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const effectiveBranchFilter = isAdminRole(user?.role) ? (adminBranchFilter || null) : branchFilter;
  const isAr = lang === 'ar';

  async function load() {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        supabase.from('settings').select('*').maybeSingle(),
        supabase.from('branches').select('*').order('name'),
      ]);
      if (s.data) setCurrency((s.data as Settings).currency || 'EGP');
      setBranches((b.data as Branch[]) || []);

      let q = supabase.from('journal_entries').select('*, journal_entry_lines(*, account:chart_of_accounts(code, name, name_en))').order('created_at', { ascending: false }).limit(200);
      if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
      if (from) q = q.gte('entry_date', from);
      if (to) q = q.lte('entry_date', to);
      const { data } = await q;
      const rows = ((data as JournalRow[]) || []).map((e) => ({
        ...e,
        lines: (e.journal_entry_lines as (JournalEntryLine & { account?: { code: string; name: string; name_en: string | null } })[] | undefined)?.map((l) => ({
          ...l,
          account_name: l.account?.name || '',
          account_code: l.account?.code || '',
        })),
      }));
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [effectiveBranchFilter, from, to]);

  const filtered = items.filter((e) => !search || e.entry_number.toLowerCase().includes(search.toLowerCase()) || (e.reference_number || '').toLowerCase().includes(search.toLowerCase()) || (e.description || '').toLowerCase().includes(search.toLowerCase()));

  const refLabel = (type: string) => {
    const key = REF_TYPE_KEYS[type];
    if (!key) return type;
    return t(key as never);
  };

  const columns: Column<JournalRow>[] = [
    { key: 'entry_number', header: t('entryNumber'), render: (e) => <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{e.entry_number}</span> },
    { key: 'entry_date', header: t('date'), render: (e) => formatDateTime(e.entry_date, lang) },
    { key: 'reference_type', header: t('reference'), render: (e) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{refLabel(e.reference_type)}</span>
    ) },
    { key: 'reference_number', header: t('invoice'), render: (e) => e.reference_number || '-' },
    { key: 'description', header: t('description'), render: (e) => e.description || '-' },
    { key: 'balance', header: t('balance'), render: (e) => {
      const total = (e.lines || []).reduce((s, l) => s + Number(l.debit), 0);
      const ok = total > 0 && Math.abs(total - (e.lines || []).reduce((s, l) => s + Number(l.credit), 0)) < 0.01;
      return ok ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"><Scale className="w-3.5 h-3.5" />{formatCurrency(total, currency, lang)}</span> : <span className="text-red-500 text-xs font-semibold">{t('notBalanced')}</span>;
    } },
    { key: 'actions', header: t('actions'), render: (e) => <Button size="sm" variant="outline" onClick={() => setViewing(e)}><Eye className="w-4 h-4" /> {t('view')}</Button> },
  ];

  const viewLines = (viewing?.lines || []).filter((l) => l.account_name);

  return (
    <div>
      <PageHeader title={t('journalEntries')} subtitle={t('journal')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title={t('journalEntries')} value={String(items.length)} icon={<Scale className="w-5 h-5" />} color="brand" />
        <StatCard title={t('debit')} value={formatCurrency(items.reduce((s, e) => s + (e.lines || []).reduce((x, l) => x + Number(l.debit), 0), 0), currency, lang)} icon={<Scale className="w-5 h-5" />} color="blue" />
        <StatCard title={t('credit')} value={formatCurrency(items.reduce((s, e) => s + (e.lines || []).reduce((x, l) => x + Number(l.credit), 0), 0), currency, lang)} icon={<Scale className="w-5 h-5" />} color="amber" />
        <StatCard title={t('balance')} value={formatCurrency(items.reduce((s, e) => s + (e.lines || []).reduce((x, l) => x + Number(l.debit) - Number(l.credit), 0), 0), currency, lang)} icon={<Scale className="w-5 h-5" />} color="green" />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
              className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex items-end gap-3">
            <Input label={t('from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={t('to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            {isAdminRole(user?.role) && branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('filterByBranch')}</label>
                <select value={adminBranchFilter} onChange={(e) => setAdminBranchFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <option value="">{t('allBranches')}</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} />
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.entry_number} - ${viewing.description || ''}` : ''} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-slate-500">{t('date')}: </span><span className="font-medium text-slate-800 dark:text-slate-200">{formatDateTime(viewing.entry_date, lang)}</span></div>
              <div><span className="text-slate-500">{t('reference')}: </span><span className="font-medium text-slate-800 dark:text-slate-200">{refLabel(viewing.reference_type)} {viewing.reference_number || ''}</span></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                    <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('accountCode')}</th>
                    <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('accountName')}</th>
                    <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('debit')}</th>
                    <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('credit')}</th>
                    <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLines.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">{l.account_code}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{isAr ? l.account_name : (l.account?.name_en || l.account_name)}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{l.debit > 0 ? formatCurrency(l.debit, currency, lang) : '-'}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{l.credit > 0 ? formatCurrency(l.credit, currency, lang) : '-'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{l.note || '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
                    <td className="px-4 py-3" colSpan={2}>{t('total')}</td>
                    <td className="px-4 py-3">{formatCurrency(viewLines.reduce((s, l) => s + Number(l.debit), 0), currency, lang)}</td>
                    <td className="px-4 py-3">{formatCurrency(viewLines.reduce((s, l) => s + Number(l.credit), 0), currency, lang)}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setViewing(null)}>{t('close')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
