import { Boxes, ClipboardList, Factory, FlaskConical, Gauge, Layers3, Trash2, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useCan } from '@/lib/permissions';
import { APP_ROUTES } from '@/core/navigation/routes';

type ManufacturingAction = { id: string; ar: string; en: string; descriptionAr: string; descriptionEn: string; route: string; permission: Parameters<ReturnType<typeof useCan>>[0]; icon: typeof Factory };

export function ManufacturingCenterPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const can = useCan();
  const ar = lang === 'ar';
  const actions: ManufacturingAction[] = [
    { id: 'materials', ar: 'المواد الخام', en: 'Raw Materials', descriptionAr: 'تعريف المواد الخام ومتابعة الأرصدة والدفعات.', descriptionEn: 'Manage raw materials, stock and batches.', route: APP_ROUTES.rawMaterials, permission: 'raw_materials.view', icon: Boxes },
    { id: 'recipes', ar: 'الوصفات والمكونات', en: 'Recipes & Components', descriptionAr: 'إدارة الوصفات ومكونات المنتجات وتكلفتها.', descriptionEn: 'Manage recipes, components and recipe costs.', route: APP_ROUTES.recipes, permission: 'recipes.view', icon: FlaskConical },
    { id: 'production', ar: 'أوامر الإنتاج', en: 'Production Orders', descriptionAr: 'إنشاء ومتابعة أوامر الإنتاج واستهلاك المواد.', descriptionEn: 'Create and monitor production orders and consumption.', route: APP_ROUTES.production, permission: 'production.view', icon: Factory },
    { id: 'costing', ar: 'مركز التكلفة', en: 'Costing Center', descriptionAr: 'تحليل تكلفة المنتج والوصفة ومقارنتها بسعر البيع.', descriptionEn: 'Analyze product and recipe costs against selling price.', route: APP_ROUTES.costingCenter, permission: 'reports.costing', icon: Gauge },
    { id: 'components', ar: 'مكونات المنتجات', en: 'Product Components', descriptionAr: 'مراجعة المكونات المرتبطة بالمنتجات.', descriptionEn: 'Review components linked to products.', route: APP_ROUTES.components, permission: 'components.view', icon: Layers3 },
    { id: 'inventory', ar: 'مخزون المواد', en: 'Material Stock', descriptionAr: 'الانتقال مباشرة إلى المخزون لمتابعة تأثير التصنيع.', descriptionEn: 'Open inventory to monitor manufacturing impact.', route: APP_ROUTES.inventoryCenter, permission: 'inventory.view', icon: ClipboardList },
    { id: 'waste', ar: 'مركز الهالك', en: 'Waste Center', descriptionAr: 'تسجيل ومراجعة هالك المواد والمنتجات.', descriptionEn: 'Record and review material and product waste.', route: APP_ROUTES.wasteCenter, permission: 'production.waste', icon: Trash2 },
    { id: 'kitchen', ar: 'شاشة المطبخ', en: 'Kitchen Display', descriptionAr: 'متابعة الطلبات حسب محطة المطبخ.', descriptionEn: 'Track orders by kitchen station.', route: APP_ROUTES.kitchenDisplay, permission: 'pos.sell', icon: ChefHat },
  ];
  return <div className="space-y-6">
    <PageHeader title={ar ? 'مركز التصنيع والتكلفة' : 'Manufacturing & Costing Center'} subtitle={ar ? 'دورة التصنيع من المادة الخام والوصفة حتى الإنتاج والتكلفة' : 'Manufacturing flow from raw materials and recipes through production and costing.'} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {actions.filter((a) => can(a.permission)).map((action) => { const Icon = action.icon; return <button key={action.id} data-testid={`manufacturing-center-${action.id}`} type="button" onClick={() => navigate(action.route)} className="group rounded-2xl border border-ui-border bg-ui-surface p-5 text-start shadow-ui-sm transition hover:-translate-y-0.5 hover:border-ui-primary hover:shadow-ui-md">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ui-primary-soft text-ui-primary"><Icon className="h-5 w-5" /></div>
        <h3 className="font-bold text-ui-text">{ar ? action.ar : action.en}</h3>
        <p className="mt-2 text-sm leading-6 text-ui-muted">{ar ? action.descriptionAr : action.descriptionEn}</p>
        <span className="mt-4 inline-flex text-xs font-bold text-ui-primary group-hover:underline">{ar ? 'فتح الوحدة ←' : 'Open module →'}</span>
      </button>; })}
    </div>
  </div>;
}
