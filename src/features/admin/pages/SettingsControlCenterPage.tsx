import { useEffect, useMemo, useState } from 'react';
import {
  Save, Store, Receipt, Palette, ShoppingCart, FileText, Boxes, ShieldCheck,
  Building2, Trash2, Plus, FlaskConical, Search, SlidersHorizontal, Users,
  Wrench, Package, Bike, ChefHat, Calculator, Bell, Activity,
  Link2, Settings2, Check, Languages, Table2, ListOrdered,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, admin } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';
import { PageHeader, Card } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { logAudit } from '@/lib/audit';
import { BRAND_PRESETS, applyBrandColor, brandFromSettingsValue } from '@/lib/brandColor';
import { findUiTheme, UI_THEMES } from '@/lib/themes';
import type { Settings as SettingsType, BranchSettings } from '@/lib/types';
import { RolesTab } from './RolesTab';

type FieldType = 'text' | 'number' | 'select' | 'toggle' | 'textarea';
type FieldDef = {
  key: keyof SettingsType;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  help?: string;
  step?: string;
  min?: number;
  max?: number;
};
type SectionKind = 'fields' | 'appearance' | 'language' | 'branches' | 'roles' | 'system' | 'info';
type SectionDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
  kind: SectionKind;
  fields?: FieldDef[];
  note?: string;
};

