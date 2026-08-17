import { ArrowLeftRight, ClipboardCheck, FileBarChart, Layers3, Package, PackageSearch, Warehouse, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useCan } from '@/lib/permissions';
import { APP_ROUTES } from '@/core/navigation/routes';

type InventoryAction = {
  id: string;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  route: string;
  permission?: Parameters<ReturnType<typeof useCan>>[0];
  icon: typeof Package;
};

export function InventoryCenterPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const can = useCan();
  const ar = lang === 'ar';

  const actions: InventoryAction[] = [
    { id: 'stock', ar: 'الرصيد الحالي', en: 'Current Stock', descriptionAr: 'عرض أرصدة الأصناف وحالتها.', descriptionEn: 'View current stock balances and status.', route: APP_ROUTES.inventory, permission: 'inventory.view', icon: Boxes },
    { id: 'warehouses', ar: 'المستودعات', en: 'Warehouses', descriptionAr: 'إدارة المستودعات والأرصدة.', descriptionEn: 'Manage warehouses and balances.', route: APP_ROUTES.warehouses, permission: 'warehouses.view', icon: Warehouse },
    { id: 'ledger', ar: 'دفتر حركة المخزون', en: 'Inventory Ledger', descriptionAr: 'تتبع كل حركة دخول وخروج وتحويل.', descriptionEn: 'Trace stock receipts, issues, and transfers.', route: APP_ROUTES.inventoryLedger, permission: 'inventory.ledger.view', icon: FileBarChart },
    { id: 'transfers', ar: 'التحويلات', en: 'Transfers', descriptionAr: 'نقل المخزون بين المستودعات والفروع.', descriptionEn: 'Move stock between warehouses and branches.', route: APP_ROUTES.transfers, permission: 'inventory.transfers', icon: ArrowLeftRight },
    { id: 'counts', ar: 'الجرد والتسويات', en: 'Counts & Adjustments', descriptionAr: 'الجرد الفعلي ومراجعة الفروقات.', descriptionEn: 'Physical counts and variance adjustments.', route: APP_ROUTES.stockCounts, permission: 'inventory.manage', icon: ClipboardCheck },
    { id: 'batches', ar: 'التشغيلات والصلاحية', en: 'Batches & Expiry', descriptionAr: 'متابعة التشغيلات وتواريخ الصلاحية.', descriptionEn: 'Track batches and expiry dates.', route: APP_ROUTES.inventoryBatches, permission: 'inventory.view', icon: Layers3 },
    { id: 'low-stock', ar: 'تنبيهات النقص', en: 'Low Stock Alerts', descriptionAr: 'الأصناف التي تحتاج إلى إعادة طلب.', descriptionEn: 'Items requiring replenishment.', route: APP_ROUTES.lowStockAlerts, permission: 'inventory.view', icon: PackageSearch },
    { id: 'valuation', ar: 'تقييم المخزون', en: 'Stock Valuation', descriptionAr: 'قيمة المخزون وتكلفته حسب البيانات الحالية.', descriptionEn: 'Current inventory value and cost.', route: APP_ROUTES.stockValuation, permission: 'inventory.ledger.view', icon: Package },
  ];

  const visibleActions = actions.filter((action) => !action.permission || can(action.permission));

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? 'مركز المخزون' : 'Inventory Center'}
        subtitle={ar ? 'مركز موحد لكل وظائف المخزون المدعومة في Premier' : 'A stable hub for the inventory capabilities already supported by Premier.'}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              data-testid={`inventory-center-${action.id}`}
              type="button"
              onClick={() => navigate(action.route)}
              className="group rounded-2xl border border-ui-border bg-ui-surface p-5 text-start shadow-ui-sm transition hover:-translate-y-0.5 hover:border-ui-primary hover:shadow-ui-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ui-primary-soft text-ui-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-ui-text">{ar ? action.ar : action.en}</h3>
              <p className="mt-2 text-sm leading-6 text-ui-muted">{ar ? action.descriptionAr : action.descriptionEn}</p>
              <span className="mt-4 inline-flex text-xs font-bold text-ui-primary group-hover:underline">{ar ? 'فتح الوحدة ←' : 'Open module →'}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-ui-sm">
        <h2 className="font-bold text-ui-text">{ar ? 'دورة المخزون' : 'Inventory flow'}</h2>
        <p className="mt-2 text-sm leading-6 text-ui-muted">
          {ar
            ? 'يمكن متابعة المخزون من الرصيد الحالي إلى الحركة والجرد والتحويلات والتقييم، مع بقاء كل عملية مرتبطة بمسار ثابت وصلاحية مستقلة.'
            : 'Follow inventory from current balances through ledger, counts, transfers, and valuation. Each action uses a stable route and independent permission.'}
        </p>
      </div>
    </div>
  );
}
