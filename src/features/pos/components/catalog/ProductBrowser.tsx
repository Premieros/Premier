import { useMemo } from 'react';
import { Search, X, ShoppingCart, Package, Plus } from 'lucide-react';
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
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        selectedCategory === id
          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
          : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
      }`}
    >
      {label}
      <span className={`ms-1 text-[10px] ${selectedCategory === id ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-w-0 bg-slate-100 dark:bg-navy-950">
      {/* ===== Search ===== */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={handleBarcodeScan}
            placeholder={isAr ? 'بحث أو مسح الباركود...' : 'Search or scan barcode...'}
            className="w-full ps-9 pe-4 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/60 focus:border-gold-500 transition-all"
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!hasBranch && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
            {isAr ? 'اختر الفرع' : 'Select Branch'}
          </div>
        )}
      </div>

      {/* ===== Horizontal category chips ===== */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 flex-shrink-0">
        {catBtn('', t('allCategories'), products.length)}
        {categories.map((cat) => catBtn(cat.id, isAr ? cat.name : (cat.name_en || cat.name), categoryProducts[cat.id] || 0))}
      </div>

      {/* ===== Compact product grid ===== */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {!hasBranch ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ShoppingCart className="w-20 h-20 mb-4 opacity-20" />
            <p className="text-lg font-medium">{isAr ? 'اختر الفرع أولاً لعرض المنتجات' : 'Select a branch first to view products'}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Package className="w-20 h-20 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('noData')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-1.5">
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
                  className={`group relative flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 text-start transition-all duration-150 ${
                    outOfStock || noRecipe
                      ? 'opacity-45 cursor-not-allowed'
                      : 'hover:border-gold-400 dark:hover:border-gold-600 hover:shadow-card-hover active:scale-[0.97]'
                  }`}
                >
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 dark:from-navy-800 dark:to-navy-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 text-slate-300 dark:text-navy-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white truncate leading-tight">{p.name}</p>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-xs font-bold text-brand-600 dark:text-gold-400">{formatCurrency(p.sale_price, currency, lang)}</span>
                      <span
                        className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                          noRecipe
                            ? 'bg-slate-200 dark:bg-navy-700 text-slate-500 dark:text-slate-400'
                            : outOfStock
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300'
                              : stock <= (p.low_stock_threshold || 5)
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {isManufactured ? (noRecipe ? t('noRecipe') : `~${stock}`) : stock}
                      </span>
                    </div>
                  </div>
                  {!outOfStock && !noRecipe && (
                    <span className="w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Plus className="w-3 h-3 text-navy-950" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