const SECTIONS: SectionDef[] = [
  { key: 'general', label: 'عام / الشركة', icon: <Store className="w-4 h-4" />, kind: 'fields', fields: [
    { key: 'store_name', label: 'اسم المتجر', type: 'text' },
    { key: 'store_address', label: 'عنوان المتجر', type: 'text' },
    { key: 'store_phone', label: 'هاتف المتجر', type: 'text' },
    { key: 'logo_url', label: 'شعار (رابط صورة)', type: 'text' },
    { key: 'currency', label: 'العملة', type: 'text' },
  ] },
  { key: 'appearance', label: 'المظهر / الثيم', icon: <Palette className="w-4 h-4" />, kind: 'appearance' },
  { key: 'language', label: 'اللغة / التوطين', icon: <Languages className="w-4 h-4" />, kind: 'language' },
  { key: 'pos', label: 'نقطة البيع والمبيعات', icon: <ShoppingCart className="w-4 h-4" />, kind: 'fields', fields: [
    { key: 'pos_default_payment_method', label: 'طريقة الدفع الافتراضية', type: 'select', options: [
      { value: 'cash', label: 'نقدي' }, { value: 'card', label: 'بطاقة' }, { value: 'transfer', label: 'تحويل' }, { value: 'credit', label: 'آجل' },
    ] },
    { key: 'pos_barcode_autofocus', label: 'تركيز تلقائي على الباركود', type: 'toggle', help: 'يُركز مؤشر الإدخال على حقل البحث/الباركود تلقائيًا عند فتح نقطة البيع' },
  ] },
  { key: 'orderTypes', label: 'أنواع الطلبات وسير العمل', icon: <ListOrdered className="w-4 h-4" />, kind: 'info', note: 'سلوك أنواع الطلبات والطلب الافتراضي يتبع إعدادات نقطة البيع، ويتم إدارته من شاشة البيع نفسها.' },
  { key: 'floorPlan', label: 'الطاولات / خريطة الصالة', icon: <Table2 className="w-4 h-4" />, kind: 'info', note: 'تُدار الطاولات وحالة خريطة الصالة من شاشة الطاولات.' },
  { key: 'invoices', label: 'الفواتير والضريبة', icon: <FileText className="w-4 h-4" />, kind: 'fields', fields: [
    { key: 'tax_rate', label: 'نسبة الضريبة %', type: 'number', step: '0.01' },
    { key: 'tax_enabled', label: 'تفعيل الضريبة', type: 'select', options: [{ value: '1', label: 'نعم' }, { value: '0', label: 'لا' }] },
  ] },
  { key: 'receipt', label: 'الإيصالات والطباعة', icon: <Receipt className="w-4 h-4" />, kind: 'fields', fields: [
    { key: 'receipt_width_mm', label: 'مقاس الورق (مم)', type: 'select', options: [{ value: '58', label: '58 مم' }, { value: '80', label: '80 مم' }] },
    { key: 'receipt_copies', label: 'عدد النسخ', type: 'number', min: 1, max: 5 },
    { key: 'receipt_show_tax', label: 'إظهار الضريبة', type: 'toggle' },
    { key: 'receipt_show_qr', label: 'إظهار رمز QR', type: 'toggle' },
    { key: 'receipt_auto_print', label: 'طباعة تلقائية بعد البيع', type: 'toggle' },
    { key: 'receipt_header', label: 'ترويسة الإيصال', type: 'textarea' },
    { key: 'receipt_footer', label: 'تذييل الإيصال', type: 'textarea' },
  ] },
  { key: 'inventory', label: 'المخزون والمستودعات', icon: <Boxes className="w-4 h-4" />, kind: 'fields', fields: [
    { key: 'low_stock_threshold', label: 'حد المخزون المنخفض', type: 'number', step: '0.5', min: 0 },
  ] },
  { key: 'purchasing', label: 'المشتريات', icon: <Package className="w-4 h-4" />, kind: 'info', note: 'لا توجد إعدادات عامة إضافية حاليًا؛ تُدار المشتريات من شاشة المشتريات.' },
  { key: 'production', label: 'الإنتاج / الوصفات', icon: <Wrench className="w-4 h-4" />, kind: 'info', note: 'تُدار الوصفات وأوامر الإنتاج من شاشات التصنيع.' },
  { key: 'delivery', label: 'التوصيل والسائقون', icon: <Bike className="w-4 h-4" />, kind: 'info', note: 'بيانات التوصيل تُدخل مع الطلب من شاشة البيع.' },
  { key: 'kitchen', label: 'المطبخ / KDS', icon: <ChefHat className="w-4 h-4" />, kind: 'info', note: 'تُدار إرسالات المطبخ من شاشة البيع. محطات المطبخ تُدار من صفحة محطات المطبخ.' },
  { key: 'customers', label: 'العملاء والولاء', icon: <Users className="w-4 h-4" />, kind: 'info', note: 'تُدار بيانات العملاء من شاشة العملاء.' },
  { key: 'discounts', label: 'الخصومات والعروض', icon: <Activity className="w-4 h-4" />, kind: 'info', note: 'الخصم متاح من شاشة البيع (خصم كلي على الطلب).' },
  { key: 'accounting', label: 'المحاسبة / الخزينة', icon: <Calculator className="w-4 h-4" />, kind: 'info', note: 'تُدار الحسابات والقيود والخزينة من شاشات المحاسبة.' },
  { key: 'branches', label: 'تجاوزات الفروع', icon: <Building2 className="w-4 h-4" />, kind: 'branches' },
  { key: 'roles', label: 'المستخدمون / الأدوار / الأمان', icon: <ShieldCheck className="w-4 h-4" />, kind: 'roles' },
  { key: 'notifications', label: 'الإشعارات', icon: <Bell className="w-4 h-4" />, kind: 'info', note: 'لا توجد إعدادات إشعارات عامة حاليًا.' },
  { key: 'system', label: 'النظام / الصيانة', icon: <Settings2 className="w-4 h-4" />, kind: 'system' },
];

