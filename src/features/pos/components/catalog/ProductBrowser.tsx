import { useMemo, useState } from 'react';
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
  const [catSidebarOpen, setCatSidebarOpen] = useState(true);

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

  return (
    <>
      {/* ===== LEFT: CATEGORIES SIDEBAR ===== */}
      <div className={`${catSidebarOpen ? 'w-56' : 'w-0'} hidden md:flex flex-shrink-0 transition-all duration-300 overflow-hidden bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-800 ${isAr ? 'border-l' : 'border-r'}`}>
        <div className="w-56 h-full flex flex-col">
          <div className="px-3 py-3 border-b border-slate-100 dark:border-navy-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isAr ? 'الفئات' : 'Categories'}</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <button
              onClick={() => onSelectCategory('')}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg mx-1 transition-all ${
                selectedCategory === ''
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
              }`}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <span className="truncate">{t('allCategories')}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === '' ? 'bg-white/20' : 'bg-slate-200 dark:bg-navy-800'}`}>
                {products.length}
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg mx-1 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
                }`}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <span className="truncate">{isAr ? cat.name : (cat.name_en || cat.name)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-navy-800'}`}>
                  {categoryProducts[cat.id] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CENTER: PRODUCTS ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800">
          <button
            onClick={() => setCatSidebarOpen(!catSidebarOpen)}
            className="hidden md:flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
            title={isAr ? 'إظهار/إخفاء الفئات' : 'Toggle Categories'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={handleBarcodeScan}
              placeholder={isAr ? 'بحث عن منتج أو مسح الباركود...' : 'Search product or scan barcode...'}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/60 focus:border-gold-500 transition-all"
            />
            {search && (
              <button onClick={() => onSearch('')} className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!hasBranch && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
              {isAr ? 'اختر الفرع' : 'Select Branch'}
            </div>
          )}
        </div>

        {/* Mobile Categories Chips */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 overflow-x-auto border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 flex-shrink-0">
          <button
            onClick={() => onSelectCategory('')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === ''
                ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {t('allCategories')}
            <span className="ms-1 opacity-70">({products.length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(selectedCategory === cat.id ? '' : cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isAr ? cat.name : (cat.name_en || cat.name)}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 sm:p-4 lg:pb-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
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
                    className={`group relative bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 overflow-hidden transition-all duration-200 ${
                      outOfStock || noRecipe
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-card-hover hover:border-gold-400 dark:hover:border-gold-600 hover:-translate-y-1 active:scale-[0.97]'
                    }`}
                  >
                    {/* Stock badge */}
                    <div className={`absolute top-2 ${isAr ? 'left-2' : 'right-2'} z-10 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm ${
                      noRecipe
                        ? 'bg-slate-500/90 text-white'
                        : outOfStock
                          ? 'bg-red-500/90 text-white'
                          : stock <= (p.low_stock_threshold || 5)
                            ? 'bg-amber-400/90 text-amber-900'
                            : 'bg-emerald-400/90 text-emerald-900'
                    }`} title={isManufactured ? t('sellableQty') : t('stock')}>
                      {isManufactured ? (noRecipe ? t('noRecipe') : `~${stock}`) : stock}
                    </div>

                    {/* Image */}
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 dark:from-navy-800 dark:to-navy-950 flex items-center justify-center overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-navy-700 group-hover:text-gold-500 transition-colors" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-white truncate leading-tight">{p.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isManufactured && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-[10px] font-medium text-purple-700 dark:text-purple-400">{t('manufactured')}</span>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{isAr ? p.category?.name : (p.category?.name_en || p.category?.name)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-brand-600 dark:text-gold-400">{formatCurrency(p.sale_price, currency, lang)}</span>
                        {!outOfStock && !noRecipe && (
                          <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5 text-navy-950" />
                          </div>
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
    </>
  );
}
