import { useEffect, useState } from 'react';
import { Save, Store, Receipt, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Input';
import { logAudit } from '../lib/audit';
import type { Settings as SettingsType } from '../lib/types';

export function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { show } = useToast();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    store_name: '', store_name_en: '', store_address: '', store_phone: '',
    currency: 'EGP', tax_rate: 15, tax_enabled: true,
    receipt_header: '', receipt_footer: '', logo_url: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('settings').select('*').maybeSingle();
        if (data) {
          setSettings(data as SettingsType);
          setForm({
            store_name: data.store_name, store_name_en: data.store_name_en || '',
            store_address: data.store_address || '', store_phone: data.store_phone || '',
            currency: data.currency, tax_rate: data.tax_rate, tax_enabled: data.tax_enabled,
            receipt_header: data.receipt_header || '', receipt_footer: data.receipt_footer || '',
            logo_url: data.logo_url || '',
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', settings.id);
    if (error) { show(error.message, 'error'); setSaving(false); return; }
    await logAudit('update', 'settings', settings.id);
    show(t('saveSuccess'), 'success');
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>;
  }

  return (
    <div>
      <PageHeader title={t('settings')} actions={<Button onClick={save} disabled={saving}><Save className="w-4 h-4" /> {t('save')}</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('general')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('storeName')} value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            <Input label={t('storeNameEn')} value={form.store_name_en} onChange={(e) => setForm({ ...form, store_name_en: e.target.value })} />
            <Input label={t('storeAddress')} value={form.store_address} onChange={(e) => setForm({ ...form, store_address: e.target.value })} />
            <Input label={t('storePhone')} value={form.store_phone} onChange={(e) => setForm({ ...form, store_phone: e.target.value })} />
            <Input label={t('logo') + ' URL'} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            <Input label={t('currency')} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Input label={t('taxRate') + ' %'} type="number" step="0.01" value={form.tax_rate || ''} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} />
            <Select label={t('taxEnabled')} value={form.tax_enabled ? '1' : '0'} onChange={(e) => setForm({ ...form, tax_enabled: e.target.value === '1' })}>
              <option value="1">{t('yes')}</option>
              <option value="0">{t('no')}</option>
            </Select>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('appearance')}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('language')}</label>
              <div className="flex gap-2">
                <button onClick={() => setLang('ar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${lang === 'ar' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('arabic')}</button>
                <button onClick={() => setLang('en')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${lang === 'en' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('english')}</button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t('theme')}</label>
              <div className="flex gap-2">
                <button onClick={() => setTheme('light')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('lightMode')}</button>
                <button onClick={() => setTheme('dark')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t('darkMode')}</button>
              </div>
            </div>
          </div>
        </Card>

        {/* Receipt Settings */}
        <Card className="p-5 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('receipt')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Textarea label={t('receiptHeader')} value={form.receipt_header} onChange={(e) => setForm({ ...form, receipt_header: e.target.value })} rows={2} />
            <Textarea label={t('receiptFooter')} value={form.receipt_footer} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} rows={2} />
          </div>
        </Card>
      </div>
    </div>
  );
}