function rgbToHex(hue: number, sat: number): string {
  const n = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  const s = sat / 100;
  const l = 42 / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((hue % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return '#' + n(r + m) + n(g + m) + n(b + m);
}

export function SettingsControlCenterPage() {
  const { t, lang, setLang } = useLanguage();
  const { setTheme, setUiTheme } = useTheme();
  const { settings, branchSettingsMap, save, saveBranchSettings } = useSettings();
  const { branches } = useBranches();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const [active, setActive] = useState('general');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsType | null>(null);
  const [branchId, setBranchId] = useState('');
  const [branchForm, setBranchForm] = useState<Partial<BranchSettings>>({});
  const [brandHex, setBrandHex] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoConfirmOpen, setDemoConfirmOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm((prev) => prev ?? { ...settings });
    const uiPreset = findUiTheme(settings.brand_color || '');
    const brand = uiPreset ? { hue: uiPreset.brandHue, sat: uiPreset.brandSat } : brandFromSettingsValue(settings.brand_color || '');
    setBrandHex(rgbToHex(brand.hue, brand.sat));
  }, [settings]);

  useEffect(() => {
    if (branchId && branches.length) {
      const row = branchSettingsMap[branchId] || null;
      setBranchForm({
        branch_id: branchId,
        receipt_header: row?.receipt_header ?? '',
        receipt_footer: row?.receipt_footer ?? '',
        logo_url: row?.logo_url ?? '',
        tax_rate: row?.tax_rate ?? null,
        tax_enabled: row?.tax_enabled ?? null,
        currency: row?.currency ?? '',
        low_stock_threshold: row?.low_stock_threshold ?? null,
      });
    }
  }, [branchId, branchSettingsMap, branches.length]);

  const current = SECTIONS.find((s) => s.key === active) || SECTIONS[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => `${s.label} ${(s.fields || []).map((f) => f.label).join(' ')}`.toLowerCase().includes(q));
  }, [query]);

  const set = <K extends keyof SettingsType>(k: K, v: SettingsType[K]) => {
    if (!form) return;
    setForm({ ...form, [k]: v });
  };

  const pickPreset = (key: string) => {
    const p = BRAND_PRESETS.find((x) => x.key === key);
    if (!p) return;
    applyBrandColor(p.hue, p.sat);
    setBrandHex(rgbToHex(p.hue, p.sat));
    set('brand_color', key);
    setCustomBrand('');
  };

  const pickTheme = (key: string) => {
    const p = findUiTheme(key);
    if (!p) return;
    setUiTheme(key);
    set('brand_color', key);
    set('theme', p.mode);
    setTheme(p.mode);
    setBrandHex(rgbToHex(p.brandHue, p.brandSat));
    setCustomBrand('');
  };

  const applyCustomHex = (hex: string) => {
    const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return;
    const brand = brandFromSettingsValue(hex);
    applyBrandColor(brand.hue, brand.sat);
    setBrandHex(hex);
    set('brand_color', hex);
  };

  const saveAll = async () => {
    if (!form || !settings) return;
    setSaving(true);
    const ok = await save({
      ...form,
      tax_rate: Number(form.tax_rate) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      receipt_copies: Math.min(5, Math.max(1, Number(form.receipt_copies) || 1)),
    });
    if (ok) {
      await logAudit('update', 'settings', settings.id);
      show(isAr ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
    } else {
      show(isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const saveBranch = async () => {
    if (!branchId) return;
    setSaving(true);
    const patch: Partial<BranchSettings> = {
      receipt_header: branchForm.receipt_header || null,
      receipt_footer: branchForm.receipt_footer || null,
      logo_url: branchForm.logo_url || null,
      tax_rate: branchForm.tax_rate != null && !Number.isNaN(branchForm.tax_rate) ? branchForm.tax_rate : null,
      tax_enabled: branchForm.tax_enabled ?? null,
      currency: branchForm.currency || null,
      low_stock_threshold: branchForm.low_stock_threshold != null && !Number.isNaN(branchForm.low_stock_threshold) ? branchForm.low_stock_threshold : null,
    };
    const ok = await saveBranchSettings(branchId, patch);
    if (ok) {
      await logAudit('update', 'branch_settings', branchId);
      show(isAr ? 'تم حفظ إعدادات الفرع' : 'Branch settings saved', 'success');
    } else {
      show(isAr ? 'فشل حفظ إعدادات الفرع' : 'Failed to save branch settings', 'error');
    }
    setSaving(false);
  };

  const clearBranchSettings = async () => {
    if (!branchId || !branchSettingsMap[branchId]) return;
    setSaving(true);
    const { error } = await supabase.from('branch_settings').delete().eq('branch_id', branchId);
    if (!error) show(isAr ? 'تمت إعادة تعيين إعدادات الفرع إلى الإعدادات العامة' : 'Branch settings reset to global', 'success');
    else show(error.message, 'error');
    setSaving(false);
  };

  const handleSeedDemo = async () => {
    if (!branchId) return;
    setDemoBusy(true);
    const { data, error } = await admin.seedDemoData({ p_branch_id: branchId });
    setDemoBusy(false);
    if (error) { show(error.message, 'error'); return; }
    const res = data as { success?: boolean; seeded?: number; existing?: boolean } | null;
    if (!res?.success) { show(isAr ? 'تعذر إضافة البيانات التجريبية' : 'Failed to add demo data', 'error'); return; }
    if (res.existing) { show(t('demoAlreadyExists'), 'info'); return; }
    await logAudit('create', 'demo_data', branchId, { action: 'seed' });
    show(t('demoSeeded'), 'success');
  };

  const handleDeleteDemo = async () => {
    if (!branchId) return;
    setDemoBusy(true);
    const { data, error } = await admin.deleteDemoData({ p_branch_id: branchId });
    setDemoBusy(false);
    if (error) { show(error.message, 'error'); return; }
    const res = data as { success?: boolean } | null;
    if (!res?.success) { show(isAr ? 'تعذر حذف البيانات التجريبية' : 'Failed to delete demo data', 'error'); return; }
    await logAudit('delete', 'demo_data', branchId, { action: 'delete' });
    show(t('demoDeleted'), 'success');
  };

  if (!form) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>;
  }

  const selectedBranch = branches.find((b) => b.id === branchId);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={t('settings')}
        subtitle={isAr ? 'مركز التحكم الموحد — كل إعداد معروض موصول بمستهلك فعلي' : 'Unified Settings Control Center — every setting is wired to a real consumer'}
        actions={(
          <Button onClick={saveAll} disabled={saving}>
            <Save className="w-4 h-4" /> {t('save')}
          </Button>
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <Card className="h-fit p-3">
          <div className="relative mb-3">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? 'بحث في الإعدادات...' : 'Search settings...'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-800"
            />
          </div>
          <div className="space-y-1">
            {filtered.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition ${
                  active === s.key
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800'
                }`}
              >
                {s.icon}
                <span className="flex-1">{s.label}</span>
                {s.kind === 'info' && <SlidersHorizontal className="h-3.5 w-3.5 opacity-50" />}
              </button>
            ))}
          </div>
        </Card>

        {/* Content */}
        <div className="min-w-0">
          {current.kind === 'fields' && (
            <Card className="p-5">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-navy-800">
                {current.icon}
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{current.label}</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {(current.fields || []).map((f) => (
                  <div key={f.key as string} className="rounded-2xl border border-slate-200 p-4 dark:border-navy-700">
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
                    {f.help && <p className="mb-2 text-xs text-slate-400">{f.help}</p>}
                    <FieldControl field={f} value={form[f.key]} onChange={(v) => set(f.key, v as never)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {current.kind === 'info' && (
            <Card className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800">{current.icon}</div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{current.label}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{current.note}</p>
              <p className="mt-3 text-xs text-slate-400">{isAr ? 'لا توجد مفتاحيات بصرية في هذه الفئة — كل ما يُعرض هنا موصول بوظيفة فعلية.' : 'No visual-only switches here — everything shown is wired to a real function.'}</p>
            </Card>
          )}

          {current.kind === 'appearance' && (
            <Card className="p-5">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-navy-800">
                <Palette className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isAr ? 'المظهر / الثيم' : 'Appearance / Theme'}</h2>
              </div>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">{t('uiTheme')}</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('themeHint')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                {UI_THEMES.map((p) => {
                  const activeTheme = form.brand_color === p.key;
                  const surfaceMid = `hsl(${p.surfaceHue} ${Math.min(70, p.surfaceSat)}% ${p.mode === 'dark' ? 45 : 75}%)`;
                  const surfaceDark = `hsl(${p.surfaceHue} ${Math.min(70, p.surfaceSat)}% ${p.mode === 'dark' ? 12 : 30}%)`;
                  return (
                    <button
                      key={p.key}
                      onClick={() => pickTheme(p.key)}
                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all p-3 text-start ${
                        activeTheme ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-navy-700 hover:border-brand-300'
                      }`}
                    >
                      <div className={`h-9 rounded-xl mb-2.5 flex items-end gap-1 p-1.5 border border-black/10 ${p.mode === 'dark' ? '' : 'bg-slate-100'}`} style={{ background: surfaceDark }}>
                        <span className="w-4 h-2.5 rounded-[4px]" style={{ background: `hsl(${p.brandHue} ${p.brandSat}% 45%)` }} />
                        <span className="w-4 h-2.5 rounded-[4px] opacity-80" style={{ background: surfaceMid }} />
                        <span className="w-4 h-2.5 rounded-[4px] opacity-60" style={{ background: surfaceMid }} />
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{isAr ? p.ar : p.en}</div>
                      <div className="text-[10px] text-slate-400">{p.mode === 'dark' ? t('darkMode') : t('lightMode')}</div>
                      {activeTheme && <span className="absolute top-2 end-2 w-2.5 h-2.5 rounded-full bg-brand-500 shadow" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 dark:border-navy-800 pt-5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">{t('brandColor')}</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-5">
                  {BRAND_PRESETS.map((p) => {
                    const activeColor = form.brand_color === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => pickPreset(p.key)}
                        title={isAr ? p.ar : p.en}
                        className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center ${activeColor ? 'border-slate-800 dark:border-white scale-105' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: `hsl(${p.hue} ${p.sat}% 42%)` }}
                      >
                        {activeColor && <span className="w-3 h-3 rounded-full bg-white" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1">
                    <Input
                      label={isAr ? 'لون مخصص (Hex)' : 'Custom Color (Hex)'}
                      value={customBrand}
                      onChange={(e) => { setCustomBrand(e.target.value); if (/^#([0-9a-fA-F]{6})$/.test(e.target.value)) applyCustomHex(e.target.value); }}
                      placeholder="#059669"
                    />
                  </div>
                  <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-600 mb-1" style={{ backgroundColor: brandHex }} />
                </div>
              </div>
            </Card>
          )}

          {current.kind === 'language' && (
            <Card className="p-5">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-navy-800">
                <Languages className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isAr ? 'اللغة / التوطين' : 'Language / Localization'}</h2>
              </div>
              <div className="flex gap-2 max-w-md">
                <button onClick={() => { setLang('ar'); void save({ language: 'ar' }); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${lang === 'ar' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('arabic')}</button>
                <button onClick={() => { setLang('en'); void save({ language: 'en' }); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('english')}</button>
              </div>
            </Card>
          )}

          {current.kind === 'branches' && (
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-navy-800">
                <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('branchSettings')}</h2>
                  <p className="text-xs text-slate-400">{t('useGlobalHint')}</p>
                </div>
              </div>

              <Select label={t('branchesTab')} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">{isAr ? 'اختر الفرع' : 'Select branch'}</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
              </Select>

              {selectedBranch && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label={t('currency')} value={branchForm.currency || ''} onChange={(e) => setBranchForm({ ...branchForm, currency: e.target.value })} placeholder={settings?.currency} />
                    <Input label={t('taxRate') + ' %'} type="number" step="0.01" value={branchForm.tax_rate ?? ''} onChange={(e) => setBranchForm({ ...branchForm, tax_rate: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })} placeholder={String(settings?.tax_rate)} />
                    <Select label={t('taxEnabled')} value={branchForm.tax_enabled == null ? '' : (branchForm.tax_enabled ? '1' : '0')} onChange={(e) => setBranchForm({ ...branchForm, tax_enabled: e.target.value === '' ? null : e.target.value === '1' })}>
                      <option value="">{isAr ? 'حسب الإعداد العام' : 'Follow global'}</option>
                      <option value="1">{t('yes')}</option>
                      <option value="0">{t('no')}</option>
                    </Select>
                    <Input label={t('lowStockThreshold')} type="number" step="0.5" min={0} value={branchForm.low_stock_threshold ?? ''} onChange={(e) => setBranchForm({ ...branchForm, low_stock_threshold: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })} placeholder={String(settings?.low_stock_threshold)} />
                    <Input label={t('logo') + ' URL'} value={branchForm.logo_url || ''} onChange={(e) => setBranchForm({ ...branchForm, logo_url: e.target.value })} placeholder={settings?.logo_url || undefined} />
                  </div>
                  <Textarea label={t('receiptHeader')} value={branchForm.receipt_header || ''} onChange={(e) => setBranchForm({ ...branchForm, receipt_header: e.target.value })} rows={2} placeholder={settings?.receipt_header || undefined} />
                  <Textarea label={t('receiptFooter')} value={branchForm.receipt_footer || ''} onChange={(e) => setBranchForm({ ...branchForm, receipt_footer: e.target.value })} rows={2} placeholder={settings?.receipt_footer || undefined} />

                  <div className="flex items-center gap-3">
                    <Button onClick={saveBranch} disabled={saving}>
                      <Save className="w-4 h-4" /> {t('save')}
                    </Button>
                    {branchSettingsMap[branchId] && (
                      <Button variant="danger" onClick={clearBranchSettings}>
                        <Trash2 className="w-4 h-4" /> {isAr ? 'إعادة تعيين للعام' : 'Reset to global'}
                      </Button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('demoActions')}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('demoDataHint')}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" onClick={handleSeedDemo} disabled={demoBusy}>
                        <Plus className="w-4 h-4" /> {t('seedDemo')}
                      </Button>
                      <Button variant="danger" onClick={() => setDemoConfirmOpen(true)} disabled={demoBusy}>
                        <Trash2 className="w-4 h-4" /> {t('deleteDemo')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {current.kind === 'roles' && <RolesTab />}

          {current.kind === 'system' && (
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-navy-800">
                <Settings2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isAr ? 'النظام / الصيانة' : 'System / Maintenance'}</h2>
                  <p className="text-xs text-slate-400">{isAr ? 'أدوات النظام والسجل وحالة الصحة' : 'System tools, audit log and health status'}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link to="/system-health" className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-400 dark:border-navy-700">
                  <Activity className="mb-2 h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{isAr ? 'فحص صحة النظام' : 'System Health'}</p>
                  <p className="text-xs text-slate-400">{isAr ? 'سلامة قاعدة البيانات وواجهات RPC' : 'Database & RPC integrity'}</p>
                </Link>
                <Link to="/audit-log" className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-400 dark:border-navy-700">
                  <SlidersHorizontal className="mb-2 h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{isAr ? 'سجل التدقيق' : 'Audit Log'}</p>
                  <p className="text-xs text-slate-400">{isAr ? 'كل التغييرات على البيانات' : 'All data changes'}</p>
                </Link>
                <Link to="/subscriptions/admin" className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-400 dark:border-navy-700">
                  <Check className="mb-2 h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{isAr ? 'الاشتراكات' : 'Subscriptions'}</p>
                  <p className="text-xs text-slate-400">{isAr ? 'إدارة اشتراكات الفروع' : 'Manage branch subscriptions'}</p>
                </Link>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-navy-800">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Link2 className="h-4 w-4" />{isAr ? 'روابط الوحدات الحالية' : 'Existing Modules'}</h3>
                <div className="flex flex-wrap gap-2">
                  {[['/branches', isAr ? 'الفروع' : 'Branches'], ['/users', isAr ? 'المستخدمون' : 'Users'], ['/products', isAr ? 'المنتجات' : 'Products'], ['/categories', isAr ? 'الأقسام' : 'Categories'], ['/warehouses', isAr ? 'المستودعات' : 'Warehouses'], ['/recipes', isAr ? 'الوصفات' : 'Recipes'], ['/reports', isAr ? 'التقارير' : 'Reports'], ['/audit-log', isAr ? 'سجل التدقيق' : 'Audit Log']].map(([href, label]) => (
                    <Link key={href} to={href} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:border-brand-400 dark:border-navy-700">{label}</Link>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={demoConfirmOpen}
        onClose={() => setDemoConfirmOpen(false)}
        onConfirm={handleDeleteDemo}
        title={t('deleteDemo')}
        message={t('deleteDemoConfirm')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
      />
    </div>
  );
}

function FieldControl({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === 'toggle') {
    return <ToggleRow label={field.label} checked={Boolean(value)} onChange={(v) => onChange(v)} />;
  }
  if (field.type === 'select') {
    return (
      <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    );
  }
  if (field.type === 'textarea') {
    return <Textarea value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} rows={2} />;
  }
  if (field.type === 'number') {
    return (
      <Input
        type="number"
        step={field.step}
        min={field.min}
        max={field.max}
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(field.key.includes('places') || field.key === 'receipt_copies' || field.key === 'invoice_next_number' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
      />
    );
  }
  return <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { dir } = useLanguage();
  const knobPos = checked ? (dir === 'rtl' ? 'right-0.5' : 'left-0.5') : (dir === 'rtl' ? 'left-0.5' : 'right-0.5');
  return (
    <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${knobPos}`} />
      </button>
    </div>
  );
}
