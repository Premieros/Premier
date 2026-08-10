import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';
import { useLanguage } from '@/context/LanguageContext';

const REPORT_LABELS = {
  sales: ['المبيعات', 'Sales'],
  sales_by_payment: ['المبيعات حسب طريقة الدفع', 'Sales by Payment'],
  sales_by_employee: ['المبيعات حسب الموظف', 'Sales by Employee'],
  sales_by_product: ['المبيعات حسب المنتج', 'Sales by Product'],
  detailed_invoices: ['الفواتير التفصيلية', 'Detailed Invoices'],
  purchases: ['المشتريات', 'Purchases'],
  expenses: ['المصروفات', 'Expenses'],
  profit: ['الربحية', 'Profitability'],
  inventory: ['المخزون', 'Inventory'],
  component_consumption: ['استهلاك المكونات', 'Component Consumption'],
  recipe_costs: ['تكلفة الوصفات', 'Recipe Costs'],
  top_consumed_components: ['أكثر المكونات استهلاكًا', 'Top Components'],
  top_consumed_products: ['أكثر المنتجات استهلاكًا', 'Top Consumed Products'],
  low_stock: ['المخزون المنخفض', 'Low Stock'],
} as const;

type ReportType = keyof typeof REPORT_LABELS;

/**
 * Opens the exact report requested by a dashboard deep link.
 * Uses the visible report label rather than relying on DOM button position,
 * so adding another button to ReportsPage cannot redirect to the wrong action.
 */
export function ReportDeepLinkPage() {
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();
  const requested = searchParams.get('reportType') as ReportType | null;

  useEffect(() => {
    if (!requested || !(requested in REPORT_LABELS)) return;

    let attempts = 0;
    const labels = REPORT_LABELS[requested];
    const wanted = labels[lang === 'ar' ? 0 : 1].trim().toLocaleLowerCase();

    const selectReport = () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reportButton = buttons.find((button) => {
        const text = (button.textContent || '').trim().toLocaleLowerCase();
        return text === wanted || text.includes(wanted);
      }) as HTMLButtonElement | undefined;

      if (reportButton) {
        reportButton.click();
        return;
      }

      attempts += 1;
      if (attempts < 40) window.setTimeout(selectReport, 50);
    };

    const timer = window.setTimeout(selectReport, 0);
    return () => window.clearTimeout(timer);
  }, [requested, lang]);

  return <ReportsPage />;
}
