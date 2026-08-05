import { useEffect, useState } from 'react';
import { Plus, Search, CheckCircle2, XCircle, ArrowLeftRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import { useCan } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { useBranchFilter } from '../lib/useBranchFilter';
import { PageHeader, Card } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { formatDateTime } from '../lib/format';
import { logAudit } from '../lib/audit';
import type { WarehouseTransfer, Warehouse, Product, Branch, RpcResult } from '../lib/types';
interface TransferLine {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

const EMPTY_LINE: TransferLine = { product_id: '', quantity: 1, unit_cost: 0 };

export function TransfersPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const can = useCan();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();

  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    from_warehouse_id: '', to_warehouse_id: '', branch_id: '', reason: '', notes: '',
  });
  const [lines, setLines] = useState<TransferLine[]>([{ ...EMPTY_LINE }]);

  const [rejectTarget, setRejectTarget] = useState<WarehouseTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [tr, w, pr, br] = await Promise.all([
        supabase.from('warehouse_transfers').select('*, from_warehouse:warehouses!warehouse_transfers_from_warehouse_id_fkey(*), to_warehouse:warehouses!warehouse_transfers_to_warehouse_id_fkey(*), branch:branches(*), requester:users(id, full_name, email)').order('created_at', { ascending: false }),
        supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
      ]);
      setTransfers((tr.data as WarehouseTransfer[]) || []);
      setWarehouses((w.data as Warehouse[]) || []);
      setProducts((pr.data as Product[]) || []);
      setBranches((br.data as Branch[]) || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = transfers.filter((tr) => {
    if (branchFilter && tr.branch_id !== branchFilter) return false;
    if (!search) return true;
    return tr.transfer_number.toLowerCase().includes(search.toLowerCase())
      || (tr.from_warehouse?.name || '').toLowerCase().includes(search.toLowerCase())
      || (tr.to_warehouse?.name || '').toLowerCase().includes(search.toLowerCase());
  });

  const openAdd = () => {
    setForm({ from_warehouse_id: '', to_warehouse_id: '', branch_id: user?.branch_id || branchFilter || '', reason: '', notes: '' });
    setLines([{ ...EMPTY_LINE }]);
    setModalOpen(true);
  };

  const lookupAvgCost = async (productId: string, warehouseId: string): Promise<number> => {
    if (!productId || !warehouseId) return 0;
    const { data } = await supabase.from('inventory_batches')
      .select('unit_cost, quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId);
    const rows = (data as { unit_cost: number; quantity: number }[]) || [];
    const totalQty = rows.reduce((s, r) => s + Number(r.quantity), 0);
    if (totalQty <= 0) return 0;
    return rows.reduce((s, r) => s + Number(r.unit_cost) * Number(r.quantity), 0) / totalQty;
  };

  const updateLineProduct = async (idx: number, productId: string) => {
    const linesCopy = lines.map((l) => ({ ...l }));
    linesCopy[idx].product_id = productId;
    const cost = await lookupAvgCost(productId, form.from_warehouse_id);
    linesCopy[idx].unit_cost = Number(cost.toFixed(2));
    setLines(linesCopy);
  };

  const updateLine = (idx: number, field: keyof TransferLine, value: string | number) =>
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const addLine = () => setLines([...lines, { ...EMPTY_LINE }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const createTransfer = async () => {
    if (!form.from_warehouse_id || !form.to_warehouse_id || form.from_warehouse_id === form.to_warehouse_id) {
      show(t('required') + ': ' + t('fromWarehouse'), 'error');
      return;
    }
    if (!form.branch_id) { show(t('required') + ': ' + t('branch'), 'error'); return; }
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0);
    if (validLines.length === 0) { show(t('required') + ': ' + t('transferItems'), 'error'); return; }

    const { data, error } = await supabase.rpc('create_warehouse_transfer', {
      p_from_warehouse_id: form.from_warehouse_id,
      p_to_warehouse_id: form.to_warehouse_id,
      p_branch_id: form.branch_id,
      p_items: validLines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_cost: l.unit_cost,
      })),
      p_reason: form.reason || null,
      p_notes: form.notes || null,
    });
    if (error) { show(error.message, 'error'); return; }
    const result = data as RpcResult | null;
    if (!result?.success) { show(result?.detail || result?.error || t('error'), 'error'); return; }
    await logAudit('create', 'warehouse_transfers', result.transfer_id, { number: result.transfer_number });
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const approve = async (tr: WarehouseTransfer) => {
    const { data, error } = await supabase.rpc('approve_warehouse_transfer', { p_transfer_id: tr.id });
    if (error) { show(error.message, 'error'); return; }
    const result = data as RpcResult | null;
    if (!result?.success) { show(result?.detail || result?.error || t('error'), 'error'); return; }
    await logAudit('update', 'warehouse_transfers', tr.id, { action: 'approve' });
    show(t('saveSuccess'), 'success');
    load();
  };

  const openReject = (tr: WarehouseTransfer) => { setRejectTarget(tr); setRejectReason(''); };

  const doReject = async () => {
    if (!rejectTarget) return;
    const { data, error } = await supabase.rpc('reject_warehouse_transfer', {
      p_transfer_id: rejectTarget.id,
      p_reason: rejectReason || null,
    });
    if (error) { show(error.message, 'error'); return; }
    const result = data as RpcResult | null;
    if (!result?.success) { show(result?.detail || result?.error || t('error'), 'error'); return; }
    await logAudit('update', 'warehouse_transfers', rejectTarget.id, { action: 'reject', reason: rejectReason });
    show(t('saveSuccess'), 'success');
    setRejectTarget(null);
    load();
  };

  const statusPill = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const label: Record<string, string> = {
      pending: t('statusPending'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.pending}`}>{label[status] || status}</span>;
  };

  const columns: Column<WarehouseTransfer>[] = [
    { key: 'transfer_number', header: t('transferNumber'), render: (tr) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <ArrowLeftRight className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{tr.transfer_number}</p>
          {tr.reason && <p className="text-xs text-slate-400">{tr.reason}</p>}
        </div>
      </div>
    )},
    { key: 'from', header: t('fromWarehouse'), render: (tr) => tr.from_warehouse?.name || '-' },
    { key: 'to', header: t('toWarehouse'), render: (tr) => tr.to_warehouse?.name || '-' },
    { key: 'branch', header: t('branch'), render: (tr) => tr.branch?.name || '-' },
    { key: 'status', header: t('status'), render: (tr) => statusPill(tr.status) },
    { key: 'requested_at', header: t('requestedAt'), render: (tr) => formatDateTime(tr.requested_at, lang) },
    { key: 'actions', header: t('actions'), render: (tr) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {can('inventory.transfers.approve') && tr.status === 'pending' && (
          <button onClick={() => approve(tr)} className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500" title={t('approveTransfer')}>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
        {can('inventory.transfers.approve') && tr.status === 'pending' && (
          <button onClick={() => openReject(tr)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('rejectTransfer')}>
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('warehouseTransfers')} subtitle={t('transfers')} actions={
        can('inventory.transfers') ? (
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('newTransfer')}</Button>
        ) : undefined
      } />

      <Card className="mb-4 p-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newTransfer')} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label={t('fromWarehouse')} value={form.from_warehouse_id} onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })}>
              <option value="">{t('fromWarehouse')}</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
            <Select label={t('toWarehouse')} value={form.to_warehouse_id} onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })}>
              <option value="">{t('toWarehouse')}</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
            <Select label={t('branch')} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} disabled={!!branchFilter}>
              <option value="">{t('branch')}</option>
              {branches.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
            </Select>
            <Input label={t('reason')} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('transferItems')}</p>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4" /> {t('add')}</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_110px_110px_36px] gap-2 items-end">
                  <Select value={l.product_id} onChange={(e) => updateLineProduct(idx, e.target.value)}>
                    <option value="">{t('selectProduct')}</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Input type="number" step="0.0001" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)} placeholder={t('quantity')} />
                  <Input type="number" step="0.01" value={l.unit_cost} onChange={(e) => updateLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder={t('unitCost')} />
                  <button onClick={() => removeLine(idx)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={t('delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Input label={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={createTransfer}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={t('rejectTransfer')} size="sm">
        {rejectTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('transferNumber')}: <b>{rejectTarget.transfer_number}</b></p>
            <Input label={t('rejectReason')} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejectTarget(null)}>{t('cancel')}</Button>
              <Button variant="danger" onClick={doReject}>{t('rejectTransfer')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
