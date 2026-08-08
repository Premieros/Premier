import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Users, UtensilsCrossed, Clock,
  XCircle, Tag, RefreshCw, Banknote, Activity, Pause,
  Truck, ShoppingBag,
} from 'lucide-react';
import { supabase } from '@/api';
import * as api from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useCan, isAdminRole } from '@/lib/permissions';
import { PageHeader, Card, StatCard } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { DiningArea, DiningTable, Order, OrderType, RpcResult } from '@/lib/types';
import { useActiveOrders } from '../hooks/useActiveOrders';
import { TableFloorPlan } from '../components/floor/TableFloorPlan';
import { STATUS_STYLES } from '../utils/orderTypes';
import { orderTypeLabel } from '../utils/format';
import { filterOrdersByType, filterOrdersByStatus } from '../utils/orderFilters';

interface FilterState {
  filter?: '' | 'held' | 'delivery' | 'takeaway' | null;
}

export function ActiveOrdersPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const can = useCan();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; name_en: string | null }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; name_en: string | null }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(branchFilter || '');
  const [areasLoading, setAreasLoading] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'held'>('all');
  const [busy, setBusy] = useState(false);

  const [tableTarget, setTableTarget] = useState<DiningTable | null>(null);
  const [editTarget, setEditTarget] = useState<DiningTable | null>(null);
  const [areaModal, setAreaModal] = useState(false);
  const [tableModal, setTableModal] = useState(false);

  const [areaName, setAreaName] = useState('');
  const [tableForm, setTableForm] = useState({
    name: '', capacity: 4, area_id: '', x: 0, y: 0, w: 120, h: 80,
  });

  const effectiveBranch = selectedBranch || branchFilter || user?.branch_id || '';
  const isAdmin = isAdminRole(user?.role);
  const canManage = can('floor_plan.manage');

  const { orders, tables, counts, ordersByTable, itemsByOrder, loading, error } = useActiveOrders(effectiveBranch);

  // Areas and product names are not part of the realtime snapshot; load them
  // separately (reloaded after area/table CRUD via loadAreas).
  const loadAreas = async () => {
    if (!effectiveBranch) { setAreas([]); return; }
    setAreasLoading(true);
    try {
      const { data } = await supabase.from('dining_areas').select('*').eq('branch_id', effectiveBranch).order('sort_order');
      setAreas((data as DiningArea[]) || []);
    } finally {
      setAreasLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('branches').select('id, name, name_en').eq('is_active', true).order('name'),
      supabase.from('products').select('id, name, name_en').eq('is_active', true),
    ]).then(([bRes, pRes]) => {
      if (cancelled) return;
      setBranches((bRes.data as { id: string; name: string; name_en: string | null }[]) || []);
      setProducts((pRes.data as { id: string; name: string; name_en: string | null }[]) || []);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void loadAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranch]);

  // Apply a filter passed from the POS workspace summary tiles.
  useEffect(() => {
    const st = (location.state || {}) as FilterState;
    const filter = st.filter;
    if (filter === 'delivery' || filter === 'takeaway') setOrderTypeFilter(filter);
    if (filter === 'held') setStatusFilter('held');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of products) map[p.id] = isAr ? p.name : (p.name_en || p.name);
    return map;
  }, [products, isAr]);

  const goToPos = (opts: { orderId?: string; tableId?: string; orderType?: OrderType; branchId?: string }) => {
    if (opts.orderId) {
      navigate(`/pos/${opts.orderId}`, { state: { branchId: opts.branchId || effectiveBranch } });
    } else {
      navigate('/pos', { state: { tableId: opts.tableId || null, orderType: opts.orderType || 'dine_in', branchId: opts.branchId || effectiveBranch } });
    }
  };

  const startOrder = (table: DiningTable) => goToPos({ tableId: table.id, orderType: 'dine_in', branchId: table.branch_id });

  const resumeOrder = (order: Order) => goToPos({ orderId: order.id, orderType: order.order_type, branchId: order.branch_id });

  const setStatus = async (tableId: string, status: string) => {
    setBusy(true);
    const { data, error } = await api.floorPlan.setTableStatus({ p_table_id: tableId, p_status: status });
    if (error) { show(error.message, 'error'); }
    else if (!(data as RpcResult | null)?.success) {
      const r = data as RpcResult | null;
      show(r?.detail || r?.error || t('error'), 'error');
    } else {
      show(t('saveSuccess'), 'success');
    }
    setBusy(false);
  };

  const setOrderStatus = async (order: Order, status: 'open' | 'held' | 'completed' | 'cancelled') => {
    setBusy(true);
    const { data, error } = await api.floorPlan.setOrderStatus({ p_order_id: order.id, p_status: status });
    if (error) { show(error.message, 'error'); }
    else if (!(data as RpcResult | null)?.success) {
      const r = data as RpcResult | null;
      show(r?.detail || r?.error || t('error'), 'error');
    } else {
      show(status === 'cancelled' ? t('cancelOrder') : t('saveSuccess'), 'success');
    }
    setBusy(false);
  };

  const createArea = async () => {
    if (!areaName.trim()) { show(t('required'), 'error'); return; }
    const { error } = await supabase.from('dining_areas').insert({ name: areaName.trim(), branch_id: effectiveBranch });
    if (error) { show(error.message, 'error'); return; }
    show(t('saveSuccess'), 'success');
    setAreaName('');
    setAreaModal(false);
    await loadAreas();
  };

  const openAddTable = (areaId = '') => {
    setTableForm({ name: '', capacity: 4, area_id: areaId, x: 0, y: 0, w: 120, h: 80 });
    setTableModal(true);
  };

  const saveTable = async () => {
    if (!tableForm.name.trim()) { show(t('required'), 'error'); return; }
    const payload = {
      name: tableForm.name.trim(),
      branch_id: effectiveBranch,
      area_id: tableForm.area_id || null,
      capacity: Number(tableForm.capacity) || 4,
      layout: {
        x: Number(tableForm.x) || 0,
        y: Number(tableForm.y) || 0,
        w: Math.max(70, Number(tableForm.w) || 120),
        h: Math.max(46, Number(tableForm.h) || 80),
      },
    };
    const { error } = editTarget
      ? await supabase.from('dining_tables').update(payload).eq('id', editTarget.id)
      : await supabase.from('dining_tables').insert(payload);
    if (error) { show(error.message, 'error'); return; }
    show(t('saveSuccess'), 'success');
    setTableModal(false);
    setEditTarget(null);
  };

  const deleteTable = async (table: DiningTable) => {
    if (!window.confirm(isAr ? `حذف الطاولة "${table.name}"؟` : `Delete table "${table.name}"?`)) return;
    const { error } = await supabase.from('dining_tables').delete().eq('id', table.id);
    if (error) { show(error.message, 'error'); return; }
    show(isAr ? 'تم الحذف' : 'Deleted', 'success');
  };

  const deleteArea = async (area: DiningArea) => {
    if (!window.confirm(isAr ? `حذف المنطقة "${area.name}"؟` : `Delete area "${area.name}"?`)) return;
    const { error } = await supabase.from('dining_areas').delete().eq('id', area.id);
    if (error) { show(error.message, 'error'); return; }
    show(isAr ? 'تم الحذف' : 'Deleted', 'success');
    await loadAreas();
  };

  const orderItemsOf = (order: Order) => itemsByOrder[order.id] || [];

  const filteredOrders = useMemo(() => {
    let list = filterOrdersByType(orders, orderTypeFilter);
    list = filterOrdersByStatus(list, statusFilter);
    return list;
  }, [orders, orderTypeFilter, statusFilter]);

  const statCards = [
    { key: 'active', title: t('activeOrders'), value: String(counts.active), icon: <Activity className="w-6 h-6" />, color: 'brand' },
    { key: 'occupied', title: t('occupiedTables'), value: String(tables.filter((tb) => tb.status === 'occupied').length), icon: <UtensilsCrossed className="w-6 h-6" />, color: 'green' },
    { key: 'held', title: t('heldOrders'), value: String(counts.held), icon: <Pause className="w-6 h-6" />, color: 'amber' },
    { key: 'delivery', title: t('deliveryOrders'), value: String(counts.delivery), icon: <Truck className="w-6 h-6" />, color: 'blue' },
    { key: 'takeaway', title: t('takeawayOrders'), value: String(counts.takeaway), icon: <ShoppingBag className="w-6 h-6" />, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('activeOrders')}
        subtitle={isAr ? 'مركز الطلبات النشطة والطاولات' : 'Active orders and table center'}
        actions={
          <>
            {canManage && (
              <>
                <Button variant="outline" onClick={() => setAreaModal(true)}>
                  <Plus className="w-4 h-4" /> {t('addArea')}
                </Button>
                <Button onClick={() => openAddTable()}>
                  <Plus className="w-4 h-4" /> {t('addTable')}
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={loadAreas} disabled={areasLoading}>
              <RefreshCw className="w-4 h-4" /> {isAr ? 'تحديث' : 'Refresh'}
            </Button>
          </>
        }
      />

      {/* Branch selector (admins) */}
      {isAdmin && (
        <Card className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Tag className="w-4 h-4 text-slate-400" />
            <select
              value={effectiveBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
            >
              <option value="">{isAr ? 'اختر الفرع' : 'Select Branch'}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
            </select>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {isAr ? `${counts.active} طلب نشط` : `${counts.active} active orders`}
            </span>
          </div>
        </Card>
      )}

      {/* Live summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <StatCard key={s.key} title={s.title} value={s.value} icon={s.icon} color={s.color} />
        ))}
      </div>

      {!effectiveBranch ? (
        <Card className="p-16 text-center text-slate-400">
          <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">{isAr ? 'اختر الفرع لعرض مركز الطلبات' : 'Select a branch to view the active orders'}</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ===== FLOOR CANVAS ===== */}
          <div className="xl:col-span-2 space-y-5">
            {error && (
              <Card className="p-3 text-sm text-red-500 border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10">
                {error}
              </Card>
            )}
            <TableFloorPlan
              areas={areas}
              tables={tables}
              ordersByTable={ordersByTable}
              canManage={canManage}
              currency="EGP"
              onSelectTable={setTableTarget}
              onAddTable={openAddTable}
              onDeleteArea={deleteArea}
            />
          </div>

          {/* ===== OPEN ORDERS PANEL ===== */}
          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-500 dark:text-gold-400" />
                  {t('openOrders')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold">
                  {orders.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(['', 'dine_in', 'takeaway', 'delivery', 'drive_thru'] as const).map((ot) => (
                  <button
                    key={ot}
                    onClick={() => setOrderTypeFilter(ot)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      orderTypeFilter === ot
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {ot === '' ? (isAr ? 'الكل' : 'All') : orderTypeLabel(t, ot)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(['all', 'open', 'held'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      statusFilter === s
                        ? 'bg-navy-700 text-gold-400'
                        : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {s === 'all' ? (isAr ? 'الكل' : 'All') : t(s)}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t('noOpenOrders')}</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div key={order.id} className="p-3 rounded-xl border border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-800/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-700 dark:text-white truncate">{order.order_number}</span>
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-300">
                            {orderTypeLabel(t, order.order_type)}
                          </span>
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            {t(order.status === 'held' ? 'holdOrder' : 'open')}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-brand-600 dark:text-gold-400 shrink-0">
                          {formatCurrency(order.total, 'EGP', lang)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.table ? `${order.table.name} · ` : ''}{formatDateTime(order.created_at, lang)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" onClick={() => resumeOrder(order)}>
                          <UtensilsCrossed className="w-3.5 h-3.5" /> {t('resumeOrder')}
                        </Button>
                        <Button size="sm" variant="success" onClick={() => resumeOrder(order)}>
                          <Banknote className="w-3.5 h-3.5" /> {t('payOrder')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOrderStatus(order, 'cancelled')} disabled={busy}>
                          <XCircle className="w-3.5 h-3.5" /> {t('cancelOrder')}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===== TABLE ACTION MODAL ===== */}
      <Modal open={!!tableTarget} onClose={() => setTableTarget(null)} title={tableTarget?.name || ''} size="md">
        {tableTarget && (() => {
          const st = STATUS_STYLES[tableTarget.status] || STATUS_STYLES.vacant;
          const tableOrders = ordersByTable[tableTarget.id] || [];
          const area = areas.find((a) => a.id === tableTarget.area_id);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.badge}`}>{t(st.label)}</span>
                {area && <span className="text-xs text-slate-400">{area.name}</span>}
                <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {tableTarget.capacity}</span>
              </div>

              {tableOrders.length > 0 ? (
                <div className="space-y-2">
                  {tableOrders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-800/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{order.order_number}</span>
                        <span className="text-sm font-bold text-brand-600 dark:text-gold-400">{formatCurrency(order.total, 'EGP', lang)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-300 font-bold">{orderTypeLabel(t, order.order_type)}</span>
                        <span>{formatDateTime(order.created_at, lang)}</span>
                      </div>
                      <div className="space-y-1">
                        {orderItemsOf(order).map((item) => (
                          <div key={item.id} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                            <span className="truncate">{productName[item.product_id || ''] || '—'} × {Number(item.quantity)}</span>
                            <span className="shrink-0 font-medium">{formatCurrency(item.total, 'EGP', lang)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" onClick={() => resumeOrder(order)}>
                          <UtensilsCrossed className="w-4 h-4" /> {t('resumeOrder')}
                        </Button>
                        <Button size="sm" variant="success" onClick={() => resumeOrder(order)}>
                          <Banknote className="w-4 h-4" /> {t('payOrder')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {isAr ? 'لا يوجد طلب مفتوح على هذه الطاولة.' : 'No open order on this table.'}
                  </p>
                  <Button size="lg" className="w-full" onClick={() => { startOrder(tableTarget); }}>
                    <UtensilsCrossed className="w-5 h-5" /> {t('openOrder')}
                  </Button>
                </div>
              )}

              {canManage && (
                <>
                  <div className="border-t border-slate-100 dark:border-navy-800 pt-3">
                    <p className="text-xs font-bold text-slate-400 mb-2">{isAr ? 'حالة الطاولة' : 'Table status'}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['vacant', 'reserved', 'closed'] as const).map((s) => (
                        <button
                          key={s}
                          disabled={busy || tableTarget.status === s}
                          onClick={() => setStatus(tableTarget.id, s)}
                          className={`px-2 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-40 ${STATUS_STYLES[s].badge} border-slate-200 dark:border-navy-700`}
                        >
                          {t(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setEditTarget(tableTarget); setTableModal(true); setTableTarget(null); }}>
                      <Pencil className="w-4 h-4" /> {isAr ? 'تعديل' : 'Edit'}
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => { deleteTable(tableTarget); setTableTarget(null); }}>
                      <Trash2 className="w-4 h-4" /> {isAr ? 'حذف' : 'Delete'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ===== ADD AREA ===== */}
      <Modal open={areaModal} onClose={() => setAreaModal(false)} title={t('addArea')} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('areaName')}</label>
            <input
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder={isAr ? 'مثال: التراس' : 'e.g. Terrace'}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
          <Button className="w-full" onClick={createArea}>{t('saveSuccess')}</Button>
        </div>
      </Modal>

      {/* ===== ADD / EDIT TABLE ===== */}
      <Modal open={tableModal} onClose={() => { setTableModal(false); setEditTarget(null); }} title={editTarget ? `${isAr ? 'تعديل' : 'Edit'} ${editTarget.name}` : t('addTable')} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('tableName')}</label>
              <input
                value={tableForm.name}
                onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('capacity')}</label>
              <input
                type="number"
                value={tableForm.capacity}
                min={1}
                onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{isAr ? 'المنطقة' : 'Area'}</label>
            <select
              value={tableForm.area_id}
              onChange={(e) => setTableForm({ ...tableForm, area_id: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
            >
              <option value="">{isAr ? 'بدون منطقة' : 'No area'}</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['x', 'y', 'w', 'h'] as const).map((k) => (
              <div key={k}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase">{k}</label>
                <input
                  type="number"
                  value={tableForm[k]}
                  onChange={(e) => setTableForm({ ...tableForm, [k]: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
                />
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={saveTable}>{t('saveSuccess')}</Button>
        </div>
      </Modal>
    </div>
  );
}
