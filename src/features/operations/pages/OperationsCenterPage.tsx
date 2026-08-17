import { ArrowLeftRight, Boxes, ChefHat, ClipboardCheck, PackageSearch, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useCan } from '@/lib/permissions';
import { APP_ROUTES } from '@/core/navigation/routes';

type ActionCard = {
  id: string;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  route: string;
  permission?: Parameters<ReturnType<typeof useCan>>[0];
  icon: typeof Boxes;
};

export function OperationsCenterPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const can = useCan();
  const ar = lang === 'ar';

  const cards: ActionCard[] = [
    { id: 'pos', ar: 'نقطة البيع والطلبات', en: 'POS & Orders', descriptionAr: 'فتح نقطة البيع ومتابعة الطلبات النشطة.', descriptionEn: 'Open POS and monitor active orders.', route: APP_ROUTES.pos, permission: 'pos.sell', icon: ShoppingCart },
    { id: 'inventory', ar: 'المخزون', en: 'Inventory', descriptionAr: 'الرصيد الحالي وحالة الأصناف.', descriptionEn: 'Current stock and item status.', route: APP_ROUTES.inventory, permission: 'inventory.view', icon: Boxes },
    { id: 'warehouses', ar: 'المستودعات', en: 'Warehouses', descriptionAr: 'إدارة المستودعات والأرصدة.', descriptionEn: 'Manage warehouses and balances.', route: APP_ROUTES.warehouses, permission: 'warehouses.view', icon: Warehouse },
    { id: 'transfers', ar: 'التحويلات المخزنية', en: 'Stock Transfers', descriptionAr: 'نقل الأصناف بين المستودعات والفروع.', descriptionEn: 'Move stock between warehouses and branches.', route: APP_ROUTES.transfers, permission: 'inventory.transfers', icon: ArrowLeftRight },
    { id: 'counts', ar: 'الجرد والتسويات', en: 'Counts & Adjustments', descriptionAr: 'الجرد الفعلي وتسويات المخزون.', descriptionEn: 'Physical counts and stock adjustments.', route: APP_ROUTES.stockCounts, permission: 'inventory.manage', icon: ClipboardCheck },
    { id: 'low-stock', ar: 'تنبيهات المخزون', en: 'Low Stock Alerts', descriptionAr: 'الأصناف التي تحتاج إلى إعادة طلب.', descriptionEn: 'Items that need replenishment.', route: APP_ROUTES.lowStockAlerts, permission: 'inventory.view', icon: PackageSearch },
    { id: 'purchases', ar: 'المشتريات', en: 'Purchasing', descriptionAr: 'الفواتير وطلبات الشراء والاستلام.', descriptionEn: 'Purchases, requests, and receiving.', route: APP_ROUTES.purchases, permission: 'purchases.view', icon: Truck },
    { id: 'kitchen', ar: 'المطبخ والطلبات', en: 'Kitchen & Orders', descriptionAr: 'متابعة الطلبات التشغيلية من نقطة البيع.', descriptionEn: 'Follow operational orders from POS.', route: APP_ROUTES.floorPlan, permission: 'floor_plan.view', icon: ChefHat },
  ];

  const visibleCards = cards.filter((card) => !card.permission || can(card.permission));

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? 'مركز العمليات' : 'Operations Center'}
        subtitle={ar ? 'وصول موحد للوظائف التشغيلية الموجودة في النظام' : 'A stable hub for the operational capabilities already supported by Premier.'}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              data-testid={`operations-center-${card.id}`}
              type="button"
              onClick={() => navigate(card.route)}
              className="group rounded-2xl border border-ui-border bg-ui-surface p-5 text-start shadow-ui-sm transition hover:-translate-y-0.5 hover:border-ui-primary hover:shadow-ui-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ui-primary-soft text-ui-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-ui-text">{ar ? card.ar : card.en}</h3>
              <p className="mt-2 text-sm leading-6 text-ui-muted">{ar ? card.descriptionAr : card.descriptionEn}</p>
              <span className="mt-4 inline-flex text-xs font-bold text-ui-primary group-hover:underline">{ar ? 'فتح الوحدة ←' : 'Open module →'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
