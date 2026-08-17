import { ClipboardList, FileSearch, PackageCheck, ShoppingCart, Truck, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useCan } from '@/lib/permissions';
import { APP_ROUTES } from '@/core/navigation/routes';

type ProcurementAction = { id: string; ar: string; en: string; descriptionAr: string; descriptionEn: string; route: string; permission: Parameters<ReturnType<typeof useCan>>[0]; icon: typeof ShoppingCart };

export function ProcurementCenterPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const can = useCan();
  const ar = lang === 'ar';
  const actions: ProcurementAction[] = [
    { id: 'purchases', ar: 'المشتريات', en: 'Purchases', descriptionAr: 'إدارة فواتير وعمليات الشراء.', descriptionEn: 'Manage purchase invoices and transactions.', route: APP_ROUTES.purchases, permission: 'purchases.view', icon: ShoppingCart },
    { id: 'requests', ar: 'طلبات الشراء', en: 'Purchase Requests', descriptionAr: 'متابعة الطلبات قبل إنشاء أمر الشراء.', descriptionEn: 'Track requests before purchase orders.', route: APP_ROUTES.purchaseRequests, permission: 'purchases.requests', icon: ClipboardList },
    { id: 'rfqs', ar: 'طلبات عروض الأسعار', en: 'RFQs', descriptionAr: 'مقارنة عروض الموردين قبل الاعتماد.', descriptionEn: 'Compare supplier quotations before approval.', route: APP_ROUTES.rfqs, permission: 'purchases.rfq', icon: FileSearch },
    { id: 'receiving', ar: 'الاستلام', en: 'Receiving', descriptionAr: 'استلام الأصناف ومطابقة الكميات.', descriptionEn: 'Receive items and reconcile quantities.', route: APP_ROUTES.receiving, permission: 'purchases.receiving', icon: PackageCheck },
    { id: 'suppliers', ar: 'الموردون', en: 'Suppliers', descriptionAr: 'إدارة الموردين وبياناتهم.', descriptionEn: 'Manage suppliers and their records.', route: APP_ROUTES.suppliers, permission: 'suppliers.view', icon: Truck },
    { id: 'payables', ar: 'المستحقات', en: 'Payables', descriptionAr: 'متابعة الالتزامات والمدفوعات للموردين.', descriptionEn: 'Monitor supplier obligations and payments.', route: APP_ROUTES.payments, permission: 'accounts.view', icon: WalletCards },
  ];
  const visible = actions.filter((a) => can(a.permission));
  return <div className="space-y-6">
    <PageHeader title={ar ? 'مركز المشتريات' : 'Procurement Center'} subtitle={ar ? 'دورة شراء موحدة من الطلب حتى الاستلام والمستحقات' : 'A unified procurement flow from request through receiving and payables.'} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((action) => { const Icon = action.icon; return <button key={action.id} data-testid={`procurement-center-${action.id}`} type="button" onClick={() => navigate(action.route)} className="group rounded-2xl border border-ui-border bg-ui-surface p-5 text-start shadow-ui-sm transition hover:-translate-y-0.5 hover:border-ui-primary hover:shadow-ui-md">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ui-primary-soft text-ui-primary"><Icon className="h-5 w-5" /></div>
        <h3 className="font-bold text-ui-text">{ar ? action.ar : action.en}</h3>
        <p className="mt-2 text-sm leading-6 text-ui-muted">{ar ? action.descriptionAr : action.descriptionEn}</p>
        <span className="mt-4 inline-flex text-xs font-bold text-ui-primary group-hover:underline">{ar ? 'فتح الوحدة ←' : 'Open module →'}</span>
      </button>; })}
    </div>
  </div>;
}
