import { useEffect, useMemo, useState } from 'react';
import {
  Save, Store, Receipt, Palette, ShoppingCart, FileText, Boxes, ShieldCheck,
  Building2, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useRoles } from '@/context/RolesContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Card } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Input';
import { logAudit } from '@/lib/audit';
import { BRAND_PRESETS, applyBrandColor, brandFromSettingsValue } from '@/lib/brandColor';
import { findUiTheme, UI_THEMES } from '@/lib/themes';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS, isAdminRole, ROLE_META, type Permission } from '@/lib/permissions';
import type { Settings as SettingsType, Branch, BranchSettings, Role } from '@/lib/types';

type TabKey = 'general' | 'appearance' | 'pos' | 'invoices' | 'receipt' | 'inventory' | 'branches' | 'roles';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

export function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme, setUiTheme } = useTheme();
  const { settings, branchSettingsMap, save, saveBranchSettings } = useSettings();
  const { show } = useToast();
  const isAr = lang === 'ar';
  const [tab, setTab] = useState<TabKey>('general');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SettingsType | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [branchForm, setBranchForm] = useState<Partial<BranchSettings>>({});
  const [brandHex, setBrandHex] = useState('');
  const [customBrand, setCustomBrand] = useState('');

  useEffect(() => {
    supabase.from('branches').select('*').order('name').then(({ data }) => {
      setBranches((data as Branch[]) || []);
    });
  }, []);

  useEffect(() => {
    if (!settings) return;
    setForm((prev) => prev ?? { ...settings });
    const uiPreset = findUiTheme(settings.brand_color);
    const brand = uiPreset ? { hue: uiPreset.brandHue, sat: uiPreset.brandSat } : brandFromSettingsValue(settings.brand_color);
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

  const tabs: TabDef[] = useMemo(() => [
    { key: 'general', label: t('general'), icon: <Store className="w-4 h-4" /> },
    { key: 'appearance', label: t('appearance'), icon: <Palette className="w-4 h-4" /> },
    { key: 'pos', label: t('posTab'), icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'invoices', label: t('invoicesTax'), icon: <FileText className="w-4 h-4" /> },
    { key: 'receipt', label: t('receiptPrint'), icon: <Receipt className="w-4 h-4" /> },
    { key: 'inventory', label: t('inventorySettings'), icon: <Boxes className="w-4 h-4" /> },
    { key: 'branches', label: t('branchesTab'), icon: <Building2 className="w-4 h-4" /> },
    { key: 'roles', label: t('rolesTab'), icon: <ShieldCheck className="w-4 h-4" /> },
  ], [t]);

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

  if (!form) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>;
  }

  const selectedBranch = branches.find((b) => b.id === branchId);

  return (
    <div>
      <PageHeader
        title={t('settings')}
        actions={(
          <Button onClick={saveAll} disabled={saving}>
            <Save className="w-4 h-4" /> {t('save')}
          </Button>
        )}
      />

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === tb.key
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-300'
            }`}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('general')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('storeName')} value={form.store_name} onChange={(e) => set('store_name', e.target.value)} />
            <Input label={t('storeNameEn')} value={form.store_name_en || ''} onChange={(e) => set('store_name_en', e.target.value)} />
            <Input label={t('storeAddress')} value={form.store_address || ''} onChange={(e) => set('store_address', e.target.value)} />
            <Input label={t('storePhone')} value={form.store_phone || ''} onChange={(e) => set('store_phone', e.target.value)} />
            <Input label={t('logo') + ' URL'} value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} />
            <Input label={t('currency')} value={form.currency} onChange={(e) => set('currency', e.target.value)} />
            <Input label={t('taxRate') + ' %'} type="number" step="0.01" value={form.tax_rate} onChange={(e) => set('tax_rate', parseFloat(e.target.value) || 0)} />
            <Select label={t('taxEnabled')} value={form.tax_enabled ? '1' : '0'} onChange={(e) => set('tax_enabled', e.target.value === '1')}>
              <option value="1">{t('yes')}</option>
              <option value="0">{t('no')}</option>
            </Select>
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('language')}</label>
                <div className="flex gap-2">
                  <button onClick={() => { setLang('ar'); save({ language: 'ar' }); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${lang === 'ar' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('arabic')}</button>
                  <button onClick={() => { setLang('en'); save({ language: 'en' }); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${lang === 'en' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('english')}</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('theme')}</label>
                <div className="flex gap-2">
                  <button onClick={() => { setTheme('light'); save({ theme: 'light' }); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('lightMode')}</button>
                  <button onClick={() => { setTheme('dark'); save({ theme: 'dark' }); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('darkMode')}</button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'appearance' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('appearance')}
          </h3>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">{t('uiTheme')}</label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('themeHint')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {UI_THEMES.map((p) => {
              const active = form.brand_color === p.key;
              const surfaceMid = `hsl(${p.surfaceHue} ${Math.min(70, p.surfaceSat)}% ${p.mode === 'dark' ? 45 : 75}%)`;
              const surfaceDark = `hsl(${p.surfaceHue} ${Math.min(70, p.surfaceSat)}% ${p.mode === 'dark' ? 12 : 30}%)`;
              return (
                <button
                  key={p.key}
                  onClick={() => pickTheme(p.key)}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all p-3 text-start ${
                    active
                      ? 'border-brand-500 ring-2 ring-brand-500/30'
                      : 'border-slate-200 dark:border-navy-700 hover:border-brand-300'
                  }`}
                >
                  <div className={`h-9 rounded-xl mb-2.5 flex items-end gap-1 p-1.5 border border-black/10 ${p.mode === 'dark' ? '' : 'bg-slate-100'}`} style={{ background: surfaceDark }}>
                    <span className="w-4 h-2.5 rounded-[4px]" style={{ background: `hsl(${p.brandHue} ${p.brandSat}% 45%)` }} />
                    <span className="w-4 h-2.5 rounded-[4px] opacity-80" style={{ background: surfaceMid }} />
                    <span className="w-4 h-2.5 rounded-[4px] opacity-60" style={{ background: surfaceMid }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{isAr ? p.ar : p.en}</div>
                  <div className="text-[10px] text-slate-400">{p.mode === 'dark' ? t('darkMode') : t('lightMode')}</div>
                  {active && <span className="absolute top-2 end-2 w-2.5 h-2.5 rounded-full bg-brand-500 shadow" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-navy-800 pt-5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">{t('brandColor')}</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-5">
            {BRAND_PRESETS.map((p) => {
              const active = form.brand_color === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => pickPreset(p.key)}
                  title={isAr ? p.ar : p.en}
                  className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center ${active ? 'border-slate-800 dark:border-white scale-105' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: `hsl(${p.hue} ${p.sat}% 42%)` }}
                >
                  {active && <span className="w-3 h-3 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-end gap-3 mb-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('logo') + ' URL'} value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      {tab === 'pos' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('posTab')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label={t('posDefaultPayment')} value={form.pos_default_payment_method} onChange={(e) => set('pos_default_payment_method', e.target.value)}>
              <option value="cash">{t('cash')}</option>
              <option value="card">{t('card')}</option>
              <option value="credit">{isAr ? 'آجل' : 'Credit'}</option>
            </Select>
            <ToggleRow label={t('barcodeAutofocus')} checked={form.pos_barcode_autofocus} onChange={(v) => set('pos_barcode_autofocus', v)} />
            <ToggleRow label={t('lineDiscount')} checked={form.pos_line_discount} onChange={(v) => set('pos_line_discount', v)} />
          </div>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('invoicesTax')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('taxRate') + ' %'} type="number" step="0.01" value={form.tax_rate} onChange={(e) => set('tax_rate', parseFloat(e.target.value) || 0)} />
            <Select label={t('taxEnabled')} value={form.tax_enabled ? '1' : '0'} onChange={(e) => set('tax_enabled', e.target.value === '1')}>
              <option value="1">{t('yes')}</option>
              <option value="0">{t('no')}</option>
            </Select>
            <Input label={t('invoicePrefix')} value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} />
            <Input label={t('invoiceNextNumber')} type="number" min={1} value={form.invoice_next_number} onChange={(e) => set('invoice_next_number', parseInt(e.target.value) || 1)} />
            <Select label={t('decimalPlaces')} value={String(form.invoice_decimal_places)} onChange={(e) => set('invoice_decimal_places', parseInt(e.target.value) || 2)}>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </Select>
          </div>
        </Card>
      )}

      {tab === 'receipt' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('receiptPrint')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Select label={t('receiptWidth')} value={String(form.receipt_width_mm)} onChange={(e) => set('receipt_width_mm', parseInt(e.target.value) || 58)}>
              <option value="58">58 {isAr ? 'مم' : 'mm'}</option>
              <option value="80">80 {isAr ? 'مم' : 'mm'}</option>
            </Select>
            <Input label={t('receiptCopies')} type="number" min={1} max={5} value={form.receipt_copies} onChange={(e) => set('receipt_copies', parseInt(e.target.value) || 1)} />
            <ToggleRow label={t('autoPrint')} checked={form.receipt_auto_print} onChange={(v) => set('receipt_auto_print', v)} />
            <ToggleRow label={t('showTaxOnReceipt')} checked={form.receipt_show_tax} onChange={(v) => set('receipt_show_tax', v)} />
            <ToggleRow label={t('showQrOnReceipt')} checked={form.receipt_show_qr} onChange={(v) => set('receipt_show_qr', v)} />
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Textarea label={t('receiptHeader')} value={form.receipt_header || ''} onChange={(e) => set('receipt_header', e.target.value)} rows={2} />
            <Textarea label={t('receiptFooter')} value={form.receipt_footer || ''} onChange={(e) => set('receipt_footer', e.target.value)} rows={2} />
          </div>
        </Card>
      )}

      {tab === 'inventory' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('inventorySettings')}
          </h3>
          <div className="max-w-sm">
            <Input label={t('lowStockThreshold')} type="number" step="0.5" min={0} value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', parseFloat(e.target.value) || 0)} />
          </div>
        </Card>
      )}

      {tab === 'branches' && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('branchSettings')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('useGlobalHint')}</p>

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
            </div>
          )}
        </Card>
      )}

      {tab === 'roles' && <RolesTab />}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { dir } = useLanguage();
  const knobPos = checked
    ? (dir === 'rtl' ? 'right-0.5' : 'left-0.5')
    : (dir === 'rtl' ? 'left-0.5' : 'right-0.5');
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

