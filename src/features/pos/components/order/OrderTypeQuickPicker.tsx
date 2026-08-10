import { Bike, Car, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { OrderType } from '@/lib/types';

interface Props { open: boolean; onClose: () => void; onSelect: (type: OrderType) => void; }

const TYPES: { type: OrderType; icon: typeof UtensilsCrossed; ar: string; en: string; hintAr: string; hintEn: string }[] = [
  { type: 'dine_in', icon: UtensilsCrossed, ar: 'الصالة', en: 'Dine-in', hintAr: 'اختر الطاولة بعد ذلك', hintEn: 'Choose a table next' },
  { type: 'delivery', icon: Bike, ar: 'Delivery', en: 'Delivery', hintAr: 'طلب توصيل', hintEn: 'Delivery order' },
  { type: 'takeaway', icon: ShoppingBag, ar: 'Takeaway', en: 'Takeaway', hintAr: 'استلام من المطعم', hintEn: 'Pickup order' },
  { type: 'drive_thru', icon: Car, ar: 'طلب سريع', en: 'Quick Order', hintAr: 'أسرع مسار للبيع', hintEn: 'Fastest sales path' },
];

export function OrderTypeQuickPicker({ open, onClose, onSelect }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <button aria-label={isAr ? 'إغلاق' : 'Close'} className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-navy-900">
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'نوع الطلب' : 'Order type'}</h2><p className="mt-1 text-xs text-slate-400">{isAr ? 'اختر نوع الطلب لإضافة المنتج' : 'Choose the order type to add this product'}</p></div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800"><X className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TYPES.map(({ type, icon: Icon, ar, en, hintAr, hintEn }) => <button key={type} onClick={() => onSelect(type)} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-4 text-center transition hover:border-gold-500 hover:bg-gold-50/40 active:scale-[.98] dark:border-navy-700 dark:bg-navy-800 dark:hover:border-gold-500">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400 dark:bg-gold-500 dark:text-navy-950"><Icon className="h-5 w-5" /></span><span className="text-sm font-black text-slate-800 dark:text-white">{isAr ? ar : en}</span><span className="text-[11px] text-slate-400">{isAr ? hintAr : hintEn}</span>
        </button>)}
      </div>
    </div>
  </div>;
}
