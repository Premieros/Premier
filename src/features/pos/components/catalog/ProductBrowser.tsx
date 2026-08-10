import { useMemo } from 'react';
import { Search, X, ShoppingCart, Package, Plus, ScanBarcode, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/format';
import type { Category, Product, ProductComponent } from '@/lib/types';

interface ProductBrowserProps {
  products: Product[];
  categories: Category[];
  stockMap: Record<string, number>;
  sellableStock: Record<string, number>;
  recipeMap: Record<string, ProductComponent[]>;
  search: string;
  selectedCategory: string;
  currency: string;
  hasBranch: boolean;
  onSearch: (value: string) => void;
  onSelectCategory: (id: string) => void;
  onAddToCart: (product: Product) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function ProductBrowser({
  products, categories, stockMap, sellableStock, recipeMap,
  search, selectedCategory, currency, hasBranch,
  onSearch, onSelectCategory, onAddToCart, inputRef,
}: ProductBrowserProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory) result = result.filter((p) => p.category_id === selectedCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return result;
  }, [products, search, selectedCategory]);

  const categoryProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const cid = p.category_id || '_none';
      counts[cid] = (counts[cid] || 0) + 1;
    }
    return counts;
  }, [products]);

  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const found = products.find((p) => p.barcode === search);
      if (found) { onAddToCart(found); onSearch(''); }
    }
  };

  const catBtn = (id: string, label: string, count: number) => (
    <button
      key={id}
      onClick={() => onSelectCategory(selectedCategory === id ? '' : id)}
      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-[0.97] border ${
        selectedCategory === id
          ? 'bg-slate-950 dark:bg-gold-500 text-white dark:text-navy-950 border-transparent shadow-md'
          : 'bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600'
      }`}
    >
      {label}
      <span className={`ms-1.5 text-[10px] ${selectedCategory === id ? 'text-white/70 dark:text-navy-950/70' : 'text-slate-400'}`}>{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-w-0 flex-1 bg-slate-100 dark:bg-navy-950">
      <div className="flex items-center gap-2 px-3 md:px-4 py-3 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800 flex-shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={handleBarcodeScan}
            placeholder={isAr ? 'ابحث عن صنف أو امسح الباركود...' : 'Search product or scan barcode...'}
            className="w-full ps-11 pe-11 py-3 rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
            autoComplete="off"
          />
          {search ? (
            <button onClick={() => onSearch('')} className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-navy-700 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="absolute top-1/2 -translate-y-1/2 end-3 hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-[9px] font-black text-slate-400">
              <ScanBarcode className="w-3 h-3" />
              {isAr ? 'باركود' : 'SCAN'}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-bold text-slate-500 dark:text-slate-300">
          <SlidersHorizontal className="w-4 h-4" />
          <span>{filteredProducts.length}</span>
        </div>
        {!hasBranch && (
          <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-black whitespace-nowrap">
            {isAr ? 'اختر الفرع' : 'Select Branch'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 flex-shrink-0">
        {catBtn('', t('allCategories'), products.length)}
        {categories.map((cat) => catBtn(cat.id, isAr ? cat.name : (cat.name_en || cat.name), categoryProducts[cat.id] || 0))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {!hasBranch ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 flex items-center justify-center mb-5 shadow-sm">
              <ShoppingCart className="w-10 h-10 opacity-25" />
            </div>
            <p className="text-base font-black">{isAr ? 'اختر الفرع أولاً' : 'Select a branch first'}</p>
            <p className="text-xs text-slate-400 mt-1">{isAr ? 'ستظهر المنتجات المتاحة لهذا الفرع هنا' : 'Products for the selected branch will appear here'}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 flex items-center justify-center mb-4">
              <Package className="w-9 h-9 opacity-25" />
            </div>
            <p className="text-base font-black">{t('noData')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {filteredProducts.map((p) => {
              const isManufactured = p.product_type === 'manufactured';
              const noRecipe = isManufactured && (recipeMap[p.id]?.length || 0) === 0;
              const stock = isManufactured ? (sellableStock[p.id] || 0) : (stockMap[p.id] || 0);
              const outOfStock = stock <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onAddToCart(p)}
                  disabled={outOfStock || noRecipe}
                  className={`group relative flex flex-col text-start overflow-hidden rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 transition-all duration-150 min-h-[118px] ${
                    outOfStock || noRecipe
                      ? 'opacity-45 cursor-not-allowed'
                      : 'hover:border-gold-400 dark:hover:border-gold-600 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
                  }`}
                >
                  <div className="relative h-16 sm:h-20 bg-slate-100 dark:bg-navy-800 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 dark:from-navy-800 dark:to-navy-950">
                        <ShoppingCart className="w-7 h-7 text-slate-300 dark:text-navy-700" />
                      </div>
                    )}
                    <span className={`absolute top-2 end-2 px-2 py-1 rounded-lg text-[9px] font-black backdrop-blur-sm ${
                      noRecipe
                        ? 'bg-slate-900/70 text-white'
                        : outOfStock
                          ? 'bg-red-600/90 text-white'
                          : stock <= (p.low_stock_threshold || 5)
                            ? 'bg-amber-500/90 text-white'
                            : 'bg-emerald-600/90 text-white'
                    }`}>
                      {isManufactured ? (noRecipe ? t('noRecipe') : `~${stock}`) : stock}
                    </span>
                  </div>
                  <div className="p-2.5 flex flex-col flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate leading-tight">{isAr ? p.name : (p.name_en || p.name)}</p>
                    <div className="flex items-center justify-between gap-2 mt-auto pt-1.5">
                      <span className="text-sm font-black text-brand-600 dark:text-gold-400">{formatCurrency(p.sale_price, currency, lang)}</span>
                      {!outOfStock && !noRecipe && (
                        <span className="w-7 h-7 rounded-lg bg-gold-500 flex items-center justify-center text-navy-950 opacity-90 group-hover:scale-105 transition-transform">
                          <Plus className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