function RolesTab() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const { rolePermissionsMap, roleMeta, loading, saveRole } = useRoles();
  const isAr = lang === 'ar';
  const [drafts, setDrafts] = useState<Record<string, Permission[]>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  useEffect(() => {
    if (loading || Object.keys(rolePermissionsMap).length === 0) return;
    setDrafts((prev) => {
      const merged = { ...prev };
      for (const role of Object.keys(rolePermissionsMap)) {
        if (!merged[role]) merged[role] = [...rolePermissionsMap[role]];
      }
      return merged;
    });
  }, [loading, rolePermissionsMap]);

  const roles: Role[] = Object.keys(ROLE_META) as Role[];

  const toggle = (role: Role, perm: Permission) => {
    setDrafts((prev) => {
      const list = prev[role] ?? rolePermissionsMap[role] ?? [];
      const has = list.includes(perm);
      return { ...prev, [role]: has ? list.filter((p) => p !== perm) : [...list, perm] };
    });
  };

  const setAll = (role: Role, value: boolean) => {
    setDrafts((prev) => ({ ...prev, [role]: value ? [...ALL_PERMISSIONS] : [] }));
  };

  const save = async (role: Role) => {
    setSavingRole(role);
    const ok = await saveRole(role, drafts[role] ?? []);
    setSavingRole(null);
    if (ok) show(t('saveSuccess'), 'success');
    else show(isAr ? 'تعذر حفظ الصلاحيات' : 'Failed to save permissions', 'error');
  };

  if (loading) {
    return (
      <Card className="p-10 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3" />
        <p className="text-sm">{isAr ? 'جارٍ تحميل الأدوار...' : 'Loading roles...'}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" /> {t('rolesTab')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAr
            ? 'تُحفظ الصلاحيات في قاعدة البيانات وتُطبَّق فورًا على جميع المستخدمين أصحاب الدور. الأدوار الإدارية (مدير عام / مالك) تملك كل الصلاحيات تلقائيًا.'
            : 'Permissions are stored in the database and apply immediately to every user with that role. Admin roles (Super Admin / Owner) always have full access.'}
        </p>
      </Card>

      {roles.map((role) => {
        const admin = isAdminRole(role);
        const list = drafts[role] ?? rolePermissionsMap[role] ?? [];
        const count = list.length;
        return (
          <Card key={role} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{roleMeta[role]?.[lang] || role}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {count} / {ALL_PERMISSIONS.length} {isAr ? 'صلاحية' : 'permissions'}
                </p>
              </div>
              {admin ? (
                <span className="px-3 py-1.5 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 text-xs font-medium">
                  {isAr ? 'كامل الصلاحيات تلقائيًا' : 'Full access by default'}
                </span>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAll(role, true)}>{t('all')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setAll(role, false)}>{t('none')}</Button>
                  <Button size="sm" onClick={() => save(role)} disabled={savingRole === role}>
                    <Save className="w-4 h-4" /> {savingRole === role ? '...' : t('save')}
                  </Button>
                </div>
              )}
            </div>

            {admin ? (
              <p className="text-sm text-slate-400">{isAr ? 'لا يمكن تقييد هذا الدور.' : 'This role cannot be restricted.'}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {PERMISSION_GROUPS.map((group) => {
                  const groupAll = group.permissions.every((p) => list.includes(p));
                  const groupSome = group.permissions.some((p) => list.includes(p));
                  return (
                    <div key={group.key} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupAll}
                            ref={(el) => { if (el) el.indeterminate = groupSome && !groupAll; }}
                            onChange={() => {
                              const value = !groupAll;
                              setDrafts((prev) => {
                                const base = new Set(prev[role] ?? rolePermissionsMap[role] ?? []);
                                group.permissions.forEach((p) => { if (value) base.add(p); else base.delete(p); });
                                return { ...prev, [role]: [...base] };
                              });
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{group[lang]}</span>
                        </label>
                      </div>
                      <div className="px-3 py-2 space-y-1.5">
                        {group.permissions.map((perm) => (
                          <label key={perm} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={list.includes(perm)}
                              onChange={() => toggle(role, perm)}
                              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-300">{PERMISSION_LABELS[perm]?.[lang] || perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
      <p className="text-xs text-slate-400 px-1">{isAr ? 'الدور المبني من القاعدة: أي تغيير يظهر فورًا، بدون إعادة تسجيل دخول.' : 'DB-backed roles: changes apply immediately, no re-login needed.'}</p>
    </div>
  );
}
