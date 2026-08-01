import { useState } from 'react';
import { ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const { signIn } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isAr = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      let msg: string;
      if (error.code === 'invalid_credentials') msg = t('invalidCredentials');
      else if (error.code === 'email_not_confirmed') msg = t('emailNotConfirmed');
      else if (error.code === 'user_not_found') msg = t('userNotFound');
      else if (error.code === 'over_request_rate_limit') msg = t('rateLimited');
      else if (error.code === 'email_address_invalid') msg = t('invalidCredentials');
      else msg = `${t('loginFailed')} ${error.message}`;
      show(msg, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Branded Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-6 shadow-2xl">
            <ShoppingCart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-3">{t('appName')}</h1>
          <p className="text-brand-100/80 text-center text-lg max-w-sm">
            {isAr ? 'نظام نقاط البيع المتكامل لإدارة متجرك بكفاءة' : 'Complete POS system to manage your store efficiently'}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-md">
            {[
              { label: isAr ? 'فواتير يومية' : 'Daily Invoices', value: '100+' },
              { label: isAr ? 'منتجات' : 'Products', value: '500+' },
              { label: isAr ? 'تقارير' : 'Reports', value: '15+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-brand-100/70 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative">
        <div className="absolute top-4 end-4 z-10">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('appName')}</h1>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isAr ? 'مرحباً بك' : 'Welcome back'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isAr ? 'سجّل دخولك للوصول لنظام نقاط البيع' : 'Sign in to access the POS system'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
              />
              <Input
                label={t('password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {t('signIn')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
