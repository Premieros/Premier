import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Logo } from '@/components/Logo';
import { useToast } from '@/components/Toast';

export function LoginPage() {
  const { signIn, signInWithUsername } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { show } = useToast();
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isAr = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let result: { error: { code: string; message: string } | null };
    if (mode === 'pin') {
      if (!/^\d{4}$/.test(pin)) {
        show(t('pinInvalid'), 'error');
        return;
      }
      result = await signInWithUsername(username, pin);
    } else {
      result = await signIn(email, password);
    }
    if (result.error) {
      const code = result.error.code;
      let msg: string;
      if (code === 'invalid_credentials') msg = t('invalidCredentials');
      else if (code === 'email_not_confirmed') msg = t('emailNotConfirmed');
      else if (code === 'user_not_found') msg = mode === 'pin' ? t('usernameNotFound') : t('userNotFound');
      else if (code === 'user_inactive') msg = t('userInactive');
      else if (code === 'over_request_rate_limit') msg = t('rateLimited');
      else if (code === 'email_address_invalid') msg = t('invalidCredentials');
      else msg = `${t('loginFailed')} ${result.error.message}`;
      show(msg, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Branded Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="mb-6">
            <Logo variant="vertical" size={72} tone="white" tagline={isAr ? 'منصة إدارة الأعمال' : 'Business Management Platform'} />
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-3">{t('appName')}</h1>
          <p className="text-slate-300/80 text-center text-lg max-w-sm">
            {isAr ? 'منصة إدارة الأعمال المتكاملة لإدارة متجرك وفروعه بكفاءة' : 'The complete business management platform for your store and branches'}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-md">
            {[
              { label: isAr ? 'فواتير يومية' : 'Daily Invoices', value: '100+' },
              { label: isAr ? 'منتجات' : 'Products', value: '500+' },
              { label: isAr ? 'تقارير' : 'Reports', value: '15+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-gold-500/20">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-300/70 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-navy-950 relative">
        <div className="absolute top-4 end-4 z-10">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 rounded-xl bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 text-sm font-medium shadow-sm border border-slate-200 dark:border-navy-800 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo variant="horizontal" size={40} tone="navy" tagline={isAr ? 'منصة إدارة الأعمال' : 'Business Management Platform'} />
          </div>

          <div className="bg-white dark:bg-navy-900 rounded-3xl shadow-xl border border-slate-100 dark:border-navy-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isAr ? 'مرحباً بك' : 'Welcome back'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isAr ? 'سجّل دخولك للوصول إلى منصة Premier' : 'Sign in to access Premier'}
              </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 dark:bg-navy-800 p-1 mb-5">
              <button
                type="button"
                onClick={() => setMode('pin')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'pin'
                    ? 'bg-white dark:bg-navy-700 text-brand-700 dark:text-gold-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t('loginWithPin')}
              </button>
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'password'
                    ? 'bg-white dark:bg-navy-700 text-brand-700 dark:text-gold-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t('loginWithEmail')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'pin' ? (
                <>
                  <Input
                    label={t('username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder={isAr ? 'اسم المستخدم' : 'username'}
                  />
                  <Input
                    label={t('pin')}
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                  />
                </>
              ) : (
                <>
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
                </>
              )}
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
