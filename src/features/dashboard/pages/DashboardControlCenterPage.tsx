import { Link } from 'react-router-dom';
import {
  Activity, BarChart3, Boxes, Building2, Calculator, ChevronLeft, ClipboardList,
  CreditCard, FileBarChart, FileText, Gauge, LayoutDashboard, Package, Receipt,
  Settings, ShoppingBag, ShoppingCart, Store, Truck, Users, Wallet, Warehouse,
  Utensils, UserCog, ArrowUpRight, AlertTriangle, BookOpen, Factory, RefreshCcw,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { isAdminRole } from '@/lib/permissions';

type Item = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  report?: string;
};

function Section({ title, items, isAr }: { title: string; items: Item[]; isAr: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{isAr ? 'كل عنصر يفتح شاشة العمل والتقرير المرتبط به' : 'Every item opens its module and related report'}</p>
        </div>
        <FileBarChart className="h-5 w-5 text-brand-600 dark:text-gold-400" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.href} className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-md dark:border-navy-800 dark:bg-navy-950/50 dark:hover:border-navy-700 dark:hover:bg-navy-900">
            <Link to={item.href} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white shadow-sm transition group-hover:scale-105 dark:bg-brand-600">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-800 dark:text-white">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{item.subtitle}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
            </Link>
            <Link to={item.report || '/reports'} className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-navy-700 dark:bg-navy-900 dark:text-gold-400 dark:hover:bg-navy-800">
              <span>{isAr ? 'فتح التقرير التفصيلي' : 'Open detailed report'}</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

const report = (type: string) => `/reports?reportType=${encodeURIComponent(type)}`;

export function DashboardControlCenterPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAr = lang === 'ar';
  const admin = isAdminRole(user?.role);

  const operations: Item[] = [
    { title: isAr ? 'المبيعات' : 'Sales', subtitle: isAr ? 'كل الفواتير والطلبات والإيرادات' : 'Invoices, orders and revenue', icon: <ShoppingBag className="h-5 w-5" />, href: '/sales', report: report('sales') },
    { title: isAr ? 'نقطة البيع' : 'POS', subtitle: isAr ? 'فتح شاشة البيع والطلبات' : 'Open POS and order workflow', icon: <Gauge className="h-5 w-5" />, href: '/pos', report: report('detailed_invoices') },
    { title: isAr ? 'المشتريات' : 'Purchases', subtitle: isAr ? 'الموردون وفواتير الشراء' : 'Suppliers and purchase invoices', icon: <ShoppingCart className="h-5 w-5" />, href: '/purchases', report: report('purchases') },
    { title: isAr ? 'المصروفات' : 'Expenses', subtitle: isAr ? 'المصروفات والتصنيفات وطرق الدفع' : 'Expenses, categories and payments', icon: <Receipt className="h-5 w-5" />, href: '/expenses', report: report('expenses') },
    { title: isAr ? 'الورديات' : 'Shifts', subtitle: isAr ? 'فتح وإغلاق ومراجعة الورديات' : 'Open, close and review shifts', icon: <ClipboardList className="h-5 w-5" />, href: '/shifts', report: '/reports' },
    { title: isAr ? 'المطبخ' : 'Kitchen', subtitle: isAr ? 'حالة الطلبات والإنتاج بالمطبخ' : 'Kitchen orders and production status', icon: <Utensils className="h-5 w-5" />, href: '/kitchen', report: '/reports' },
  ];

  const inventory: Item[] = [
    { title: isAr ? 'المخزون' : 'Inventory', subtitle: isAr ? 'الأرصدة والحركات والتنبيهات' : 'Balances, movements and alerts', icon: <Warehouse className="h-5 w-5" />, href: '/inventory', report: report('inventory') },
    { title: isAr ? 'المنتجات' : 'Products', subtitle: isAr ? 'الأصناف والأسعار والباركود' : 'Items, prices and barcodes', icon: <Package className="h-5 w-5" />, href: '/products', report: report('sales_by_product') },
    { title: isAr ? 'المستودعات' : 'Warehouses', subtitle: isAr ? 'المستودعات والأرصدة' : 'Warehouses and stock balances', icon: <Boxes className="h-5 w-5" />, href: '/warehouses', report: '/reports' },
    { title: isAr ? 'التصنيع والوصفات' : 'Recipes & Production', subtitle: isAr ? 'التكلفة والاستهلاك والتصنيع' : 'Recipe cost, consumption and production', icon: <Factory className="h-5 w-5" />, href: '/recipes', report: report('recipe_costs') },
    { title: isAr ? 'التحويلات' : 'Stock Transfers', subtitle: isAr ? 'تحويل الأصناف بين الفروع والمخازن' : 'Transfer stock between branches and warehouses', icon: <RefreshCcw className="h-5 w-5" />, href: '/transfers', report: '/reports' },
    { title: isAr ? 'المخزون المنخفض' : 'Low Stock', subtitle: isAr ? 'الأصناف التي تحتاج إعادة طلب' : 'Items requiring replenishment', icon: <AlertTriangle className="h-5 w-5" />, href: '/inventory', report: report('low_stock') },
  ];

  const analysis: Item[] = [
    { title: isAr ? 'التقارير' : 'Reports', subtitle: isAr ? 'مركز التقارير التفصيلية' : 'Detailed reporting center', icon: <FileBarChart className="h-5 w-5" />, href: '/reports', report: '/reports' },
    { title: isAr ? 'المبيعات حسب الدفع' : 'Sales by Payment', subtitle: isAr ? 'نقدي وبطاقة وتحويل وآجل' : 'Cash, card, transfer and credit', icon: <CreditCard className="h-5 w-5" />, href: '/reports', report: report('sales_by_payment') },
    { title: isAr ? 'المبيعات حسب الموظف' : 'Sales by Employee', subtitle: isAr ? 'أداء الكاشير والموظفين' : 'Cashier and employee performance', icon: <UserCog className="h-5 w-5" />, href: '/reports', report: report('sales_by_employee') },
    { title: isAr ? 'المبيعات حسب المنتج' : 'Sales by Product', subtitle: isAr ? 'الكميات والإيرادات لكل منتج' : 'Quantity and revenue per product', icon: <BarChart3 className="h-5 w-5" />, href: '/reports', report: report('sales_by_product') },
    { title: isAr ? 'الربحية' : 'Profitability', subtitle: isAr ? 'المبيعات والمشتريات والمصروفات والربح' : 'Sales, purchases, expenses and profit', icon: <Calculator className="h-5 w-5" />, href: '/reports', report: report('profit') },
    { title: isAr ? 'المحاسبة' : 'Accounting', subtitle: isAr ? 'التقارير والحركة المالية' : 'Financial reports and accounting', icon: <Wallet className="h-5 w-5" />, href: '/accounting', report: '/accounting/reports' },
  ];

  const masterData: Item[] = [
    { title: isAr ? 'العملاء' : 'Customers', subtitle: isAr ? 'بيانات العملاء وحركة المبيعات' : 'Customers and sales activity', icon: <Users className="h-5 w-5" />, href: '/customers', report: '/reports' },
    { title: isAr ? 'الموردون' : 'Suppliers', subtitle: isAr ? 'الموردون والمشتريات والمديونيات' : 'Suppliers, purchases and balances', icon: <Truck className="h-5 w-5" />, href: '/suppliers', report: '/reports' },
    { title: isAr ? 'الموظفون' : 'Employees', subtitle: isAr ? 'الموظفون والأدوار والصلاحيات' : 'Employees, roles and permissions', icon: <UserCog className="h-5 w-5" />, href: '/employees', report: '/reports' },
    { title: isAr ? 'الفروع' : 'Branches', subtitle: isAr ? 'بيانات الفروع والأداء' : 'Branches and performance', icon: <Building2 className="h-5 w-5" />, href: '/branches', report: '/reports' },
    { title: isAr ? 'الطاولات' : 'Tables', subtitle: isAr ? 'حالة الطاولات والطلبات بالصالة' : 'Table status and dine-in orders', icon: <Store className="h-5 w-5" />, href: '/tables', report: '/reports' },
    { title: isAr ? 'إدارة النظام' : 'System Settings', subtitle: isAr ? 'الإعدادات والصلاحيات والتكوين' : 'Settings, permissions and configuration', icon: <Settings className="h-5 w-5" />, href: '/settings', report: '/reports' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 p-6 shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gold-300"><LayoutDashboard className="h-4 w-4" />{isAr ? 'مركز التحكم الرئيسي' : 'Executive Control Center'}</div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{isAr ? 'لوحة التحكم الشاملة' : 'Complete Dashboard'}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{isAr ? 'كل أجزاء البرنامج في مكان واحد. افتح أي شاشة للعمل أو انتقل مباشرة إلى التقرير التفصيلي المرتبط بها.' : 'All program areas in one place. Open any module to work, or jump directly to its detailed report.'}</p>
          </div>
          <Link to="/reports" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-gold-400"><FileBarChart className="h-4 w-4" />{isAr ? 'مركز التقارير' : 'Report Center'}</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [isAr ? 'المبيعات' : 'Sales', '/reports', <Activity className="h-5 w-5" />],
          [isAr ? 'المخزون' : 'Inventory', '/reports?reportType=inventory', <Warehouse className="h-5 w-5" />],
          [isAr ? 'الربحية' : 'Profit', '/reports?reportType=profit', <Calculator className="h-5 w-5" />],
          [isAr ? 'المحاسبة' : 'Accounting', '/accounting/reports', <Wallet className="h-5 w-5" />],
        ].map(([label, href, icon]) => (
          <Link key={String(label)} to={String(href)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-navy-800 dark:bg-navy-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-gold-400">{icon}</span>
            <span className="mt-3 block text-sm font-bold text-slate-800 dark:text-white">{label}</span>
            <span className="mt-1 block text-xs text-slate-400">{isAr ? 'عرض التقرير' : 'View report'}</span>
          </Link>
        ))}
      </div>

      <Section title={isAr ? 'التشغيل والمبيعات' : 'Operations & Sales'} items={operations} isAr={isAr} />
      <Section title={isAr ? 'المخزون والمنتجات والتصنيع' : 'Inventory, Products & Production'} items={inventory} isAr={isAr} />
      <Section title={isAr ? 'التحليل والتقارير المالية' : 'Analytics & Financial Reporting'} items={analysis} isAr={isAr} />
      <Section title={isAr ? 'البيانات الرئيسية والإدارة' : 'Master Data & Administration'} items={masterData} isAr={isAr} />

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-900 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-200">
        <div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-gold-400" /><div><p className="font-bold">{isAr ? 'ملاحظة عن الصلاحيات' : 'Permissions note'}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{isAr ? 'اللوحة تعرض خريطة البرنامج، بينما تظل صلاحيات الوصول الفعلية مطبقة داخل كل شاشة وتقاريرها. Super Admin يظل صاحب الوصول الكامل.' : 'The dashboard provides the program map while existing route and data permissions remain enforced inside each module. Super Admin retains full access.'}</p></div></div>
      </div>
    </div>
  );
}
