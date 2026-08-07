import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Grid3x3, Plus, Pencil, Trash2, Users, UtensilsCrossed, Clock,
  XCircle, MapPin, Tag, RefreshCw, Banknote,
} from 'lucide-react';
import { supabase } from '@/api';
import * as api from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useCan } from '@/lib/permissions';
import { isAdminRole } from '@/lib/permissions';
import { PageHeader, Card } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type {
  DiningArea, DiningTable, Order, OrderItem, OrderType,
  DiningTableStatus, Branch, Product, RpcResult,
} from '@/lib/types';

const STATUS_STYLES: Record<DiningTableStatus, { label: 'vacant' | 'occupied' | 'reserved' | 'closed'; card: string; badge: string; dot: string }> = {
  vacant: { label: 'vacant', card: 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  occupied: { label: 'occupied', card: 'border-amber-400 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  reserved: { label: 'reserved', card: 'border-blue-300 dark:border-blue-700/60 bg-blue-50/70 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  closed: { label: 'closed', card: 'border-slate-300 dark:border-slate-700/60 bg-slate-100 dark:bg-navy-800/60', badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300', dot: 'bg-slate-400' },
};

const ORDER_TYPE_KEY = {
  dine_in: 'dineIn',
  takeaway: 'takeaway',
  delivery: 'delivery',
  drive_thru: 'driveThru',
} as const;

interface TablePos { table: DiningTable; left: number; top: number; width: number; height: number; }

function resolvePositions(tablesInArea: DiningTable[]): TablePos[] {
  const used = new Set<string>();
  return tablesInArea.map((tb) => {
    const l = tb.layout || { x: 0, y: 0, w: 120, h: 80 };
    let left = l.x || 0;
    const top = l.y || 0;
    let guard = 0;
    while (used.has(`${left},${top}`) && guard < 200) { left += 160; guard += 1; }
    used.add(`${left},${top}`);
    return {
      table: tb,
      left,
      top,
      width: Math.max(70, l.w || 120),
      height: Math.max(46, l.h || 80),
    };
  });
}

export function FloorPlanPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const can = useCan();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(branchFilter || '');
  const [loading, setLoading] = useState(true);
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

  async function load() {
    setLoading(true);
    try {
      const [br] = await Promise.all([
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
      ]);
      setBranches((br.data as Branch[]) || []);
      if (!effectiveBranch) { setAreas([]); setTables([]); setOrders([]); setOrderItems([]); return; }

      const [aRes, tRes, oRes, pRes] = await Promise.all([
        supabase.from('dining_areas').select('*').eq('branch_id', effectiveBranch).order('sort_order'),
        supabase.from('dining_tables').select('*').eq('branch_id', effectiveBranch).order('name'),
        supabase.from('orders')
          .select('*, table:dining_tables(*)')
          .eq('branch_id', effectiveBranch)
          .in('status', ['open', 'held'])
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ]);
      setAreas((aRes.data as DiningArea[]) || []);
      setTables((tRes.data as DiningTable[]) || []);
      const orderRows = (oRes.data as Order[]) || [];
      setOrders(orderRows);
      setProducts((pRes.data as Product[]) || []);
      const ids = orderRows.map((o) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase.from('order_items').select('*').in('order_id', ids);
        setOrderItems((items as OrderItem[]) || []);
      } else {
        setOrderItems([]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranch]);

  // Apply a filter passed from the POS header tiles (location.state.filter).
  useEffect(() => {
    const st = (location.state || {}) as { filter?: '' | 'held' | 'delivery' | 'takeaway' | null };
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

  const ordersByTable = useMemo(() => {
    const map: Record<string, Order> = {};
    for (const o of orders) {
      if (o.table_id && !map[o.table_id]) map[o.table_id] = o;
    }
    return map;
  }, [orders]);

  const openOrderCount = orders.length;

  const goToPos = (state: { orderId?: string; tableId?: string; orderType?: OrderType; branchId?: string }) => {
    navigate('/pos', { state: { orderId: state.orderId || null, tableId: state.tableId || null, orderType: state.orderType || 'dine_in', branchId: state.branchId || effectiveBranch } });
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
      await load();
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
      await load();
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
    await load();
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
    await load();
  };

  const deleteTable = async (table: DiningTable) => {
    if (!window.confirm(isAr ? `حذف الطاولة "${table.name}"؟` : `Delete table "${table.name}"?`)) return;
    const { error } = await supabase.from('dining_tables').delete().eq('id', table.id);
    if (error) { show(error.message, 'error'); return; }
    show(isAr ? 'تم الحذف' : 'Deleted', 'success');
    await load();
  };

  const deleteArea = async (area: DiningArea) => {
    if (!window.confirm(isAr ? `حذف المنطقة "${area.name}"؟` : `Delete area "${area.name}"?`)) return;
    const { error } = await supabase.from('dining_areas').delete().eq('id', area.id);
    if (error) { show(error.message, 'error'); return; }
    show(isAr ? 'تم الحذف' : 'Deleted', 'success');
    await load();
  };

  const orderItemsOf = (order: Order) => orderItems.filter((i) => i.order_id === order.id);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderTypeFilter) list = list.filter((o) => o.order_type === orderTypeFilter);
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    return list;
  }, [orders, orderTypeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('floorPlan')}
        subtitle={isAr ? 'إدارة الطاولات والطلبات المفتوحة' : 'Manage tables and open orders'}
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
            <Button variant="ghost" onClick={load} disabled={loading}>
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
              {isAr ? `${openOrderCount} طلب مفتوح` : `${openOrderCount} open orders`}
            </span>
          </div>
        </Card>
      )}

      {!effectiveBranch ? (
        <Card className="p-16 text-center text-slate-400">
          <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">{isAr ? 'اختر الفرع لعرض مخطط الصالة' : 'Select a branch to view the floor plan'}</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ===== FLOOR CANVAS ===== */}
          <div className="xl:col-span-2 space-y-5">
            {areas.length === 0 && tables.length === 0 ? (
              <Card className="p-16 text-center text-slate-400">
                <Grid3x3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{isAr ? 'لا توجد مناطق أو طاولات بعد' : 'No areas or tables yet'}</p>
                {canManage && (
                  <Button className="mt-4" onClick={() => setAreaModal(true)}>
                    <Plus className="w-4 h-4" /> {t('addArea')}
                  </Button>
                )}
              </Card>
            ) : (
              <>
                {areas.map((area) => {
                  const areaTables = tables.filter((tb) => tb.area_id === area.id);
                  if (areaTables.length === 0) return null;
                  const positions = resolvePositions(areaTables);
                  const maxW = positions.reduce((m, p) => Math.max(m, p.left + p.width), 0) + 20;
                  const maxH = positions.reduce((m, p) => Math.max(m, p.top + p.height), 0) + 20;
                  return (
                    <Card key={area.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-brand-500 dark:text-gold-400" />
                          {area.name}
                          <span className="text-xs font-normal text-slate-400">({areaTables.length})</span>
                        </h3>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openAddTable(area.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-navy-800" title={t('addTable')}>
                              <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteArea(area)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title={isAr ? 'حذف المنطقة' : 'Delete area'}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="overflow-auto rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-800">
                        <div className="relative" style={{ width: Math.max(maxW, 900), height: Math.max(maxH, 380) }}>
                          {positions.map(({ table, left, top, width, height }) => {
                            const st = STATUS_STYLES[table.status] || STATUS_STYLES.vacant;
                            const order = ordersByTable[table.id];
                            return (
                              <button
                                key={table.id}
                                onClick={() => setTableTarget(table)}
                                className={`absolute rounded-xl border-2 shadow-sm p-2 flex flex-col items-center justify-center transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98] ${st.card}`}
                                style={{ left, top, width, height }}
                              >
                                <span className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-full">{table.name}</span>
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <Users className="w-3 h-3" /> {table.capacity}
                                </span>
                                {order && (
                                  <span className={`mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold truncate max-w-full ${st.badge}`}>
                                    {order.order_number} · {formatCurrency(order.total, 'EGP', lang)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {/* Tables without an area */}
                {(() => {
                  const loose = tables.filter((tb) => !tb.area_id);
                  if (loose.length === 0) return null;
                  const positions = resolvePositions(loose);
                  const maxW = positions.reduce((m, p) => Math.max(m, p.left + p.width), 0) + 20;
                  const maxH = positions.reduce((m, p) => Math.max(m, p.top + p.height), 0) + 20;
                  return (
                    <Card key="loose" className="p-4">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {isAr ? 'طاولات بدون منطقة' : 'Tables without area'}
                      </h3>
                      <div className="overflow-auto rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-800">
                        <div className="relative" style={{ width: Math.max(maxW, 900), height: Math.max(maxH, 380) }}>
                          {positions.map(({ table, left, top, width, height }) => {
                            const st = STATUS_STYLES[table.status] || STATUS_STYLES.vacant;
                            const order = ordersByTable[table.id];
                            return (
                              <button
                                key={table.id}
                                onClick={() => setTableTarget(table)}
                                className={`absolute rounded-xl border-2 shadow-sm p-2 flex flex-col items-center justify-center transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98] ${st.card}`}
                                style={{ left, top, width, height }}
                              >
                                <span className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-full">{table.name}</span>
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <Users className="w-3 h-3" /> {table.capacity}
                                </span>
                                {order && (
                                  <span className={`mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold truncate max-w-full ${st.badge}`}>
                                    {order.order_number} · {formatCurrency(order.total, 'EGP', lang)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </>
            )}
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
                  {openOrderCount}
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
                    {ot === '' ? (isAr ? 'الكل' : 'All') : t(ORDER_TYPE_KEY[ot])}
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
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
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
                            {t(ORDER_TYPE_KEY[order.order_type])}
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
          const order = ordersByTable[tableTarget.id];
          const area = areas.find((a) => a.id === tableTarget.area_id);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.badge}`}>{t(st.label)}</span>
                {area && <span className="text-xs text-slate-400">{area.name}</span>}
                <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {tableTarget.capacity}</span>
              </div>

              {order ? (
                <div className="rounded-xl border border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-800/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{order.order_number}</span>
                    <span className="text-sm font-bold text-brand-600 dark:text-gold-400">{formatCurrency(order.total, 'EGP', lang)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-300 font-bold">{t(ORDER_TYPE_KEY[order.order_type])}</span>
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
