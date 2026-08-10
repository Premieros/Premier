import { useMemo } from 'react';
import { Search, X, ShoppingCart, Package, Plus, ScanBarcode } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/format';
import type { Category, Product, ProductComponent } from '@/lib/types';

interface ProductBrowserProps {
  products: Product[]; categories: Category[]; stockMap: Record<string, number>; sellableStock: Record<string, number>; recipeMap: Record<string, ProductComponent[]>;
  search: string; selectedCategory: string; currency: string; hasBranch: boolean;
  onSearch: (value: string) => void; onSelectCategory: (id: string) => void; onAddToCart: (product: Product) => void; inputRef?: React.Ref<HTMLInputElement>;
}

export function ProductBrowser({ products, categories, stockMap, sellableStock, recipeMap, search, selectedCategory, currency, hasBranch, onSearch, onSelectCategory, onAddToCart, inputRef }: ProductBrowserProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const filteredProducts = useMemo(() => products.filter(p => (!selectedCategory || p.category_id === selectedCategory) && (!search || [p.name, p.name_en, p.barcode, p.sku].some(v => v?.toLowerCase().includes(search.toLowerCase())))), [products, search, selectedCategory]);
  const counts = useMemo(() => products.reduce<Record<string, number>>((a, p) => { const k = p.category_id || '_none'; a[k] = (a[k] || 0) + 1; return a; }, {}), [products]);

  return <section className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-navy-950">
    <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur dark:border-navy-800 dark:bg-navy-900/95">
      <div className="flex gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input ref={inputRef} value={search} onChange={e => onSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const p = products.find(x => x.barcode === search); if (p) { onAddToCart(p); onSearch(''); } } }} placeholder={isAr ? 'ابحث عن منتج أو امسح الباركود...' : 'Search or scan barcode...'} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 ps-12 pe-10 text-sm font-bold outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-navy-700 dark:bg-navy-800 dark:text-white" autoComplete="off" />
          {search && <button onClick={() => onSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-700"><X className="h-4 w-4" /></button>}
          {!search && <ScanBarcode className="absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        </div>
        <div className="hidden min-w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-500 sm:flex dark:border-navy-700 dark:bg-navy-800">{filteredProducts.length}</div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <button onClick={() => onSelectCategory('')} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black transition ${!selectedCategory ? 'bg-navy-950 text-white shadow-lg dark:bg-gold-500 dark:text-navy-950' : 'border border-slate-200 bg-white text-slate-600 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300'}`}>{t('allCategories')} <span className="ms-1 opacity-60">{products.length}</span></button>
        {categories.map(c => <button key={c.id} onClick={() => onSelectCategory(selectedCategory === c.id ? '' : c.id)} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black transition ${selectedCategory === c.id ? 'bg-navy-950 text-white shadow-lg dark:bg-gold-500 dark:text-navy-950' : 'border border-slate-200 bg-white text-slate-600 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300'}`}>{isAr ? c.name : (c.name_en || c.name)} <span className="ms-1 opacity-50">{counts[c.id] || 0}</span></button>)}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4">
      {!hasBranch ? <div className="flex h-full flex-col items-center justify-center text-center text-slate-400"><ShoppingCart className="mb-4 h-12 w-12 opacity-20" /><p className="font-black">{isAr ? 'اختر الفرع أولاً' : 'Select a branch first'}</p></div> : filteredProducts.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-slate-400"><Package className="mb-4 h-12 w-12 opacity-20" /><p className="font-black">{t('noData')}</p></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filteredProducts.map(p => {
          const manufactured = p.product_type === 'manufactured'; const noRecipe = manufactured && !(recipeMap[p.id]?.length); const stock = manufactured ? (sellableStock[p.id] || 0) : (stockMap[p.id] || 0); const unavailable = stock <= 0 || noRecipe;
          return <button key={p.id} disabled={unavailable} onClick={() => onAddToCart(p)} className={`group relative min-h-44 overflow-hidden rounded-2xl border bg-white text-start shadow-sm transition active:scale-[.98] dark:bg-navy-900 ${unavailable ? 'cursor-not-allowed opacity-45 border-slate-200 dark:border-navy-800' : 'border-slate-200 hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl dark:border-navy-800'}`}>
            <div className="relative h-28 overflow-hidden bg-slate-100 dark:bg-navy-800">{p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><ShoppingCart className="h-9 w-9 text-slate-300 dark:text-navy-700" /></div>}<span className={`absolute end-2 top-2 rounded-lg px-2 py-1 text-[10px] font-black text-white ${noRecipe ? 'bg-red-600/90' : unavailable ? 'bg-red-600/90' : stock <= (p.low_stock_threshold || 5) ? 'bg-amber-500/90' : 'bg-emerald-600/90'}`}>{noRecipe ? t('noRecipe') : unavailable ? (isAr ? 'غير متاح' : 'Unavailable') : stock}</span></div>
            <div className="flex min-h-16 flex-col p-3"><p className="truncate text-sm font-black text-slate-800 dark:text-white">{isAr ? p.name : (p.name_en || p.name)}</p><div className="mt-auto flex items-center justify-between gap-2 pt-2"><span className="text-base font-black text-brand-600 dark:text-gold-400">{formatCurrency(p.sale_price, currency, lang)}</span>{!unavailable && <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500 text-navy-950 shadow-sm"><Plus className="h-4 w-4" /></span>}</div></div>
          </button>;
        })}
      </div>}
    </div>
  </section>;
}
