import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import * as api from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Logo } from '@/components/Logo';
import { useToast } from '@/components/Toast';

export function RegisterPage() {
  const { signIn } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { show } = useToast();
  const [storeName, setStoreName] = useState('');
  const [storeNameEn, setStoreNameEn] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const isAr = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await api.subscriptions.registerTenant({
        p_store_name: storeName.trim(),
        p_store_name_en: storeNameEn.trim() || null,
        p_owner_name: ownerName.trim(),
        p_email: email.trim(),
        p_password: password,
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
      });
      if (error) {
        show(error.message, 'error');
        return;
      }
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        const code = result?.error;
        let msg = t('registrationFailed');
        if (code === 'EMAIL_TAKEN') msg = t('emailExists');
        else if (code === 'WEAK_PASSWORD') msg = t('weakPassword');
        else if (code === 'INVALID_EMAIL') msg = t('invalidEmail');
        show(msg, 'error');
        return;
      }
      show(t('registrationSuccess'), 'success');
      const r = await signIn(email.trim(), password);
      if (r.error) show(`${t('loginFailed')} ${r.error.message}`, 'error');
    } catch {
      show(t('registrationFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="mb-6"><Logo variant="vertical" size={72} tone="white" tagline={isAr ? 'منصة إدارة الأعمال' : 'Business Management Platform'} /></div>
          <h1 className="text-3xl font-bold text-white text-center mb-3">{t('appName')}</h1>
          <p className="text-slate-300/80 text-center text-lg max-w-sm">{isAr ? 'منصة إدارة الأعمال المتكاملة لإدارة متجرك وفروعه بكفاءة' : 'The complete business management platform for your store and branches'}</p>
          <div className="mt-10 flex items-center gap-3 rounded-2xl bg-gold-500/10 border border-gold-500/30 px-5 py-4 max-w-md"><Sparkles className="w-6 h-6 text-gold-300 shrink-0" /><p className="text-sm text-gold-100 font-medium">{t('freeTrialNote')}</p></div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-navy-950 relative">
        <div className="absolute top-4 end-4 z-10"><button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-4 py-2 rounded-xl bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 text-sm font-medium shadow-sm border border-slate-200 dark:border-navy-800 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">{lang === 'ar' ? 'English' : 'العربية'}</button></div>
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-8 flex justify-center"><Logo variant="horizontal" size={40} tone="navy" tagline={isAr ? 'منصة إدارة الأعمال' : 'Business Management Platform'} /></div>
          <div className="bg-white dark:bg-navy-900 rounded-3xl shadow-xl border border-slate-100 dark:border-navy-800 p-8">
            <div className="mb-6"><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('signUp')}</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('registerSubtitle')}</p></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label={t('storeName')} value={storeName} onChange={(e) => setStoreName(e.target.value)} required placeholder={isAr ? 'اسم متجرك' : 'Your store name'} />
              <Input label={t('storeNameEn')} value={storeNameEn} onChange={(e) => setStoreNameEn(e.target.value)} placeholder="Store name (English)" />
              <Input label={t('ownerName')} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required placeholder={isAr ? 'اسم المالك' : 'Owner name'} />
              <Input label={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="email@example.com" />
              <Input label={t('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              <Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={isAr ? 'رقم الهاتف' : 'Phone'} />
              <Input label={t('address')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={isAr ? 'العنوان' : 'Address'} />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('createAccount')}<ArrowRight className="w-4 h-4" /></>}</Button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">{t('haveAccount')}{' '}<Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-gold-400">{t('signIn')}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
