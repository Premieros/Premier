import { useEffect, useState } from 'react';
import { Search, Trash2, FileText, Edit2, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Card } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Select, Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { logAudit } from '@/lib/audit';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useCan } from '@/lib/permissions';
import type { Settings, Customer } from '@/lib/types';

interface SaleRow {
  id: string;
  invoice_number: string;
  total: number;
  paid_amount: number;
  refunded_amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  customer?: { name: string } | null;
  sale_items?: { id: string; product_id: string | null; unit_name: string; quantity: number; unit_price: number; discount_amount: number; refunded_quantity: number; refunded_amount: number; total: number; product?: { name: string } | null }[];
}

export function SalesPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const branchFilter = useBranchFilter();
  const can = useCan();
  const [items, setItems] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);
  const [currency, setCurrency] = useState('EGP');
  const [viewSale, setViewSale] = useState<SaleRow | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editForm, setEditForm] = useState({ customer_id: '', payment_method: '', status: '', notes: '' });
  const [refundSale, setRefundSale] = useState<SaleRow | null>(null);
  const [refundQty, setRefundQty] = useState<Record<string, string>>({});
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const isAr = lang === 'ar';

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, customersRes] = await Promise.all([
        supabase.from('settings').select('*').maybeSingle(),
        supabase.from('customers').select('*').order('name'),
      ]);
      if (settingsRes.data) setCurrency((settingsRes.data as Settings).currency || 'EGP');
      setCustomers((customersRes.data as Customer[]) || []);

      let q = supabase
        .from('sales')
        .select('id, invoice_number, total, paid_amount, refunded_amount, payment_method, status, notes, created_at, customer_id, customer:customers(name), sale_items(id, product_id, unit_name, quantity, unit_price, discount_amount, refunded_quantity, refunded_amount, total, product:products(name))')
        .order('created_at', { ascending: false });
      if (branchFilter) q = q.eq('branch_id', branchFilter);
      const { data } = await q;
      setItems((data as unknown as SaleRow[]) || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.invoice_number?.toLowerCase().includes(s) ||
      i.customer?.name?.toLowerCase().includes(s) ||
      i.status?.toLowerCase().includes(s)
    );
  });

  const openViewSale = (sale: SaleRow) => {
    setViewSale(sale);
    setEditForm({
      customer_id: sale.customer_id || '',
      payment_method: sale.payment_method,
      status: sale.status,
      notes: sale.notes || '',
    });
  };

  const openRefund = (sale: SaleRow) => {
    setRefundSale(sale);
    setRefundReason('');
    const qty: Record<string, string> = {};
    for (const item of sale.sale_items || []) {
      qty[item.id] = String(item.quantity - (item.refunded_quantity || 0));
    }
    setRefundQty(qty);
  };

  const refundLineTotal = (item: NonNullable<SaleRow['sale_items']>[number]): number => {
    const q = Math.max(0, Math.min(parseFloat(refundQty[item.id] || '0') || 0, item.quantity - (item.refunded_quantity || 0)));
    return Math.round((item.total || 0) * q / (item.quantity || 1) * 100) / 100;
  };

  const refundTotal = () => {
    let sum = 0;
    for (const item of refundSale?.sale_items || []) sum += refundLineTotal(item);
    return Math.round(sum * 100) / 100;
  };

  const submitRefund = async () => {
    if (!refundSale) return;
    const p_items: { sale_item_id: string; quantity: number }[] = [];
    for (const item of refundSale.sale_items || []) {
      const q = Math.max(0, Math.min(parseFloat(refundQty[item.id] || '0') || 0, item.quantity - (item.refunded_quantity || 0)));
      if (q > 0) p_items.push({ sale_item_id: item.id, quantity: q });
    }
    if (p_items.length === 0) { show(isAr ? 'اختر كمية للمرتجع' : 'Choose a quantity to refund', 'error'); return; }
    setRefunding(true);
    const { data, error } = await supabase.rpc('process_refund', {
      p_sale_id: refundSale.id,
      p_items,
      p_reason: refundReason.trim() || null,
    });
    setRefunding(false);
    if (error) { show(error.message, 'error'); return; }
    const result = data as { success: boolean; error?: string; detail?: string; refunded_amount?: number } | null;
    if (!result?.success) {
      show(`${isAr ? 'فشل المرتجع' : 'Refund failed'}: ${result?.detail || result?.error || 'unknown'}`, 'error');
      return;
    }
    await logAudit('update', 'sales', refundSale.id, { refunded_amount: result.refunded_amount, reason: refundReason });
    show(`${isAr ? 'تمت المعاملة' : 'Refunded'} ${formatCurrency(result.refunded_amount || 0, currency, lang)}`, 'success');
    setRefundSale(null);
    load();
  };

  const saveSaleEdit = async () => {
    if (!viewSale) return;
    const { error } = await supabase.from('sales').update({
      customer_id: editForm.customer_id || null,
      payment_method: editForm.payment_method,
      status: editForm.status,
      notes: editForm.notes || null,
    }).eq('id', viewSale.id);
    if (error) { show(error.message, 'error'); return; }
    await logAudit('update', 'sales', viewSale.id);
    show(t('saveSuccess'), 'success');
    setViewSale(null);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const sale = items.find((i) => i.id === deleteId);
    if (sale?.status === 'completed') {
      show(t('cannotDeleteCompleted'), 'error');
      setDeleteId(null);
      return;
    }
    try {
      await supabase.from('sale_items').delete().eq('sale_id', deleteId);
      const { error } = await supabase.from('sales').delete().eq('id', deleteId);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('delete', 'sales', deleteId);
      show(t('deleteSuccess'), 'success');
    } catch (err: unknown) {
      show(err instanceof Error ? err.message : 'Error', 'error');
    }
    setDeleteId(null);
    load();
  };

  const removeSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const deletable = items.filter((i) => ids.includes(i.id) && i.status !== 'completed').map((i) => i.id);
    const blocked = ids.length - deletable.length;
    for (const id of deletable) {
      await supabase.from('sale_items').delete().eq('sale_id', id);
      await supabase.from('sales').delete().eq('id', id);
      await logAudit('delete', 'sales', id);
    }
    if (blocked > 0) show(t('cannotDeleteCompleted'), 'error');
    else show(t('deleteSuccess'), 'success');
    setSelectedIds(new Set());
    setDeleteSelectedConfirm(false);
    load();
  };

  const PAYMENT_LABELS: Record<string, string> = { cash: t('cash'), card: t('card'), transfer: t('transfer'), credit: t('credit') };

  const columns: Column<SaleRow>[] = [
    { key: 'invoice_number', header: t('invoiceNumber'), render: (r) => (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-500" />
        <span className="font-medium text-slate-800 dark:text-slate-200">{r.invoice_number}</span>
      </div>
    )},
    { key: 'created_at', header: t('date'), render: (r) => <span className="text-sm text-slate-500">{formatDateTime(r.created_at, lang)}</span> },
    { key: 'customer', header: t('customer'), render: (r) => r.customer?.name || '-' },
    { key: 'total', header: t('total'), render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(r.total, currency, lang)}</span> },
    { key: 'paid_amount', header: isAr ? 'المدفوع' : 'Paid', render: (r) => formatCurrency(r.paid_amount, currency, lang) },
    { key: 'payment_method', header: isAr ? 'طريقة الدفع' : 'Payment', render: (r) => (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
        {PAYMENT_LABELS[r.payment_method] || r.payment_method}
      </span>
    )},
    { key: 'status', header: t('status'), render: (r) => (
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          r.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          r.status === 'returned' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {r.status}
        </span>
        {r.refunded_amount > 0 && r.status !== 'returned' && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            {isAr ? `مرتجع ${formatCurrency(r.refunded_amount, currency, lang)}` : `Refunded ${formatCurrency(r.refunded_amount, currency, lang)}`}
          </span>
        )}
      </div>
    )},
    { key: 'actions', header: t('actions'), render: (r) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {can('refunds.approve') && (
          <button onClick={() => openViewSale(r)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={t('edit')}>
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {can('refunds.approve') && r.status !== 'returned' && (r.refunded_amount || 0) < r.total && (
          <button onClick={() => openRefund(r)} className="p-1.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500" title={isAr ? 'مرتجع' : 'Refund'}>
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        {can('refunds.approve') && r.status !== 'completed' && (
          <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('delete')}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('salesInvoices')} actions={
        <>
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteSelectedConfirm(true)}>
              <Trash2 className="w-4 h-4" /> {t('deleteSelected')} ({selectedIds.size})
            </Button>
          )}
        </>
      } />

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? 'بحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice number or customer...'}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')}
          onRowClick={openViewSale} showCheckbox selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </Card>

      {/* Sale Detail / Edit Modal */}
      <Modal open={!!viewSale} onClose={() => setViewSale(null)} title={isAr ? 'تفاصيل الفاتورة' : 'Invoice Details'} size="lg">
        {viewSale && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <FileText className="w-8 h-8 text-brand-500" />
              <div>
                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{viewSale.invoice_number}</p>
                <p className="text-sm text-slate-500">{formatDateTime(viewSale.created_at, lang)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label={t('customer')} value={editForm.customer_id} onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}>
                <option value="">--</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label={isAr ? 'طريقة الدفع' : 'Payment Method'} value={editForm.payment_method} onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}>
                <option value="cash">{t('cash')}</option>
                <option value="card">{t('card')}</option>
                <option value="transfer">{t('transfer')}</option>
                <option value="credit">{t('credit')}</option>
              </Select>
              <Select label={t('status')} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
                <option value="pending">{isAr ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="returned">{isAr ? 'مرتجعة' : 'Returned'}</option>
              </Select>
              <div />
            </div>
            <Textarea label={t('notes')} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />

            {viewSale.sale_items && viewSale.sale_items.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{isAr ? 'أصناف الفاتورة' : 'Invoice Items'}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{t('productName')}</th>
                        <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{isAr ? 'السعر' : 'Price'}</th>
                        <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewSale.sale_items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{item.product?.name || '-'}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{item.quantity}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatCurrency(item.unit_price, currency, lang)}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{formatCurrency(item.total, currency, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span>{t('total')}</span><span className="font-bold text-brand-600">{formatCurrency(viewSale.total, currency, lang)}</span></div>
              <div className="flex justify-between text-sm"><span>{isAr ? 'المدفوع' : 'Paid'}</span><span>{formatCurrency(viewSale.paid_amount, currency, lang)}</span></div>
              {viewSale.total - viewSale.paid_amount > 0 && (
                <div className="flex justify-between text-sm text-red-600"><span>{isAr ? 'المتبقي' : 'Remaining'}</span><span>{formatCurrency(viewSale.total - viewSale.paid_amount, currency, lang)}</span></div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewSale(null)}>{t('cancel')}</Button>
              <Button onClick={saveSaleEdit}>{t('save')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal open={!!refundSale} onClose={() => setRefundSale(null)} title={isAr ? 'مرتجع الفاتورة' : 'Invoice Refund'} size="lg">
        {refundSale && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{refundSale.invoice_number}</p>
                <p className="text-sm text-slate-500">{formatDateTime(refundSale.created_at, lang)}</p>
              </div>
              <span className="text-sm text-slate-500">{isAr ? 'إجمالي الفاتورة' : 'Invoice total'}: <b>{formatCurrency(refundSale.total, currency, lang)}</b></span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                    <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{t('productName')}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{isAr ? 'كمية المرتجع' : 'Refund Qty'}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-slate-500">{isAr ? 'قيمة المرتجع' : 'Refund Value'}</th>
                  </tr>
                </thead>
                <tbody>
                  {refundSale.sale_items?.map((item) => {
                    const remaining = item.quantity - (item.refunded_quantity || 0);
                    return (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <p className="text-slate-800 dark:text-slate-200">{item.product?.name || '-'}</p>
                          <p className="text-xs text-slate-400">{isAr ? 'الكمية المبيعة' : 'Sold'}: {item.quantity}{item.refunded_quantity > 0 ? ` · ${isAr ? 'مرتجع' : 'refunded'}: ${item.refunded_quantity}` : ''}</p>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            step="any"
                            value={refundQty[item.id] ?? ''}
                            onChange={(e) => setRefundQty({ ...refundQty, [item.id]: e.target.value })}
                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{formatCurrency(refundLineTotal(item), currency, lang)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Textarea label={isAr ? 'سبب المرتجع (اختياري)' : 'Refund reason (optional)'} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} />

            <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
              <span className="font-semibold text-red-600 dark:text-red-400">{isAr ? 'قيمة المرتجع الإجمالية' : 'Total refund'}</span>
              <span className="font-bold text-lg text-red-600 dark:text-red-400">{formatCurrency(refundTotal(), currency, lang)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRefundSale(null)}>{t('cancel')}</Button>
              <Button onClick={submitRefund} disabled={refunding}>
                <RotateCcw className="w-4 h-4" /> {refunding ? '...' : (isAr ? 'تأكيد المرتجع' : 'Confirm Refund')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        title={t('deleteSale')} message={t('confirmDeleteSale')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
      <ConfirmDialog open={deleteSelectedConfirm} onClose={() => setDeleteSelectedConfirm(false)} onConfirm={removeSelected}
        title={t('deleteSelected')} message={t('confirmDeleteAll')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
    </div>
  );
}
