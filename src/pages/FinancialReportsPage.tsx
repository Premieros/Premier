import { useEffect, useState } from 'react';
import { Scale, BookOpen, TrendingUp, PieChart, Clock, Download, BadgeCheck, BadgeAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { formatCurrency, todayISO } from '../lib/format';
import { exportToExcel } from '../lib/excel';
import { useBranchFilter } from '../lib/useBranchFilter';
import { isAdminRole } from '../lib/permissions';
import type {
  Settings, Branch, TrialBalanceRow, GeneralLedgerRow,
  IncomeStatementResult, BalanceSheetResult, ArAgingRow, ChartOfAccount,
} from '../lib/types';

type View = 'trial_balance' | 'ledger' | 'income' | 'balance_sheet' | 'ar_aging';

export function FinancialReportsPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const isAr = lang === 'ar';

  const [view, setView] = useState<View>('trial_balance');
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('EGP');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminBranchFilter, setAdminBranchFilter] = useState('');
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const effectiveBranchFilter = isAdminRole(user?.role) ? (adminBranchFilter || null) : branchFilter;

  const [tb, setTb] = useState<TrialBalanceRow[]>([]);
  const [gl, setGl] = useState<GeneralLedgerRow[]>([]);
  const [income, setIncome] = useState<IncomeStatementResult | null>(null);
  const [sheet, setSheet] = useState<BalanceSheetResult | null>(null);
  const [aging, setAging] = useState<ArAgingRow[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      const [s, b] = await Promise.all([
        supabase.from('settings').select('*').maybeSingle(),
        supabase.from('branches').select('*').order('name'),
      ]);
      if (s.data) setCurrency((s.data as Settings).currency || 'EGP');
      setBranches((b.data as Branch[]) || []);
    };
    loadMeta();
  }, []);

  useEffect(() => {
    if (effectiveBranchFilter) {
      supabase.from('chart_of_accounts').select('id, code, name, name_en').eq('branch_id', effectiveBranchFilter).order('code').then(({ data }) => {
        setAccounts((data as ChartOfAccount[]) || []);
        setAccountId((prev) => prev || (data?.[0]?.id as string) || '');
      });
    } else {
      setAccounts([]);
      setAccountId('');
    }
  }, [effectiveBranchFilter]);

  async function load() {
    if (!effectiveBranchFilter) { setTb([]); setGl([]); setIncome(null); setSheet(null); setAging([]); return; }
    setLoading(true);
    try {
      if (view === 'trial_balance') {
        const { data } = await supabase.rpc('get_trial_balance', { p_branch_id: effectiveBranchFilter, p_to_date: to });
        setTb((data as TrialBalanceRow[]) || []);
      } else if (view === 'ledger') {
        const { data } = await supabase.rpc('get_general_ledger', {
          p_branch_id: effectiveBranchFilter,
          p_account_id: accountId || null,
          p_from_date: from,
          p_to_date: to,
        });
        setGl((data as GeneralLedgerRow[]) || []);
      } else if (view === 'income') {
        const { data } = await supabase.rpc('get_income_statement', { p_branch_id: effectiveBranchFilter, p_from_date: from, p_to_date: to });
        setIncome((data as IncomeStatementResult) || null);
      } else if (view === 'balance_sheet') {
        const { data } = await supabase.rpc('get_balance_sheet', { p_branch_id: effectiveBranchFilter, p_as_of: to });
        setSheet((data as BalanceSheetResult) || null);
      } else if (view === 'ar_aging') {
        const { data } = await supabase.rpc('get_ar_aging', { p_branch_id: effectiveBranchFilter, p_as_of: to });
        setAging((data as ArAgingRow[]) || []);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [view, from, to, effectiveBranchFilter, accountId]);

  const views: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'trial_balance', label: t('trialBalance'), icon: <Scale className="w-4 h-4" /> },
    { key: 'ledger', label: t('generalLedger'), icon: <BookOpen className="w-4 h-4" /> },
    { key: 'income', label: t('incomeStatement'), icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'balance_sheet', label: t('balanceSheet'), icon: <PieChart className="w-4 h-4" /> },
    { key: 'ar_aging', label: t('arAging'), icon: <Clock className="w-4 h-4" /> },
  ];

  const exportData = () => {
    if (view === 'trial_balance') exportToExcel(tb.map((r) => ({ Code: r.code, Name: isAr ? r.name : (r.name_en || r.name), Type: r.account_type, Debit: r.debit, Credit: r.credit, Balance: r.balance })), `trial_balance_${to}`);
    else if (view === 'ledger') exportToExcel(gl.map((r) => ({ Date: r.entry_date, Entry: r.entry_number, Description: r.description || '', Reference: r.reference_number || '', Debit: r.debit, Credit: r.credit, Balance: r.balance })), `general_ledger_${to}`);
    else if (view === 'income' && income) exportToExcel([{ Item: t('revenue'), Amount: income.revenue }, { Item: t('grossProfit'), Amount: income.gross_profit }, { Item: t('netIncome'), Amount: income.net_income }], `income_statement_${to}`);
    else if (view === 'balance_sheet' && sheet) exportToExcel([{ Item: t('assets'), Amount: sheet.assets }, { Item: t('liabilities'), Amount: sheet.liabilities }, { Item: t('equity'), Amount: sheet.equity }], `balance_sheet_${to}`);
    else if (view === 'ar_aging') exportToExcel(aging.map((r) => ({ Customer: r.name, Phone: r.phone || '', Open: r.open_amount, '0-30': r.bucket_0_30, '31-60': r.bucket_31_60, '61-90': r.bucket_61_90, '90+': r.bucket_90_plus })), `ar_aging_${to}`);
  };

  const summaryCard = (label: string, value: number, color = 'text-slate-800 dark:text-white') => (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{formatCurrency(value, currency, lang)}</p>
    </div>
  );

  const incomeRows: { label: string; value: number; bold?: boolean }[] = income ? [
    { label: t('revenue'), value: income.revenue },
    { label: t('discounts'), value: income.discount },
    { label: t('netRevenue'), value: income.net_revenue, bold: true },
    { label: t('cogs'), value: income.cogs },
    { label: t('grossProfit'), value: income.gross_profit, bold: true },
    { label: t('expenses'), value: income.expenses },
    { label: t('netIncome'), value: income.net_income, bold: true },
  ] : [];

  const tbTotals = tb.reduce((acc, r) => ({ debit: acc.debit + Number(r.debit), credit: acc.credit + Number(r.credit) }), { debit: 0, credit: 0 });

  return (
    <div>
      <PageHeader title={t('financialReports')} actions={<Button variant="outline" size="sm" onClick={exportData}><Download className="w-4 h-4" /> {t('exportExcel')}</Button>} />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {views.map((v) => (
              <button key={v.key} onClick={() => setView(v.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === v.key ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {(view === 'ledger' || view === 'income') && <Input label={t('from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}
            <Input label={view === 'income' || view === 'ledger' ? t('to') : t('asOf')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            {view === 'ledger' && accounts.length > 0 && (
              <Select label={t('accountName')} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">{t('allAccounts')}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {isAr ? a.name : (a.name_en || a.name)}</option>)}
              </Select>
            )}
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

      {loading ? (
        <Card className="p-4"><div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div></Card>
      ) : !effectiveBranchFilter ? (
        <Card className="p-4"><div className="text-center py-12 text-slate-400 text-sm">{t('filterByBranch')}</div></Card>
      ) : view === 'trial_balance' ? (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('accountCode')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('accountName')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('accountType')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('debit')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('credit')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('balance')}</th>
                </tr>
              </thead>
              <tbody>
                {tb.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t('noData')}</td></tr>}
                {tb.map((r) => (
                  <tr key={r.code} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">{r.code}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{isAr ? r.name : (r.name_en || r.name)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.account_type}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{r.debit > 0 ? formatCurrency(r.debit, currency, lang) : '-'}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{r.credit > 0 ? formatCurrency(r.credit, currency, lang) : '-'}</td>
                    <td className={`px-4 py-3 text-end font-semibold ${r.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{formatCurrency(r.balance, currency, lang)}</td>
                  </tr>
                ))}
                {tb.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
                    <td className="px-4 py-3" colSpan={3}>{t('total')}</td>
                    <td className="px-4 py-3 text-end">{formatCurrency(tbTotals.debit, currency, lang)}</td>
                    <td className="px-4 py-3 text-end">{formatCurrency(tbTotals.credit, currency, lang)}</td>
                    <td className="px-4 py-3 text-end">{formatCurrency(tbTotals.debit - tbTotals.credit, currency, lang)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : view === 'ledger' ? (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('date')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('entryNumber')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('description')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('reference')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('debit')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('credit')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('balance')}</th>
                </tr>
              </thead>
              <tbody>
                {gl.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('noData')}</td></tr>}
                {gl.map((r) => (
                  <tr key={r.line_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.entry_date}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">{r.entry_number}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.description || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.reference_number || '-'}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{r.debit > 0 ? formatCurrency(r.debit, currency, lang) : '-'}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{r.credit > 0 ? formatCurrency(r.credit, currency, lang) : '-'}</td>
                    <td className="px-4 py-3 text-end font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(r.balance, currency, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : view === 'income' ? (
        <Card className="p-4">
          {income && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {summaryCard(t('revenue'), income.revenue)}
              {summaryCard(t('cogs'), income.cogs)}
              {summaryCard(t('grossProfit'), income.gross_profit, 'text-brand-600 dark:text-brand-400')}
              {summaryCard(t('netIncome'), income.net_income, income.net_income >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {incomeRows.map((r) => (
                  <tr key={r.label} className={`border-b border-slate-100 dark:border-slate-800 ${r.bold ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">{r.label}</td>
                    <td className={`px-4 py-3 text-end ${r.bold ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{formatCurrency(r.value, currency, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : view === 'balance_sheet' ? (
        <Card className="p-4">
          {sheet && (
            <>
              <div className="flex items-center gap-2 mb-6">
                {sheet.balanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><BadgeCheck className="w-4 h-4" /> {t('balanced')}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><BadgeAlert className="w-4 h-4" /> {t('notBalanced')}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaryCard(t('assets'), sheet.assets)}
                {summaryCard(t('liabilities'), sheet.liabilities)}
                {summaryCard(t('equity'), sheet.equity)}
                {summaryCard(t('capital'), sheet.capital)}
                {summaryCard(t('retainedEarnings'), sheet.retained)}
                {summaryCard(t('netIncome'), sheet.net_income, 'text-brand-600 dark:text-brand-400')}
              </div>
            </>
          )}
        </Card>
      ) : (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('customer')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('phone')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('openBalance')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('days30')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('days60')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('days90')}</th>
                  <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('days90Plus')}</th>
                </tr>
              </thead>
              <tbody>
                {aging.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('noData')}</td></tr>}
                {aging.map((r) => (
                  <tr key={r.customer_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.phone || '-'}</td>
                    <td className="px-4 py-3 text-end font-semibold text-red-600 dark:text-red-400">{formatCurrency(r.open_amount, currency, lang)}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{formatCurrency(r.bucket_0_30, currency, lang)}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{formatCurrency(r.bucket_31_60, currency, lang)}</td>
                    <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-200">{formatCurrency(r.bucket_61_90, currency, lang)}</td>
                    <td className={`px-4 py-3 text-end ${r.bucket_90_plus > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>{formatCurrency(r.bucket_90_plus, currency, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
